const axios = require("axios");
const ReturnRequest = require('../models/ReturnRequest.model')
const Order = require('../models/orders.model')
const Ordergroup = require('../models/orderGoup.model')
const ReversePickup = require('../models/ReversePickup.model')
const { asyncHandler, BadRequestError, ConflictError, ForbiddenError, UnauthorizedError, NotFoundError } = require('../errors/errorConfig')

const {
    asyncHandler,
    BadRequestError,
    ConflictError,
    ForbiddenError,
    NotFoundError,
} = require("../errors/errorConfig");

const createReversePickUpOrderOnvelocity = asyncHandler(async (req, res) => {
        // 1. Admin authorization
        if (req.user?.role !== "admin") {
            throw new ForbiddenError(
                "Only admin can create a reverse pickup."
            );
        }

        const { return_id } = req.body;

        if (!return_id) {
            throw new BadRequestError("return_id is required.");
        }

        // 2. Find approved return request
        const returnRequest = await ReturnRequest.findOne({
            return_id,
        });

        if (!returnRequest) {
            throw new NotFoundError("Return request not found.");
        }

        if (returnRequest.status !== "approved") {
            throw new BadRequestError(
                "Reverse pickup can only be created for an approved return request."
            );
        }

        // 3. Prevent duplicate reverse pickup
        const existingPickup = await ReversePickup.findOne({
            returnRequestId: returnRequest._id,
        });

        if (existingPickup) {
            throw new ConflictError(
                "Reverse pickup already exists for this return request."
            );
        }

        // 4. Fetch related order
        const order = await Order.findById(returnRequest.orderId);

        if (!order) {
            throw new NotFoundError("Order not found.");
        }

        // 5. Fetch order group for package dimensions
        const orderGroup = await Ordergroup.findById(
            returnRequest.orderGroupId
        );

        if (!orderGroup) {
            throw new NotFoundError("Order group not found.");
        }

        // 6. Customer pickup address
        const customerAddress = order.shipping_address;

        if (!customerAddress?.pincode) {
            throw new BadRequestError(
                "Customer shipping address or pincode is missing."
            );
        }

        // 7. Packaging proof image
        const packagingImage =
            returnRequest.packagingImages?.[0]?.url;

        if (!packagingImage) {
            throw new BadRequestError(
                "At least one packaging image is required for reverse pickup."
            );
        }

        // 8. Warehouse configuration
        const warehouse = {
            id: process.env.VELOCITY_WAREHOUSE_ID,
            name: process.env.WAREHOUSE_CONTACT_NAME,
            lastName: process.env.WAREHOUSE_CONTACT_LAST_NAME || "",
            company: process.env.WAREHOUSE_COMPANY_NAME || "",
            address: process.env.WAREHOUSE_ADDRESS_LINE1,
            address2: process.env.WAREHOUSE_ADDRESS_LINE2 || "",
            city: process.env.WAREHOUSE_CITY,
            state: process.env.WAREHOUSE_STATE,
            country: process.env.WAREHOUSE_COUNTRY || "India",
            pincode: process.env.WAREHOUSE_PINCODE,
            phone: process.env.WAREHOUSE_PHONE,
            email: process.env.WAREHOUSE_EMAIL,
        };

        const carrierId = process.env.VELOCITY_REVERSE_CARRIER_ID;

        if (
            !warehouse.id ||
            !warehouse.name ||
            !warehouse.address ||
            !warehouse.city ||
            !warehouse.state ||
            !warehouse.pincode ||
            !warehouse.phone ||
            !carrierId
        ) {
            throw new BadRequestError(
                "Warehouse or reverse carrier configuration is incomplete."
            );
        }

        // 9. Split customer full name
        const customerName = (
            customerAddress.full_name || ""
        ).trim();

        if (!customerName) {
            throw new BadRequestError(
                "Customer name is missing from the order."
            );
        }

        const nameParts = customerName.split(/\s+/);
        const pickupFirstName = nameParts.shift();
        const pickupLastName = nameParts.join(" ");

        // 10. Build Velocity order items
        const orderItems = order.items.map((item) => {
            const product = item.product_details?.product;
            const variant = product?.variant;

            const productName =
                product?.product_name || "Returned product";

            return {
                name: productName,
                qc_enable: true,
                qc_product_name: productName,
                sku: variant?.sku || "",
                units: Number(item.quantity),
                selling_price: Number(
                    variant?.price ??
                    item.product_details?.totalAmount ??
                    0
                ),
                discount: 0,
                qc_brand: product?.brand || "",
                qc_product_image: packagingImage,
            };
        });

        if (
            orderItems.length === 0 ||
            orderItems.some(
                (item) => !Number.isFinite(item.units) || item.units < 1
            )
        ) {
            throw new BadRequestError(
                "Order items or quantities are invalid."
            );
        }

        // 11. Validate package dimensions
        const { length, breadth, height, weight } = orderGroup;

        if (
            [length, breadth, height, weight].some(
                (value) =>
                    value == null ||
                    !Number.isFinite(Number(value)) ||
                    Number(value) <= 0
            )
        ) {
            throw new BadRequestError(
                "Valid package dimensions and weight are required."
            );
        }

        const subTotal = orderItems.reduce(
            (total, item) =>
                total + item.selling_price * item.units,
            0
        );

        // 12. Build Velocity reverse pickup payload
        const payload = {
            order_id: returnRequest.return_id,
            order_date: new Date().toISOString().slice(0, 10),
            carrier_id: carrierId,

            // Customer address: pickup from customer
            pickup_customer_name: pickupFirstName,
            pickup_last_name: pickupLastName,
            company_name: "",
            pickup_address: customerAddress.address_line1,
            pickup_address_2: customerAddress.address_line2 || "",
            pickup_city: customerAddress.city,
            pickup_state: customerAddress.state,
            pickup_country: customerAddress.country || "India",
            pickup_pincode: String(customerAddress.pincode),
            pickup_email: order.userEmail || "",
            pickup_phone: String(
                returnRequest.phoneNumber || customerAddress.phone || ""
            ),
            pickup_isd_code: "91",

            // Warehouse address: destination
            shipping_customer_name: warehouse.name,
            shipping_last_name: warehouse.lastName,
            shipping_address: warehouse.address,
            shipping_address_2: warehouse.address2,
            shipping_city: warehouse.city,
            shipping_state: warehouse.state,
            shipping_country: warehouse.country,
            shipping_pincode: String(warehouse.pincode),
            shipping_email: warehouse.email || "",
            shipping_isd_code: "91",
            shipping_phone: String(warehouse.phone),

            warehouse_id: warehouse.id,
            order_items: orderItems,
            payment_method: "PREPAID",
            total_discount: "0",
            sub_total: subTotal,
            length: Number(length),
            breadth: Number(breadth),
            height: Number(height),
            weight: Number(weight),
            request_pickup: true,
        };

        // 13. Create local record before calling Velocity
        const reversePickup = await ReversePickup.create({
            returnRequestId: returnRequest._id,
            orderId: order._id,
            orderGroupId: orderGroup._id,
            userId: returnRequest.userId,
            return_id: returnRequest.return_id,

            pickupAddress: {
                full_name: customerAddress.full_name,
                phone:
                    returnRequest.phoneNumber ||
                    customerAddress.phone,
                address_line1: customerAddress.address_line1,
                address_line2: customerAddress.address_line2,
                city: customerAddress.city,
                state: customerAddress.state,
                pincode: String(customerAddress.pincode),
                country: customerAddress.country || "India",
            },

            destinationAddress: {
                full_name: `${warehouse.name} ${warehouse.lastName}`.trim(),
                phone: String(warehouse.phone),
                address_line1: warehouse.address,
                address_line2: warehouse.address2,
                city: warehouse.city,
                state: warehouse.state,
                pincode: String(warehouse.pincode),
                country: warehouse.country,
            },

            items: orderItems.map((item) => ({
                productName: item.name,
                sku: item.sku,
                quantity: item.units,
                sellingPrice: item.selling_price,
                imageUrl: item.qc_product_image,
            })),

            packageDetails: {
                length: Number(length),
                breadth: Number(breadth),
                height: Number(height),
                weight: Number(weight),
            },

            paymentMode: "PREPAID",
            requestPickup: true,
            status: "creating",
            requestPayload: payload,
        });

        try {
            // 14. Call Velocity reverse-order API
            const response = await axios.post(
                `${process.env.VELOCITY_BASE_URL}/custom/api/v1/reverse-order-orchestration`,
                payload,
                {
                    headers: {
                        "Content-Type": "application/json",

                        // Replace with your existing Velocity auth header.
                        Authorization: `Bearer ${process.env.VELOCITY_API_TOKEN}`,
                    },
                    timeout: 30000,
                }
            );

            const velocityData = response.data;
            const velocityOrder = velocityData?.payload;

            if (
                velocityData?.status !== 1 ||
                !velocityOrder?.order_id ||
                !velocityOrder?.awb_code
            ) {
                reversePickup.status = "pickup_failed";
                reversePickup.rawResponse = velocityData;
                reversePickup.error =
                    velocityData?.message ||
                    "Velocity did not confirm reverse pickup creation.";

                await reversePickup.save();

                throw new BadRequestError(
                    reversePickup.error
                );
            }

            // 15. Save Velocity response
            reversePickup.velocity = {
                velocityOrderId: velocityOrder.order_id,
                shipmentId: velocityOrder.shipment_id,
                awbCode: velocityOrder.awb_code,
                courierCompanyId: velocityOrder.courier_company_id,
                courierName: velocityOrder.courier_name,
                labelUrl: velocityOrder.label_url,
                appliedWeight: velocityOrder.applied_weight,
                charges: {
                    reverseCharges:
                        velocityOrder.charges?.reverse_charges,
                    qc: velocityOrder.charges?.qc,
                    qcLeeway: velocityOrder.charges?.qc_leeway,
                },
            };

            reversePickup.rawResponse = velocityData;
            reversePickup.status = "pickup_created";
            reversePickup.error = null;

            await reversePickup.save();

            return res.status(201).json({
                success: true,
                message: "Reverse pickup created successfully.",
                data: reversePickup,
            });
        } catch (error) {
            // Keep the local record for troubleshooting.
            if (reversePickup.status === "creating") {
                reversePickup.status = "pickup_failed";
                reversePickup.error =
                    error.response?.data?.message ||
                    error.message ||
                    "Failed to create reverse pickup.";

                reversePickup.rawResponse =
                    error.response?.data || null;

                await reversePickup.save();
            }

            // Preserve errors already handled above.
            if (
                error instanceof BadRequestError ||
                error instanceof ConflictError ||
                error instanceof NotFoundError ||
                error instanceof ForbiddenError
            ) {
                throw error;
            }

            throw new BadRequestError(
                "Velocity reverse pickup request failed. Check the reverse pickup record before retrying."
            );
        }
    }
);


module.exports = { createReversePickUpOrderOnvelocity }

