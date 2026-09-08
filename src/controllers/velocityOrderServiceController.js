const mongoose = require("mongoose");
const Order = require("../models/orders.model");
const OrderGroup = require("../models/orderGoup.model");
const VelocitySchema = require('../models/velocityOrder.model')
const axios = require("axios");
const { checkDeliveryAvailabilityService } = require("../services/delivery.service");

const { asyncHandler, BadRequestError, UnauthorizedError, ForbiddenError, NotFoundError, ConflictError, ValidationError, ServiceUnavailableError } = require('../errors/errorConfig')

const checkdeliveryavailability = asyncHandler(async (req, res) => {
  const { pincode } = req.body;

  const role = req.user.role;

  if (role !== "user") {
    throw new ForbiddenError("Access denied. Only users can check delivery availability.");
  }

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
        Authorization: `Bearer ${process.env.VELOCITY_TOKEN}`,
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

  const orders = await Order.find({
    _id: { $in: orderGroup.orderIds },
    order_group_id: orderGroup._id,
  }).lean();

  if (!orders.length) {
    return res.status(404).json({
      success: false,
      message: "No orders found in this order group",
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

  const firstOrder = orders[0];

  const shippingAddress = firstOrder.shipping_address;
  const billingAddress = firstOrder.billing_address;

  if (!shippingAddress || !billingAddress) {
    return res.status(400).json({
      success: false,
      message: "Shipping or billing address is missing",
    });
  }

  // ---------------------------------------------------
  // 8. Check whether shipping and billing are same
  // ---------------------------------------------------

  const shippingIsBilling =
    JSON.stringify(shippingAddress) ===
    JSON.stringify(billingAddress);

  // ---------------------------------------------------
  // 9. Build Velocity order_items
  //
  // Every product from every order in this group will
  // go into the SAME Velocity order_items array.
  // ---------------------------------------------------

  const orderItems = [];

  for (const order of orders) {
    for (const item of order.items || []) {
      const productDetails = item.product_details || {};
      const product = productDetails.product || {};
      const variant = product.variant || {};

      const sellingPrice =
        Number(variant.price || productDetails.finalAmount || 0);

      const discount = Number(
        productDetails.couponDiscount || 0
      );

      orderItems.push({
        name: product.product_name || "Product",

        // If you have a real SKU field later, use that.
        sku: String(
          variant.sku ||
          variant._id ||
          product._id ||
          item._id
        ),

        units: Number(item.quantity || 1),

        selling_price: sellingPrice,

        discount: discount,
      });
    }
  }

  // ---------------------------------------------------
  // 10. Calculate subtotal
  // ---------------------------------------------------

  const subTotal = Number(orderGroup.finalAmount || 0);

  // ---------------------------------------------------
  // 11. Payment mode
  // ---------------------------------------------------

  const paymentMode = orderGroup.payment_mode || firstOrder.payment_mode;

  const codCollectible = paymentMode === "cod" ? subTotal : 0;

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

    billing_customer_name:
      billingAddress.full_name || "",

    billing_last_name: "",

    billing_address:
      billingAddress.address_line1 || "",

    billing_address_2:
      billingAddress.address_line2 || "",

    billing_city:
      billingAddress.city || "",

    billing_pincode:
      billingAddress.pincode || "",

    billing_state:
      billingAddress.state || "",

    billing_country:
      billingAddress.country || "India",

    billing_email:
      firstOrder.email || "",

    billing_phone:
      billingAddress.phone || "",

    shipping_is_billing: shippingIsBilling,

    shipping_customer_name:
      shippingAddress.full_name || "",

    shipping_last_name: "",

    shipping_address:
      shippingAddress.address_line1 || "",

    shipping_address_2:
      shippingAddress.address_line2 || "",

    shipping_city:
      shippingAddress.city || "",

    shipping_pincode:
      shippingAddress.pincode || "",

    shipping_state:
      shippingAddress.state || "",

    shipping_country:
      shippingAddress.country || "India",

    shipping_email:
      firstOrder.email || "",

    shipping_phone:
      shippingAddress.phone || "",

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
          Authorization: process.env.VELOCITY_TOKEN,
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

      orderIds: orders.map((order) => order._id),

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

    orderIds: orders.map((order) => order._id),

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
        $in: orders.map((order) => order._id),
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

    message: "Order created successfully on Velocity",

    data: {
      velocityOrder,

      velocityResponse: velocityData,
    },
  });
});



module.exports = {
  checkdeliveryavailability,
  checkDeliveryAvailabilitybyAdmin,
  creareOrderByAdmin,
};