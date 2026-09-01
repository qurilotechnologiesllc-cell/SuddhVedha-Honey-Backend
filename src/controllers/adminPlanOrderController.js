const crypto = require('crypto')
const Order = require("../models/orders.model");
const PurchasePlanDetails = require("../models/purchaseplan.model");
const { asyncHandler, BadRequestError, UnauthorizedError, ForbiddenError, NotFoundError, ConflictError, } = require('../errors/errorConfig')

const generateOrderId = () => {
    const date = new Date()
    const yyyy = date.getUTCFullYear()
    const mm = String(date.getUTCMonth() + 1).padStart(2, '0')
    const dd = String(date.getUTCDate()).padStart(2, '0')
    const random = crypto.randomBytes(4).toString('hex').toUpperCase()

    return `SV - ${yyyy}${mm}${dd} -${random}`
}

const getAllpurchasePlansbyUser = asyncHandler(async (req, res) => {

    const {role} = req.user;
    
    if (role !== "admin") {
        throw new ForbiddenError("Access denied. Admins only.");
    }

    const purchasePlans = await PurchasePlanDetails.find().sort({ createdAt: -1 });

    return res.status(200).json({
        success: true,
        message: "All purchase plans retrieved successfully",
        data: purchasePlans
    });
});

const createPlanDeliveryOrder = asyncHandler(async (req, res) => {

    const { role } = req.user;

    if (role !== "admin") {
        throw new ForbiddenError("Access denied. Admins only.");
    }

    const {
        planPurchaseId,
        items,
        plan_delivery_date
    } = req.body;


    // ─────────────────────────────────────────
    // 1. Validate Purchase ID
    // ─────────────────────────────────────────

    if (!planPurchaseId) {

        throw new BadRequestError(
            "Plan purchase id is required"
        );

    }


    // ─────────────────────────────────────────
    // 2. Validate Items
    // ─────────────────────────────────────────

    if (
        !Array.isArray(items) ||
        items.length === 0
    ) {

        throw new BadRequestError(
            "At least one product is required"
        );

    }


    // ─────────────────────────────────────────
    // 3. Validate PLAN Items
    // ─────────────────────────────────────────

    for (const item of items) {

        if (item.type !== "PLAN") {

            throw new BadRequestError(
                "Only PLAN items are allowed for plan delivery"
            );

        }

        if (
            !item.product_details ||
            typeof item.product_details !== "object"
        ) {

            throw new BadRequestError(
                "Product details are required"
            );

        }

        if (
            !Number.isInteger(item.quantity) ||
            item.quantity < 1
        ) {

            throw new BadRequestError(
                "Invalid product quantity"
            );

        }

        if (
            !Number.isInteger(item.reserved_quantity) ||
            item.reserved_quantity < 0
        ) {

            throw new BadRequestError(
                "Invalid reserved quantity"
            );

        }

    }


    // ─────────────────────────────────────────
    // 4. Find Plan Purchase
    // ─────────────────────────────────────────

    const purchase = await PurchasePlanDetails.findById(
            planPurchaseId
        );


    if (!purchase) {

        throw new NotFoundError(
            "Plan purchase not found"
        );

    }


    // ─────────────────────────────────────────
    // 5. Validate Plan Status
    // ─────────────────────────────────────────

    if (purchase.status !== "active") {

        throw new BadRequestError(
            `Plan is not active. Current status: ${purchase.status}`
        );

    }


    // ─────────────────────────────────────────
    // 6. Check Delivery Limit
    // ─────────────────────────────────────────

    if (
        purchase.currentDeliveryNumber >=
        purchase.totalDeliveries
    ) {

        throw new BadRequestError(
            "All plan deliveries have already been completed"
        );

    }


    // ─────────────────────────────────────────
    // 7. Calculate Next Delivery Number
    // ─────────────────────────────────────────

    const nextDeliveryNumber =
        purchase.currentDeliveryNumber + 1;


    // ─────────────────────────────────────────
    // 8. Prevent Duplicate Delivery
    // ─────────────────────────────────────────

    const existingDelivery =
        purchase.deliveries.find(
            delivery =>
                delivery.deliveryNumber ===
                nextDeliveryNumber
        );


    if (existingDelivery) {

        throw new ConflictError(
            `Delivery ${nextDeliveryNumber} has already been created`
        );

    }


    // ─────────────────────────────────────────
    // 9. Validate Delivery Date
    // ─────────────────────────────────────────

    let deliveryDate = null;

    if (plan_delivery_date) {

        deliveryDate =
            new Date(plan_delivery_date);

        if (
            Number.isNaN(
                deliveryDate.getTime()
            )
        ) {

            throw new BadRequestError(
                "Invalid plan delivery date"
            );

        }

    }


    // ─────────────────────────────────────────
    // 10. Generate Order ID
    // ─────────────────────────────────────────

    const order_id = generateOrderId();

    const orderAmount = items.reduce(
        (total, item) => {

            return (
                total +
                Number(
                    item.product_details?.totalAmount || 0
                )
            );

        },
        0
    );


    // ─────────────────────────────────────────
    // 11. Create Plan Order
    // ─────────────────────────────────────────

    const order =
        await Order.create({

            order_id,

            userId:
                purchase.userId,

            order_group_id:
                null,

            plan_purchase_id:
                purchase._id,

            plan_delivery_number:
                nextDeliveryNumber,

            plan_delivery_date:
                deliveryDate,

            items,

            /*
            |--------------------------------------------------------------------------
            | Plan already paid during subscription purchase
            |--------------------------------------------------------------------------
            */

            totalAmount: orderAmount,

            shipping_address:
                purchase.shipping_address,

            billing_address:
                purchase.billing_address,

            payment_mode:
                purchase.payment_mode,

            payment_status:
                "captured",

            payment:
                purchase.payment,

            order_status:
                "processing",

            inventory_status:
                "reserved",

            customer_note:
                "",

            admin_note:
                ""

        });


    // ─────────────────────────────────────────
    // 12. Create Delivery History Entry
    // ─────────────────────────────────────────

    const delivery = {

        deliveryNumber:
            nextDeliveryNumber,

        orderId:
            order._id,

        status:
            "processing",

        scheduledDate:
            deliveryDate,

        shippedAt:
            null,

        deliveredAt:
            null,

        products:
            items.map(item => ({

                productId:
                    item.product_details
                        ?.product?._id,

                variantId:
                    item.product_details
                        ?.product?.variant?._id,

                productName:
                    item.product_details
                        ?.product?.product_name,

                quantity:
                    item.quantity,

                quantityPerJar:
                    item.product_details
                        ?.product?.variant?.weight,

                quantityUnit:
                    item.product_details
                        ?.product?.variant?.unit || "g"

            }))

    };


    // ─────────────────────────────────────────
    // 13. Push Delivery
    // ─────────────────────────────────────────

    purchase.deliveries.push(
        delivery
    );


    // ─────────────────────────────────────────
    // 14. Update Current Delivery
    // ─────────────────────────────────────────

    purchase.currentDeliveryNumber =
        nextDeliveryNumber;


    // NOTE:
    // completedDeliveries will be updated
    // only after actual successful delivery.

    await purchase.save();


    // ─────────────────────────────────────────
    // 15. Response
    // ─────────────────────────────────────────

    return res.status(201).json({

        success: true,

        message:
            `Plan delivery ${nextDeliveryNumber} order created successfully`,

        order: {

            _id:
                order._id,

            order_id:
                order.order_id,

            plan_purchase_id:
                order.plan_purchase_id,

            plan_delivery_number:
                order.plan_delivery_number,

            plan_delivery_date:
                order.plan_delivery_date,

            userId:
                order.userId,

            items:
                order.items,

            shipping_address:
                order.shipping_address,

            billing_address:
                order.billing_address,

            payment_mode:
                order.payment_mode,

            payment_status:
                order.payment_status,

            order_status:
                order.order_status,

            inventory_status:
                order.inventory_status

        },

        plan: {

            purchase_id:
                purchase.purchase_id,

            currentDeliveryNumber:
                purchase.currentDeliveryNumber,

            completedDeliveries:
                purchase.completedDeliveries,

            totalDeliveries:
                purchase.totalDeliveries

        }

    });

});

module.exports = {
    getAllpurchasePlansbyUser,
    createPlanDeliveryOrder
};