const crypto = require('crypto')
const axios = require('axios')
const Order = require("../models/orders.model");
const Ordergroup = require('../models/orderGoup.model')
const PurchasePlanDetails = require("../models/purchaseplan.model");
const PlanComboSet = require('../models/PlanComboSet.model')
const Products = require('../models/product.model')
const VelocitySchema = require('../models/velocityOrder.model')
const Plans = require('../models/plans.models')
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

const generateOrderGroupId = () => {

    const date = new Date();

    const yyyy =
        date.getUTCFullYear();

    const mm =
        String(
            date.getUTCMonth() + 1
        ).padStart(2, "0");

    const dd =
        String(
            date.getUTCDate()
        ).padStart(2, "0");

    const random =
        crypto
            .randomBytes(4)
            .toString("hex")
            .toUpperCase();

    return `SG-${yyyy}${mm}${dd}-${random}`;
};

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

const createPlanDeliveryOrderOnVelocity = asyncHandler(async (req, res) => {

    const { role } = req.user;

    if (role !== "admin") {
        throw new ForbiddenError(
            "Access denied. Admins only."
        );
    }


    const {
        planPurchaseId,
        comboSetId,
        plan_delivery_date,
        carrier_id,
        length,
        breadth,
        height,
        weight
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
    // 2. Validate Combo Set ID
    // ─────────────────────────────────────────

    if (!comboSetId) {
        throw new BadRequestError(
            "Combo set id is required"
        );
    }


    // ─────────────────────────────────────────
    // 3. Validate Delivery Date
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
    // 4. Find Plan Purchase
    // ─────────────────────────────────────────

    const purchase = await PurchasePlanDetails
        .findById(planPurchaseId)
        .populate({
            path: "planId",
            select: "name description"
        });

    console.log(purchase)


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
    // 9. Find Plan Combo Set
    // ─────────────────────────────────────────

    const planComboSet = await PlanComboSet.findOne({
        planId: purchase.planId,
        "combosets._id": comboSetId
    }).lean();


    if (!planComboSet) {
        throw new NotFoundError(
            "Selected combo set not found for this plan"
        );
    }


    // ─────────────────────────────────────────
    // 10. Find Selected Combo Set
    // ─────────────────────────────────────────

    const selectedComboSet = planComboSet?.combosets?.find(
        combo => combo._id.toString() === comboSetId.toString()
    );


    /*
    |--------------------------------------------------------------------------
    | IMPORTANT
    |--------------------------------------------------------------------------
    |
    | Agar PlanComboSet collection ka document khud
    | ek comboSet hai, aur uske andar products hain,
    | to selectedComboSet ki zarurat nahi hogi.
    |
    | Us case mein:
    |
    | selectedComboSet = planComboSet
    |
    |--------------------------------------------------------------------------
    */


    if (!selectedComboSet) {
        throw new NotFoundError(
            "Selected combo set details not found"
        );
    }


    // ─────────────────────────────────────────
    // 11. Validate Combo Products
    // ─────────────────────────────────────────

    if (
        !Array.isArray(selectedComboSet.products) ||
        selectedComboSet.products.length === 0
    ) {
        throw new BadRequestError(
            "Selected combo set does not contain any products"
        );
    }


    // ─────────────────────────────────────────
    // 12. Calculate Total Weight
    // ─────────────────────────────────────────

    const totalWeight =
        selectedComboSet.products.reduce(
            (total, product) =>
                total +
                Number(product.weight || 0),
            0
        );


    // ─────────────────────────────────────────
    // 13. Build PLAN Order Item
    // ─────────────────────────────────────────

    const items = [
        {
            type: "PLAN",

            product_details: {

                product: {

                    _id:
                        selectedComboSet._id,

                    product_name:
                        selectedComboSet.title,

                    brand:
                        "SudhVeda Honey",

                    product_type:
                        "plan_combo",

                    image: {
                        image_url:
                            selectedComboSet.image || "",

                        public_id:
                            selectedComboSet.public_id || ""
                    },

                    comboSets:
                        selectedComboSet.products
                            .map(product => ({
                                name:
                                    product.name,

                                weight:
                                    product.weight,

                                unit:
                                    product.unit
                            }))
                },

                totalAmount:
                    Number(purchase.finalAmount || 0),

                totalWeight,

                totalWeightUnit:
                    "g",

                totalsave:
                    0
            },

            quantity: 1,

            reserved_quantity: 0
        }
    ];


    // ─────────────────────────────────────────
    // 14. Generate Order ID
    // ─────────────────────────────────────────

    const order_id =
        generateOrderId();


    /*
    |--------------------------------------------------------------------------
    | Plan delivery order ka amount actual combo ka price nahi hoga.
    |
    | Customer already plan purchase ke time payment kar chuka hai.
    |
    | Isliye order amount = purchased plan amount.
    |--------------------------------------------------------------------------
    */

    const orderAmount =
        Number(
            purchase.finalAmount || 0
        );


    // ─────────────────────────────────────────
    // 15. Create Order
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

            totalAmount:
                orderAmount,

            shipping_address:
                purchase.shipping_address,

            billing_address:
                purchase.billing_address,

            payment_mode:
                purchase.payment_mode,

            payment_status:
                purchase.payment_status,

            payment:
                purchase.payment,

            order_status:
                "processing",

            inventory_status: "not_applicable",

            customer_note:
                "",

            admin_note:
                ""
        });


    // ─────────────────────────────────────────
    // 16. Create Order Group
    // ─────────────────────────────────────────

    const group_id = generateOrderGroupId();


    const orderGroup =
        await Ordergroup.create({

            group_id,

            userId:
                purchase.userId,

            orderIds: [
                order._id
            ],

            totalAmount:
                orderAmount,

            finalAmount:
                orderAmount,

            /*
            |--------------------------------------------------------------------------
            | Plan already paid.
            | Customer se COD collect nahi karna.
            |--------------------------------------------------------------------------
            */

            cod_amount:
                0,

            length:
                Number(length || 0),

            breadth:
                Number(breadth || 0),

            height:
                Number(height || 0),

            weight:
                Number(weight || totalWeight / 1000),

            coupon: {
                offerId: null,
                couponCode: null,
                discountType: null,
                discountValue: 0,
                discountAmount: 0
            },

            payment_mode:
                purchase.payment_mode,

            payment_status:
                purchase.payment_status,

            payment:
                purchase.payment
        });


    order.order_group_id = orderGroup._id;


    await order.save();


    // ─────────────────────────────────────────
    // 17. Velocity Payload
    // ─────────────────────────────────────────

    const velocityPayload = {

        order_id:
            orderGroup.group_id,

        order_date:
            new Date(order.createdAt)
                .toISOString()
                .slice(0, 16)
                .replace("T", " "),

        carrier_id:
            carrier_id,

        billing_customer_name:
            order.billing_address?.full_name || "",

        billing_last_name:
            "",

        billing_address:
            order.billing_address?.address_line1 || "",

        billing_city:
            order.billing_address?.city || "",

        billing_pincode:
            order.billing_address?.pincode || "",

        billing_state:
            order.billing_address?.state || "",

        billing_country:
            order.billing_address?.country || "India",

        billing_email:
            purchase.customer?.email || "",

        billing_phone:
            order.billing_address?.phone || "",

        shipping_is_billing:
            true,

        print_label:
            true,


        // ─────────────────────────────────────
        // Products inside selected combo set
        // ─────────────────────────────────────

        order_items:
            selectedComboSet.products.map(
                product => ({

                    name: product.name,

                    sku:
                        `${comboSetId}-${product.name
                            .replace(/\s+/g, "-")
                            .toUpperCase()}`,

                    units: 1,

                    /*
                    |--------------------------------------------------------------------------
                    | Product individually charge nahi ho raha.
                    | Plan already prepaid hai.
                    |--------------------------------------------------------------------------
                    */

                    selling_price:
                        0,

                    discount: 0
                })
            ),


        // ─────────────────────────────────────
        // Plan already paid
        // ─────────────────────────────────────

        payment_method:
            "PREPAID",

        sub_total:
            Number(
                purchase.finalAmount || 0
            ),

        cod_collectible:
            0,


        length:
            Number(length || 0),

        breadth:
            Number(breadth || 0),

        height:
            Number(height || 0),

        weight:
            Number(
                weight || (totalWeight / 1000)
            ),


        pickup_location:
            "HomeNew",

        warehouse_id:
            process.env.VELOCITY_WAREHOUSE_ID,


        vendor_details: {

            email:
                "shuddhvedahoney@gmail.com",

            phone:
                "8175022207",

            name:
                "ShuddhVeda Honey",

            address:
                "Rz-91/2, First Floor, Mohan Garden, Opposite Metro Pillar 745",

            address_2:
                "",

            city:
                "Delhi",

            state:
                "Delhi",

            country:
                "India",

            pin_code:
                "110059",

            pickup_location:
                "HomeNew"
        }
    };


    // ─────────────────────────────────────────
    // 18. Create Velocity Order
    // ─────────────────────────────────────────

    const velocityResult =
        await createOrderOnVelocity({

            payload:
                velocityPayload,

            orderGroupId:
                orderGroup._id,

            orderIds: [
                order._id
            ],

            merchantOrderId:
                orderGroup.group_id
        });


    if (!velocityResult.success) {

        return res.status(
            velocityResult.error?.status || 500
        ).json({

            success: false,

            message:
                "Order created locally but Velocity order creation failed",

            error:
                velocityResult.error,

            velocityResponse:
                velocityResult.velocityResponse,

            velocityOrder:
                velocityResult.velocityOrder
        });
    }


    // ─────────────────────────────────────────
    // 19. Confirm Order
    // ─────────────────────────────────────────

    order.order_status = "confirmed";

    await order.save();


    // ─────────────────────────────────────────
    // 20. Create Delivery History
    // ─────────────────────────────────────────

    const delivery = {

        /*
        |--------------------------------------------------------------------------
        | IMPORTANT
        |--------------------------------------------------------------------------
        | Agar aapke schema mein deliveryNumber field nahi hai,
        | to schema mein add karna padega.
        |--------------------------------------------------------------------------
        */

        deliveryNumber: nextDeliveryNumber,

        comboSetId:
            selectedComboSet._id,

        monthName:
            selectedComboSet.monthName,

        title:
            selectedComboSet.title,

        image:
            selectedComboSet.image || "",

        season:
            selectedComboSet.season || "",

        harvestTitle:
            selectedComboSet.harvestTitle || "",

        description:
            selectedComboSet.description || "",

        readMore:
            selectedComboSet.readMore || "",

        orderId: order._id,


        scheduledDate: deliveryDate
    };


    // ─────────────────────────────────────────
    // 21. Update Purchase Plan
    // ─────────────────────────────────────────

    purchase.deliveries.push(delivery);

    purchase.currentDeliveryNumber = nextDeliveryNumber;

    purchase.totalDeliveries = nextDeliveryNumber;

    await purchase.save();

    const userInfo = {
        email: purchase.customer?.email,
        name: purchase.customer?.name
    };

    const products = items.map((item) => {
        const product = item.product_details?.product;

        const totalWeight = Number(item.product_details?.totalWeight || 0);
        const totalWeightUnit = item.product_details?.totalWeightUnit || "g";

        return {
            productName: product?.product_name || "Product",
            quantity: item.quantity || 0,
            weight: totalWeight
                ? `${totalWeight}${totalWeightUnit}`
                : "",
            productDescription: product?.product_type || "",
            comboSets: product?.comboSets || []
        };
    });

    const orderdetails = {
        customerName: purchase.customer?.name || "",

        // Plan snapshot from PurchasePlan
        planName: purchase.plan?.name || "",

        orderId: order_id,

        orderDate: new Date(order.createdAt).toLocaleDateString(
            "en-IN",
            {
                day: "2-digit",
                month: "short",
                year: "numeric"
            }
        ),

        // Plan delivery order amount
        totalAmount: orderAmount,

        // Selected Plan ComboSet
        productName: products[0]?.productName || "",

        quantity: products[0]?.quantity?.toString() || "",

        // 1000g
        weight: products[0]?.weight || "",

        // Plan description
        productDescription: purchase.plan?.description || "",

        deliveryDate: plan_delivery_date,

        deliveryAddress: purchase.shipping_address,

        // New combo-set products
        comboSets: products[0]?.comboSets || []
    };

    const result = await sendnotificationEmailToUser(userInfo, orderdetails)


    // ─────────────────────────────────────────
    // 22. Response
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

            totalAmount:
                order.totalAmount,

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
        },

        velocityData: velocityResult

    });

});

const createOrderOnVelocity = async ({
    payload,
    orderGroupId,
    orderIds,
    merchantOrderId
}) => {

    try {

        const response = await axios.post(`${process.env.VELOCITY_BASE_URL}/custom/api/v1/forward-order-orchestration`,
            payload,
            {
                headers: {
                    Authorization: `Bearer ${process.env.VELOCITY_API_KEY}`,
                    "Content-Type": "application/json",
                }
            }
        );

        const velocityData = response.data;

        // Save Velocity order details in the database
        const velocityOrder = new VelocitySchema({
            orderGroupId,
            orderIds,
            merchantOrderId,
            velocityOrderId: velocityData.payload.order_id,
            shipmentId: velocityData.payload.shipment_id,
            awbCode: velocityData.payload.awb_code,
            courierCompanyId: velocityData.payload.courier_company_id,
            courierName: velocityData.payload.courier_name,
            labelUrl: velocityData.payload.label_url,
            manifestUrl: velocityData.payload.manifest_url,
            pickupTokenNumber: velocityData.payload.pickup_token_number || null,
            rawResponse: velocityData,
            status: velocityData?.status === 1 ? "SUCCESS" : "FAILED",
            error: velocityData?.status === 1 ? null : velocityData
        });

        await velocityOrder.save();

        return {
            success: velocityData?.status === 1,
            velocityResponse: velocityData,
            velocityOrder
        };

    } catch (error) {

        const errorData = error.response?.data || null;
        const velocityOrder = await VelocitySchema.create({
            orderGroupId,
            orderIds,
            merchantOrderId,
            velocityOrderId: errorData?.payload?.order_id || null,
            shipmentId: errorData?.payload?.shipment_id || null,
            awbCode: errorData?.payload?.awb_code || null,
            courierCompanyId: errorData?.payload?.courier_company_id || null,
            courierName: errorData?.payload?.courier_name || null,
            labelUrl: errorData?.payload?.label_url || null,
            manifestUrl: errorData?.payload?.manifest_url || null,
            pickupTokenNumber: errorData?.payload?.pickup_token_number || null,
            rawResponse: errorData, status: "FAILED",
            error: {
                message: error.message,
                status: error.response?.status || null,
                data: errorData
            }
        });

        return {
            success: false,
            velocityResponse: errorData,
            velocityOrder,
            error: {
                message: error.message,
                status: error.response?.status || null,
                data: errorData
            }
        };
    }

};


const getPlansCombosets = asyncHandler(async (req, res) => {

    const { role } = req.user;

    if (role !== "admin") {
        throw new ForbiddenError(
            "Access denied. Admins only."
        );
    }


    const { planId } = req.params;

    if (!planId) {
        throw new BadRequestError(
            "planId is required"
        );
    }


    const plan = await Plans.findById(planId)
        .populate({
            path: "comboSetId"
        })
        .lean();


    if (!plan) {
        throw new NotFoundError(
            "Plan not found"
        );
    }


    if (!plan.comboSetId) {
        throw new NotFoundError(
            "Combo set not found for this plan"
        );
    }


    return res.status(200).json({

        success: true,

        message:
            "Plan combo sets fetched successfully",

        data:
            plan.comboSetId

    });
});

module.exports = {
    getAllpurchasePlansbyUser,
    createPlanDeliveryOrderOnVelocity,
    getPlansCombosets
};