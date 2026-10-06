const mongoose = require("mongoose");
const Order = require("../models/orders.model");
const OrderGroup = require("../models/orderGoup.model");
const VelocitySchema = require('../models/velocityOrder.model')
const PurchasePlanDetails = require("../models/purchaseplan.model");
const axios = require("axios");
const { checkDeliveryAvailabilityService } = require("../services/delivery.service");

const { asyncHandler, BadRequestError, UnauthorizedError, ForbiddenError, NotFoundError, ConflictError, ValidationError, ServiceUnavailableError } = require('../errors/errorConfig')

const checkdeliveryavailability = asyncHandler(async (req, res) => {
  const { pincode } = req.body;

  if (!pincode) {
    throw new BadRequestError("Pincode is required");
  }

  // Call the service function to check delivery availability
  const isAvailable = await checkDeliveryAvailabilityService(pincode);

  res.status(200).json({ available: isAvailable });
});

const checkDeliveryAvailabilitybyAdmin = asyncHandler(async (req, res) => {
  const { pincode } = req.body;

  const payload = {
    from: "110059",
    to: pincode,
    payment_mode: "prepaid",
    shipment_type: "forward",
  };

  const role = req.user.role;

  if (role !== "admin") {
    throw new ForbiddenError("Access denied. Only admins can check delivery availability.");
  }

  if (!pincode) {
    throw new BadRequestError("Pincode is required");
  }

  // Call the service function to check delivery availability
  const getAllServiceability = await axios.post(`${process.env.VELOCITY_BASE_URL}/custom/api/v1/serviceability`,
    payload,
    {
      headers: {
        Authorization: `Bearer ${process.env.VELOCITY_API_KEY}`,
        "Content-Type": "application/json",
      },
    });

  const { result, status } = getAllServiceability.data;

  if (status !== "SUCCESS" || !result?.serviceability_results?.length) {
    return res.status(404).json({ message: "No serviceability results found" });
  }

  // return the serviceability results to the admiin list
  res.status(200).json({ serviceability_results: result.serviceability_results });
});

const creareOrderByAdmin = asyncHandler(async (req, res) => {
  const { role } = req.user;

  const {
    ordergoupId,
    carrier_id,
    length,
    breadth,
    height,
    weight,
  } = req.body;

  // ---------------------------------------------------
  // 1. Check admin
  // ---------------------------------------------------

  if (role !== "admin") {
    return res.status(403).json({
      success: false,
      message: "Only admin can create Velocity order",
    });
  }

  // ---------------------------------------------------
  // 2. Validate group ID
  // ---------------------------------------------------

  if (!ordergoupId) {
    return res.status(400).json({
      success: false,
      message: "ordergoupId is required",
    });
  }

  if (!mongoose.Types.ObjectId.isValid(ordergoupId)) {
    return res.status(400).json({
      success: false,
      message: "Invalid ordergoupId",
    });
  }

  // ---------------------------------------------------
  // 3. Validate package dimensions
  // ---------------------------------------------------

  if (
    length === undefined ||
    breadth === undefined ||
    height === undefined ||
    weight === undefined
  ) {
    return res.status(400).json({
      success: false,
      message: "length, breadth, height and weight are required",
    });
  }

  // ---------------------------------------------------
  // 4. Find Order Group
  // ---------------------------------------------------

  const orderGroup = await OrderGroup.findById(ordergoupId);

  if (!orderGroup) {
    return res.status(404).json({
      success: false,
      message: "Order group not found",
    });
  }

  // ---------------------------------------------------
  // 5. Get all orders belonging to this group
  // ---------------------------------------------------

  const activeOrders = await Order.find({
    _id: { $in: orderGroup.orderIds },
    order_group_id: orderGroup._id,
    order_status: {
      $nin: ["cancelled", "refunded"],
    },
  }).lean();

  if (!activeOrders.length) {
    return res.status(400).json({
      success: false,
      message: "No active order available for Velocity.",
    });
  }

  // ---------------------------------------------------
  // 6. Save package dimensions in OrderGroup
  // ---------------------------------------------------

  orderGroup.length = Number(length);
  orderGroup.breadth = Number(breadth);
  orderGroup.height = Number(height);
  orderGroup.weight = Number(weight);

  await orderGroup.save();

  // ---------------------------------------------------
  // 7. Prepare first order/address information
  //
  // You already assured that orders in the group have
  // the required address relationship.
  // ---------------------------------------------------

  const firstOrder = activeOrders[0];

  const shippingAddress = firstOrder.shipping_address;
  const billingAddress = firstOrder.billing_address;

  if (!shippingAddress || !billingAddress) {
    return res.status(400).json({
      success: false,
      message: "Shipping or billing address is missing",
    });
  }

  const normalizeAddressValue = (value) => {
    return String(value ?? "")
      .trim()
      .replace(/\s+/g, " ")
      .toLowerCase();
  };

  const isSameAddress = (shipping, billing) => {
    if (!shipping || !billing) {
      return false;
    }

    return (
      normalizeAddressValue(shipping.full_name) ===
      normalizeAddressValue(billing.full_name) &&

      normalizeAddressValue(shipping.phone) ===
      normalizeAddressValue(billing.phone) &&

      normalizeAddressValue(shipping.address_line1) ===
      normalizeAddressValue(billing.address_line1) &&

      normalizeAddressValue(shipping.address_line2) ===
      normalizeAddressValue(billing.address_line2) &&

      normalizeAddressValue(shipping.city) ===
      normalizeAddressValue(billing.city) &&

      normalizeAddressValue(shipping.state) ===
      normalizeAddressValue(billing.state) &&

      normalizeAddressValue(shipping.pincode) ===
      normalizeAddressValue(billing.pincode) &&

      normalizeAddressValue(shipping.country) ===
      normalizeAddressValue(billing.country)
    );
  };

  const shippingIsBilling = isSameAddress(
    shippingAddress,
    billingAddress
  );

  const velocityDestinationAddress = shippingIsBilling ? billingAddress : shippingAddress;

  // ---------------------------------------------------
  // 9. Build Velocity order_items
  //
  // Every product from every order in this group will
  // go into the SAME Velocity order_items array.
  // ---------------------------------------------------

  const orderItems = [];


  for (const order of activeOrders) {
    for (const item of order.items || []) {
      const productDetails = item.product_details || {};
      const product = productDetails.product || {};
      const variant = product.variant || {};

      const sellingPrice = Number(productDetails.totalAmount || 0);

      const discount = Number(
        productDetails.couponDiscount || 0
      );

      orderItems.push({
        name: product.product_name || "Product",
        sku: String(
          variant.sku ||
          variant._id
        ),
        units: Number(item.quantity || 1),
        selling_price: sellingPrice,
        discount,
      });
    }
  }

  const paymentMode = orderGroup.payment_mode || firstOrder.payment_mode;

  let subTotal;
  let codCollectible;

  if (paymentMode === "cod") {
    // COD cancellation ke time OrderGroup already recalculate ho chuka hai
    subTotal = Number(orderGroup.finalAmount || 0);
    codCollectible = Number(orderGroup.finalAmount || 0);
  } else {
    // Prepaid/online
    subTotal = Number(orderGroup.finalAmount || 0) - Number(orderGroup.total_refunded_amount || 0);
    subTotal = Math.max(subTotal, 0);
    codCollectible = 0;
  }

  // ---------------------------------------------------
  // 12. Generate merchant order ID
  // ---------------------------------------------------

  const merchantOrderId = orderGroup.group_id;

  // ---------------------------------------------------
  // 13. Build Velocity payload
  // ---------------------------------------------------

  const velocityPayload = {

    order_id: merchantOrderId,

    order_date: new Date().toISOString(),

    carrier_id: carrier_id,

    // --------------------------------
    // DESTINATION / BILLING ADDRESS
    // --------------------------------

    billing_customer_name:
      velocityDestinationAddress.full_name || "",

    billing_last_name: "",

    billing_address:
      velocityDestinationAddress.address_line1 || "",

    billing_address_2:
      velocityDestinationAddress.address_line2 || "",

    billing_city:
      velocityDestinationAddress.city || "",

    billing_pincode:
      velocityDestinationAddress.pincode || "",

    billing_state:
      velocityDestinationAddress.state || "",

    billing_country:
      velocityDestinationAddress.country || "India",

    billing_email:
      firstOrder.email || "",

    billing_phone:
      velocityDestinationAddress.phone || "",

    shipping_is_billing: true,

    print_label: true,

    order_items: orderItems,

    payment_method: paymentMode,

    sub_total: subTotal,

    cod_collectible: codCollectible,

    length: Number(length),
    breadth: Number(breadth),
    height: Number(height),
    weight: Number(weight),

    warehouse_id: process.env.VELOCITY_WAREHOUSE_ID,

    vendor_details: {
      email: "shuddhvedahoney@gmail.com",

      phone: "8175022207",

      name: "ShuddhVeda Honey",

      address:
        "Rz-91/2, First Floor, Mohan Garden, Opposite Metro Pillar 745",

      city: "Delhi",

      state: "Delhi",

      country: "India",

      pincode: "110059",
    },
  };

  // ---------------------------------------------------
  // 14. Velocity API URL
  // ---------------------------------------------------

  const velocityUrl = `${process.env.VELOCITY_BASE_URL}/custom/api/v1/forward-order-orchestration`;

  // ---------------------------------------------------
  // 15. Call Velocity
  // ---------------------------------------------------

  let velocityResponse;

  try {
    velocityResponse = await axios.post(
      velocityUrl,
      velocityPayload,
      {
        headers: {
          Authorization: `Bearer ${process.env.VELOCITY_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    // -------------------------------------------------
    // Save failed Velocity response also
    // -------------------------------------------------

    await VelocitySchema.create({
      orderGroupId: orderGroup._id,

      orderIds: activeOrders.map((order) => order._id),

      merchantOrderId,

      rawResponse:
        error.response?.data || null,

      status: "FAILED",

      error: {
        message: error.message,
        status: error.response?.status || null,
        data: error.response?.data || null,
      },
    });

    return res.status(
      error.response?.status || 500
    ).json({
      success: false,
      message: "Velocity order creation failed",
      error: error.response?.data || error.message,
    });
  }

  // ---------------------------------------------------
  // 16. Velocity response
  // ---------------------------------------------------

  const velocityData = velocityResponse.data;

  const payload = velocityData?.payload || {};

  // ---------------------------------------------------
  // 17. Save Velocity response
  // ---------------------------------------------------

  const velocityOrder = await VelocitySchema.create({
    orderGroupId: orderGroup._id,

    orderIds: activeOrders.map((order) => order._id),

    merchantOrderId,

    velocityOrderId: payload.order_id || null,

    shipmentId:
      payload.shipment_id || null,

    awbCode:
      payload.awb_code || null,

    courierCompanyId:
      payload.courier_company_id || null,

    courierName:
      payload.courier_name || null,

    labelUrl:
      payload.label_url || null,

    manifestUrl:
      payload.manifest_url || null,

    pickupTokenNumber:
      payload.pickup_token_number || null,

    rawResponse: velocityData,

    status:
      velocityData?.status === 1
        ? "SUCCESS"
        : "FAILED",

    error:
      velocityData?.status === 1
        ? null
        : velocityData,
  });


  await Order.updateMany(
    {
      _id: {
        $in: activeOrders.map((order) => order._id),
      },
      order_group_id: orderGroup._id,
    },
    {
      $set: {
        order_status: "confirmed",
      },
    }
  );

  // ---------------------------------------------------
  // 18. Return response
  // ---------------------------------------------------
  return res.status(201).json({

    success: true,

    message:
      "Order created successfully on Velocity",

    data: {

      velocityOrder,

      orderSummary: {

        totalOrders: activeOrders.length,

        activeOrders:
          activeOrders.length,

        activeOrderIds: activeOrders.map((order) => order._id),

        subTotal: subTotal,

        codCollectible: codCollectible,
      },
    },
  });
});

const cancelOrderByAdmin = asyncHandler(async (req, res) => {
  const { role } = req.user;
  const { orderGroupIds } = req.body;

  // --------------------------------------------------
  // 1. Admin only
  // --------------------------------------------------
  if (role !== "admin") {
    return res.status(403).json({
      success: false,
      message: "Only admin can cancel Velocity orders",
    });
  }

  // --------------------------------------------------
  // 2. Validate orderGroupIds
  // --------------------------------------------------
  if (
    !Array.isArray(orderGroupIds) ||
    orderGroupIds.length === 0
  ) {
    return res.status(400).json({
      success: false,
      message: "orderGroupIds must be a non-empty array",
    });
  }

  // --------------------------------------------------
  // 3. Validate ObjectIds
  // --------------------------------------------------
  const invalidIds = orderGroupIds.filter(
    (id) => !mongoose.Types.ObjectId.isValid(id)
  );

  if (invalidIds.length > 0) {
    return res.status(400).json({
      success: false,
      message: "One or more invalid orderGroupIds",
      invalidIds,
    });
  }

  // Remove duplicate group IDs
  const uniqueOrderGroupIds = [
    ...new Set(orderGroupIds.map((id) => id.toString())),
  ];

  // --------------------------------------------------
  // 4. Find Velocity orders
  // --------------------------------------------------
  const velocityOrders = await VelocitySchema.find({
    orderGroupId: {
      $in: uniqueOrderGroupIds,
    },
  });

  if (!velocityOrders.length) {
    return res.status(404).json({
      success: false,
      message: "No Velocity orders found for provided orderGroupIds",
    });
  }

  // --------------------------------------------------
  // 5. Validate all requested groups were found
  // --------------------------------------------------
  const foundGroupIds = new Set(
    velocityOrders.map((item) =>
      item.orderGroupId.toString()
    )
  );


  const notFoundGroupIds = uniqueOrderGroupIds.filter(
    (id) => !foundGroupIds.has(id)
  );

  // --------------------------------------------------
  // 6. Check shipment status before cancellation
  // --------------------------------------------------
  const invalidForCancellation = [];
  const cancellableOrders = [];

  for (const velocityOrder of velocityOrders) {
    const trackingData = velocityOrder?.tracking?.current?.data;

    const status = trackingData?.status;
    const subStatus = trackingData?.sub_status;

    /**
     * Cancel only before courier pickup.
     *
     * Velocity tracking:
     * status: cancelled
     * sub_status: ready_for_pickup
     *
     * We primarily check ready_for_pickup because this
     * represents the shipment waiting for pickup.
     */
    if (subStatus !== "ready_for_pickup") {
      invalidForCancellation.push({
        orderGroupId: velocityOrder.orderGroupId,
        awbCode: velocityOrder.awbCode,
        status,
        subStatus,
        message: "Order cannot be cancelled because shipment is not ready for pickup",
      });

      continue;
    }

    if (!velocityOrder.awbCode) {
      invalidForCancellation.push({
        orderGroupId: velocityOrder.orderGroupId,
        message: "AWB code not found",
      });

      continue;
    }

    cancellableOrders.push(velocityOrder);
  }

  // --------------------------------------------------
  // 7. Nothing is cancellable
  // --------------------------------------------------
  if (!cancellableOrders.length) {
    return res.status(400).json({
      success: false,
      message:
        "No eligible Velocity orders found for cancellation",
      notFoundGroupIds,
      invalidForCancellation,
    });
  }

  // --------------------------------------------------
  // 8. Prepare AWBs
  // --------------------------------------------------
  const awbs = [
    ...new Set(
      cancellableOrders
        .map((order) => order.awbCode)
        .filter(Boolean)
    ),
  ];

  console.log(awbs);

  // --------------------------------------------------
  // 9. Call Velocity Cancel API
  // --------------------------------------------------
  let velocityResponse;

  try {
    velocityResponse = await axios.post(
      `${process.env.VELOCITY_BASE_URL}/custom/api/v1/cancel-order`,
      {
        awbs,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.VELOCITY_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error(
      "Velocity cancel order error:",
      error?.response?.data || error.message
    );

    return res.status(
      error?.response?.status >= 400 &&
        error?.response?.status < 500
        ? error.response.status
        : 502
    ).json({
      success: false,
      message: "Failed to cancel orders on Velocity",
      error:
        error?.response?.data ||
        error.message,
      awbs,
    });
  }

  // --------------------------------------------------
  // 10. Collect all Order IDs from Velocity documents
  // --------------------------------------------------
  const orderIds = [
    ...new Set(
      cancellableOrders.flatMap(
        (velocityOrder) =>
          (velocityOrder.orderIds || []).map((id) =>
            id.toString()
          )
      )
    ),
  ];

  // --------------------------------------------------
  // 11. Update Order collection
  // --------------------------------------------------
  let updatedOrders = 0;

  if (orderIds.length > 0) {
    const updateResult = await Order.updateMany(
      {
        _id: {
          $in: orderIds,
        },
      },
      {
        $set: {
          order_status: "cancelled",
        },
      }
    );

    updatedOrders = updateResult.modifiedCount;
  }

  // --------------------------------------------------
  // 12. Return response
  // --------------------------------------------------
  return res.status(200).json({
    success: true,
    message: "Velocity orders cancelled successfully",

    cancelled: {
      orderGroupIds: cancellableOrders.map(
        (order) => order.orderGroupId
      ),

      awbs,

      orderIds,

      updatedOrders,
    },

    notFoundGroupIds,

    skipped: invalidForCancellation,

    velocityResponse: velocityResponse.data,
  });
});

const orderTrackingByVelocityWebhooks = asyncHandler(
  async (req, res) => {
    try {
      const webhookData = req.body;

      console.log(
        "========== VELOCITY WEBHOOK =========="
      );

      console.log(
        JSON.stringify(webhookData, null, 2)
      );

      const {
        event,
        event_id,
        data,
      } = webhookData;

      // -----------------------------------------
      // 1. Basic payload validation
      // -----------------------------------------

      if (!event || !event_id || !data) {
        return res.status(400).json({
          success: false,
          message: "Invalid Velocity webhook payload",
        });
      }

      const {
        shipment_id,
        tracking_number,
        order_id,
        order_external_id,
        status: velocityStatus,
      } = data;

      if (
        !shipment_id &&
        !tracking_number &&
        !order_id &&
        !order_external_id
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Shipment ID, AWB, order ID or external order ID is required",
        });
      }

      if (!velocityStatus) {
        return res.status(400).json({
          success: false,
          message:
            "Shipment status is missing from Velocity webhook",
        });
      }

      // -----------------------------------------
      // 2. Find VelocityOrder
      // -----------------------------------------

      let velocityOrder = null;

      const maxAttempts = 5;
      const retryDelay = 500;

      for (
        let attempt = 1;
        attempt <= maxAttempts;
        attempt++
      ) {
        const conditions = [];

        if (shipment_id) {
          conditions.push({
            shipmentId: shipment_id,
          });
        }

        if (tracking_number) {
          conditions.push({
            awbCode: tracking_number,
          });
        }

        if (order_id) {
          conditions.push({
            velocityOrderId: order_id,
          });
        }

        if (order_external_id) {
          conditions.push({
            merchantOrderId: order_external_id,
          });
        }

        velocityOrder =
          await VelocitySchema.findOne({
            $or: conditions,
          });

        if (velocityOrder) {
          console.log(
            `Velocity shipment found on attempt ${attempt}`
          );

          break;
        }

        console.log(
          `Velocity shipment not found. Attempt ${attempt}/${maxAttempts}`
        );

        if (attempt < maxAttempts) {
          await new Promise((resolve) =>
            setTimeout(resolve, retryDelay)
          );
        }
      }

      // -----------------------------------------
      // 3. VelocityOrder not found
      // -----------------------------------------

      if (!velocityOrder) {
        console.warn(
          "Velocity shipment not found after retries",
          {
            shipment_id,
            tracking_number,
            order_id,
            order_external_id,
          }
        );

        return res.status(200).json({
          success: true,
          message:
            "Webhook received but shipment was not available yet",
        });
      }

      // -----------------------------------------
      // 4. Initialize tracking
      // -----------------------------------------

      if (!velocityOrder.tracking) {
        velocityOrder.tracking = {
          current: null,
          history: [],
        };
      }

      if (!velocityOrder.tracking.history) {
        velocityOrder.tracking.history = [];
      }

      // -----------------------------------------
      // 5. Prevent duplicate webhook
      // -----------------------------------------

      const alreadyProcessed =
        velocityOrder.tracking.history.some(
          (trackingEvent) =>
            trackingEvent.event_id === event_id
        );

      if (alreadyProcessed) {
        console.log(
          `Duplicate Velocity webhook ignored: ${event_id}`
        );

        return res.status(200).json({
          success: true,
          message:
            "Webhook already processed",
        });
      }

      // -----------------------------------------
      // 6. Create complete tracking event
      // -----------------------------------------

      const trackingEvent = {
        ...webhookData,
        received_at: new Date(),
      };

      // -----------------------------------------
      // 7. Update current tracking
      // -----------------------------------------

      velocityOrder.tracking.current =
        trackingEvent;

      // -----------------------------------------
      // 8. Add tracking history
      // -----------------------------------------

      velocityOrder.tracking.history.push(
        trackingEvent
      );

      velocityOrder.markModified("tracking");

      // -----------------------------------------
      // 9. Save Velocity tracking
      // -----------------------------------------

      await velocityOrder.save();

      // =================================================
      // 10. UPDATE ORDER STATUS
      // =================================================

      const orderIds = velocityOrder.orderIds || [];

      if (orderIds.length > 0) {

        const orders = await Order.find({
          _id: {
            $in: orderIds,
          },
        }).select("_id order_status plan_purchase_id");

        if (orders.length > 0) {

          for (const order of orders) {

            const previousOrderStatus = order.order_status;

            // -----------------------------------------
            // Update Order Status
            // -----------------------------------------

            order.order_status = velocityStatus;

            await order.save();

            console.log("Order status updated:", {
              orderId: order._id,
              previousStatus: previousOrderStatus,
              newStatus: velocityStatus,
            });

            // -----------------------------------------
            // PLAN DELIVERY COMPLETION
            // -----------------------------------------

            if (
              velocityStatus === "delivered" &&
              previousOrderStatus !== "delivered" &&
              order.plan_purchase_id
            ) {

              const purchase = await PurchasePlanDetails.findById(
                order.plan_purchase_id
              );

              if (!purchase) {

                console.warn(
                  "Purchase plan not found for delivered order",
                  {
                    orderId: order._id,
                    planPurchaseId: order.plan_purchase_id,
                  }
                );

                continue;
              }

              // -----------------------------------------
              // Prevent completedDeliveries overflow
              // -----------------------------------------

              const totalDeliveries =
                Number(purchase.totalDeliveries || 0);

              const completedDeliveries =
                Number(purchase.completedDeliveries || 0);

              // -----------------------------------------
              // Increment completed deliveries
              // -----------------------------------------

              if (totalDeliveries === 0 || completedDeliveries < totalDeliveries) {

                purchase.completedDeliveries = completedDeliveries + 1;

                await purchase.save();

                console.log(
                  "Plan completedDeliveries updated:",
                  {
                    planPurchaseId:
                      purchase._id,
                    orderId: order._id,
                    completedDeliveries:
                      purchase.completedDeliveries,
                    totalDeliveries:
                      purchase.totalDeliveries,
                  }
                );
              } else {

                console.warn(
                  "completedDeliveries already reached totalDeliveries",
                  {
                    planPurchaseId:
                      purchase._id,
                    completedDeliveries,
                    totalDeliveries,
                  }
                );
              }
            }
          }
        }

      } else {

        console.warn(
          "No orderIds found in VelocityOrder",
          {
            velocityOrderId:
              velocityOrder.velocityOrderId,
            shipmentId:
              velocityOrder.shipmentId,
          }
        );
      }
      // -----------------------------------------
      // 12. Success response
      // -----------------------------------------

      return res.status(200).json({
        success: true,
        message:
          "Velocity tracking webhook processed successfully",
        data: {
          event,
          status: velocityStatus,
          orderIds,
        },
      });

    } catch (error) {

      console.error(
        "Velocity Tracking Webhook Error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Velocity webhook processing failed",
      });
    }
  }
);


module.exports = {
  checkdeliveryavailability,
  checkDeliveryAvailabilitybyAdmin,
  creareOrderByAdmin,
  orderTrackingByVelocityWebhooks,
  cancelOrderByAdmin
};