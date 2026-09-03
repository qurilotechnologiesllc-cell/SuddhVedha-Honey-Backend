const crypto = require('crypto')
const Order = require("../models/orders.model");
const PurchasePlanDetails = require("../models/purchaseplan.model");
const Products = require('../models/product.model')
const { asyncHandler, BadRequestError, UnauthorizedError, ForbiddenError, NotFoundError, ConflictError, } = require('../errors/errorConfig')
const { sendnotificationEmailToUser } = require('../utils/sendEmail')

const generateOrderId = () => {
    const date = new Date()
    const yyyy = date.getUTCFullYear()
    const mm = String(date.getUTCMonth() + 1).padStart(2, '0')
    const dd = String(date.getUTCDate()).padStart(2, '0')
    const random = crypto.randomBytes(4).toString('hex').toUpperCase()

    return `SV - ${yyyy}${mm}${dd} -${random}`
}

const getAllpurchasePlansbyUser = asyncHandler(async (req, res) => {

    const { role } = req.user;

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

    const purchase = await PurchasePlanDetails
        .findById(planPurchaseId)
        .populate({
            path: "planId",
            select: "name description packageLabel"
        });



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

    const nextDeliveryNumber = purchase.currentDeliveryNumber + 1;


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

    const order = await Order.create({

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

    purchase.deliveries.push(delivery);


    // ─────────────────────────────────────────
    // 14. Update Current Delivery
    // ─────────────────────────────────────────

    purchase.currentDeliveryNumber = nextDeliveryNumber;


    // NOTE:
    // completedDeliveries will be updated
    // only after actual successful delivery.

    await purchase.save();

    const userInfo = {
        email: purchase.customer?.email,
        name: purchase.customer?.name
    }

    const products = items.map((item) => {
        const product = item.product_details?.product;
        const variant = product?.variant;
        return {
            productName: product?.product_name || "Product",
            quantity: item.quantity || 0,
            weight: variant?.weight ? `${variant.weight}${variant.unit || "g"}` : "",
            productDescription: product?.description || ""
        };
    });

    const orderdetails = {
        customerName: purchase.customer?.name,
        planName: purchase.planId.name,
        orderId: order_id,
        orderDate: new Date(order.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }),
        totalAmount: orderAmount,
        productName: products[0]?.productName || "",
        quantity: products[0]?.quantity?.toString() || "",
        weight: products[0]?.weight || "",
        productDescription: purchase.planId.description,
        deliveryDate: plan_delivery_date,
        deliveryAddress: purchase.shipping_address
    }

    const result = await sendnotificationEmailToUser(userInfo, orderdetails)


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

const getproductDetails = asyncHandler(async (req, res) => {
    const { role } = req.user

    if (role !== "admin") {
        throw new ForbiddenError("Access denied. Admins only.");
    }

    const products = await Products.find({ is_active: true })
        .populate({
            path: 'categoryId',
            select: 'category_name description slug -_id'
        })
        .populate({
            path: 'variantDocumentId',
            select: 'variants -_id'
        })
        .populate({
            path: 'imageDocumentId',
            select: 'images -_id'
        })
        .select('-videoDocumentId -createdAt -__v')
        .lean();



    // 2. Loop chalakar har product ki images array me se sirf pehli image nikaal li
    const formattedProducts = products.map(product => {
        let singleImage = null;
        let singleVariant = null;

        // Check kiya ki images object aur uske andar ka images array exist karta hai ya nahi
        if (product.imageDocumentId && product.imageDocumentId.images && product.imageDocumentId.images.length > 0) {
            singleImage = product.imageDocumentId.images[0]; // Sirf pehla image object uthaya
        }
        // Variants array se 1st variant nikala
        if (product.variantDocumentId && product.variantDocumentId.variants && product.variantDocumentId.variants.length > 0) {
            singleVariant = product.variantDocumentId.variants;
        }

        return {
            ...product,
            imageDocumentId: singleImage, // Pura object hata kar sirf single image object set kar diya
            variantDocumentId: singleVariant
        };
    });

    res.status(200).json({
        success: true,
        data: formattedProducts // Modified data bheja
    });
})

module.exports = {
    getAllpurchasePlansbyUser,
    createPlanDeliveryOrder,
    getproductDetails
};