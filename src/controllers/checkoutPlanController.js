const crypto = require("crypto");
const mongoose = require('mongoose')
const User = require("../models/user.model")
const Plan = require('../models/plans.models')
const PurchaseplanDetails = require('../models/purchaseplan.model')
const ShippingAddress = require('../models/userShippingAddress.mode')
const { generateAddressHash } = require('../helpers/addressHelper')
const { asyncHandler, BadRequestError, UnauthorizedError, ForbiddenError, NotFoundError, ConflictError, } = require('../errors/errorConfig')
const razorpay = require('../utils/razorpay')

const generatePurchaseId = () => {

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

    return `PP-${yyyy}${mm}${dd}-${random}`;
};

const checkoutPlan = asyncHandler(async (req, res) => {

    const { id } = req.user || {};

    if (!id) {

        throw new UnauthorizedError(
            "User authentication required"
        );

    }


    // ─────────────────────────────────────
    // 2. Get User
    // ─────────────────────────────────────

    const user = await User.findById(id).select("_id");

    if (!user) {

        throw new NotFoundError(
            "User not found"
        );

    }


    // ─────────────────────────────────────
    // 3. Request Body
    // ─────────────────────────────────────

    const {
        planId,
        customer,
        shipping_address,
        billing_address
    } = req.body;


    // ─────────────────────────────────────
    // 4. Validate Plan ID
    // ─────────────────────────────────────

    if (!planId) {

        throw new BadRequestError(
            "Plan ID is required"
        );

    }


    if (
        !mongoose.Types.ObjectId.isValid(planId)
    ) {

        throw new BadRequestError(
            "Invalid plan ID"
        );

    }


    // ─────────────────────────────────────
    // 5. Find Active Plan
    // ─────────────────────────────────────

    const plan = await Plan.findOne({

        _id: planId,

        isActive: true

    }).lean();


    if (!plan) {

        throw new NotFoundError(
            "Plan not found or inactive"
        );

    }


    // ─────────────────────────────────────
    // 6. Validate Customer
    // ─────────────────────────────────────

    if (
        !customer ||
        typeof customer !== "object" ||
        Array.isArray(customer)
    ) {

        throw new BadRequestError(
            "Customer details are required"
        );

    }


    if (!customer.name) {

        throw new BadRequestError(
            "Customer name is required"
        );

    }


    if (!customer.mobile) {

        throw new BadRequestError(
            "Customer mobile number is required"
        );

    }


    // ─────────────────────────────────────
    // 7. Validate Shipping Address
    // ─────────────────────────────────────

    if (
        !shipping_address ||
        typeof shipping_address !== "object" ||
        Array.isArray(shipping_address)
    ) {

        throw new BadRequestError(
            "Shipping address is required"
        );

    }


    // ─────────────────────────────────────
    // 8. Validate Billing Address
    // ─────────────────────────────────────

    if (
        !billing_address ||
        typeof billing_address !== "object" ||
        Array.isArray(billing_address)
    ) {

        throw new BadRequestError(
            "Billing address is required"
        );

    }

    const cleanAddress = {
        address_line1: String(shipping_address.address_line1 || "").trim(),
        address_line2: String(shipping_address.address_line2 || "").trim(),
        city: String(shipping_address.city || "").trim(),
        state: String(shipping_address.state || "").trim(),
        pincode: String(shipping_address.pincode || "").trim(),
        country: String(shipping_address.country || "India").trim()
    }

    if (!cleanAddress.address_line1 || !cleanAddress.city || !cleanAddress.state) {
        throw new BadRequestError("Shipping address line 1, city and state are required")
    }

    if (!PINCODE_REGEX.test(cleanAddress.pincode)) {
        throw new BadRequestError("Valid 6-digit shipping pincode is required")
    }

    let newAddressSaved = false

    try {
        const addressHash = generateAddressHash(cleanAddress)

        const result = await ShippingAddress.updateOne(
            { user_id: user._id, address_hash: addressHash },
            {
                $setOnInsert: {
                    user_id: user._id,
                    address_hash: addressHash,
                    ...cleanAddress,
                    address_type: shipping_address.address_type || "home",
                },
            },
            { upsert: true }
        )

        // upsertedCount 1 = naya address insert hua, 0 = pehle se tha
        newAddressSaved = result.upsertedCount > 0
    } catch (error) {
        // 11000 = race condition me same address dobara insert hua, ye normal hai
        if (error.code !== 11000) {
            console.error("Shipping address save failed:", error.message)
        }
    }
    // ─────────────────────────────────────
    // 9. Generate Purchase ID
    // ─────────────────────────────────────

    const purchase_id = generatePurchaseId();

    const finalAmount = Number(plan.price);


    if (
        !Number.isFinite(finalAmount) ||
        finalAmount < 0
    ) {

        throw new BadRequestError(
            "Invalid plan price"
        );

    }


    // ─────────────────────────────────────
    // 11. Create Plan Purchase
    // ─────────────────────────────────────

    const planPurchase = await PurchaseplanDetails.create({

        purchase_id,

        userId:
            user._id,

        planId:
            plan._id,

        plan: {

            name: plan.name,

            image: plan.image_url,

            description:
                plan.description || "",

            idealFor:
                plan.idealFor || "",

            durationMonths:
                plan.durationMonths,

            price:
                plan.price,

            originalPrice:
                plan.originalPrice,

            discountPercentage:
                plan.discountPercentage || 0,

            currency:
                plan.currency || "INR"
        },

        customer: {

            name:
                customer.name.trim(),

            mobile:
                customer.mobile.trim(),

            email:
                customer.email?.trim() || ""
        },

        shipping_address,

        billing_address,

        finalAmount,

        currency:
            plan.currency || "INR",

        payment_status:
            "pending",

        payment: {},

        status:
            "pending_payment",

        // Abhi koi delivery create nahi hogi
        totalDeliveries: 0,

        completedDeliveries: 0,

        currentDeliveryNumber: 0,

        deliveries: []

    });


    // ─────────────────────────────────────
    // 12. Create Razorpay Order
    // ─────────────────────────────────────

    const razorpayOrder =
        await razorpay.orders.create({

            amount:
                Math.round(finalAmount * 100),

            currency:
                plan.currency || "INR",

            receipt:
                purchase_id,

            notes: {

                user_id:
                    String(user._id),

                plan_purchase_id:
                    String(planPurchase._id),

                purchase_id,

                plan_id:
                    String(plan._id)

            },

            partial_payment: false

        });


    // ─────────────────────────────────────
    // 13. Update Plan Purchase
    // ─────────────────────────────────────

    planPurchase.payment = {

        razorpay_order_id:
            razorpayOrder.id

    };

    planPurchase.payment_status =
        "created";


    await planPurchase.save();


    // ─────────────────────────────────────
    // 14. Response
    // ─────────────────────────────────────

    return res.status(201).json({

        success: true,

        message:
            "Plan checkout created successfully",

        payment_required:
            true,

        purchase: {

            _id:
                planPurchase._id,

            purchase_id:
                planPurchase.purchase_id,

            planId:
                planPurchase.planId,

            plan:
                planPurchase.plan,

            finalAmount:
                planPurchase.finalAmount,

            currency:
                planPurchase.currency,

            payment_status:
                planPurchase.payment_status,

            status:
                planPurchase.status

        },

        razorpay: {

            key_id:
                process.env.RAZORPAY_KEY_ID,

            order_id:
                razorpayOrder.id,

            amount:
                razorpayOrder.amount,

            currency:
                razorpayOrder.currency

        }

    });

});

const razorpayWebhooks = asyncHandler(async (req, res) => {

    const rawBody = req.rawBody || req.body;


    if (!rawBody) {

        return res.status(400).json({

            success: false,

            message:
                "Webhook raw body is missing"

        });

    }


    /*
    |--------------------------------------------------------------------------
    | 2. Verify Razorpay Signature
    |--------------------------------------------------------------------------
    */

    const webhookSignature = req.headers["x-razorpay-signature"];


    if (!webhookSignature) {

        return res.status(400).json({

            success: false,

            message:
                "Razorpay webhook signature missing"

        });

    }


    const generatedSignature =
        crypto
            .createHmac(
                "sha256",
                process.env.RAZORPAY_WEBHOOK_SECRET
            )
            .update(rawBody)
            .digest("hex");


    if (
        !crypto.timingSafeEqual(
            Buffer.from(
                generatedSignature,
                "utf8"
            ),
            Buffer.from(
                webhookSignature,
                "utf8"
            )
        )
    ) {

        console.error(
            "❌ Invalid Razorpay webhook signature"
        );

        return res.status(400).json({

            success: false,

            message:
                "Invalid webhook signature"

        });

    }


    /*
    |--------------------------------------------------------------------------
    | 3. Parse Webhook Body
    |--------------------------------------------------------------------------
    */

    let webhookData;


    try {

        webhookData =
            typeof rawBody === "string"
                ? JSON.parse(rawBody)
                : JSON.parse(
                    rawBody.toString("utf8")
                );

    } catch (error) {

        console.error(
            "❌ Webhook JSON parse error:",
            error
        );

        return res.status(400).json({

            success: false,

            message:
                "Invalid webhook JSON"

        });

    }


    /*
    |--------------------------------------------------------------------------
    | 4. Validate Event
    |--------------------------------------------------------------------------
    */

    const event = webhookData.event;


    if (!event) {

        return res.status(400).json({

            success: false,

            message:
                "Webhook event missing"

        });

    }

    const paymentEntity = webhookData?.payload?.payment?.entity;


    if (
        [
            "payment.authorized",
            "payment.captured",
            "payment.failed",
            "order.paid"
        ].includes(event)
    ) {


        if (!paymentEntity) {

            console.error(
                "❌ Payment entity missing"
            );

            return res.status(400).json({

                success: false,

                message:
                    "Payment entity missing"

            });

        }


        /*
        |--------------------------------------------------------------------------
        | 6. Razorpay Order ID
        |--------------------------------------------------------------------------
        */

        const razorpayOrderId = paymentEntity.order_id;


        if (!razorpayOrderId) {

            console.error(
                "❌ Razorpay order ID missing"
            );

            return res.status(400).json({

                success: false,

                message:
                    "Razorpay order ID missing"

            });

        }


        /*
        |--------------------------------------------------------------------------
        | 7. Find Plan Purchase
        |--------------------------------------------------------------------------
        */

        const planPurchase =
            await PurchaseplanDetails.findOne({

                "payment.razorpay_order_id":
                    razorpayOrderId

            });


        if (!planPurchase) {

            return res.status(404).json({

                success: false,

                message:
                    "Plan purchase not found"

            });

        }



        /*
        |--------------------------------------------------------------------------
        | 8. Determine Payment Status
        |--------------------------------------------------------------------------
        */

        let paymentStatus;


        switch (event) {

            case "payment.authorized":

                paymentStatus =
                    "authorized";

                break;


            case "payment.captured":

                paymentStatus =
                    "captured";

                break;


            case "order.paid":

                paymentStatus =
                    "captured";

                break;


            case "payment.failed":

                paymentStatus =
                    "failed";

                break;


            default:

                paymentStatus =
                    paymentEntity.status;

        }


        /*
        |--------------------------------------------------------------------------
        | 9. Determine Payment Mode
        |--------------------------------------------------------------------------
        */

        let paymentMode = paymentEntity.method;


        /*
        |--------------------------------------------------------------------------
        | Razorpay → Our Enum Mapping
        |--------------------------------------------------------------------------
        */

        const paymentModeMap = {

            upi:
                "upi",

            card:
                "card",

            netbanking:
                "netbanking",

            wallet:
                "wallet",

            emi:
                "emi"

        };


        paymentMode =
            paymentModeMap[
            paymentEntity.method
            ] || undefined;


        /*
        |--------------------------------------------------------------------------
        | 10. Update Payment Details
        |--------------------------------------------------------------------------
        */

        planPurchase.payment = {

            ...(
                planPurchase.payment?.toObject ? planPurchase.payment.toObject() : planPurchase.payment
            ),


            razorpay_order_id:
                paymentEntity.order_id,


            razorpay_payment_id:
                paymentEntity.id,


            method:
                paymentEntity.method,


            amount:
                paymentEntity.amount,


            currency:
                paymentEntity.currency,


            status:
                paymentEntity.status,


            captured:
                paymentEntity.captured,


            fee:
                paymentEntity.fee,


            tax:
                paymentEntity.tax,


            vpa:
                paymentEntity.vpa,


            bank:
                paymentEntity.bank,


            wallet:
                paymentEntity.wallet,


            email:
                paymentEntity.email,


            contact:
                paymentEntity.contact,


            acquirer_data:
                paymentEntity.acquirer_data,


            raw:
                paymentEntity

        };


        /*
        |--------------------------------------------------------------------------
        | 11. Update Payment Status
        |--------------------------------------------------------------------------
        */

        planPurchase.payment_status = paymentStatus;


        /*
        |--------------------------------------------------------------------------
        | 12. Update Payment Mode
        |--------------------------------------------------------------------------
        */

        if (paymentMode) {

            planPurchase.payment_mode = paymentMode;

        }


        /*
        |--------------------------------------------------------------------------
        | 13. Payment Captured
        |--------------------------------------------------------------------------
        */

        if (paymentStatus === "captured") {

            /*
            |--------------------------------------------------------------------------
            | Payment successful
            |--------------------------------------------------------------------------
            */

            planPurchase.status = "active";


            /*
            |--------------------------------------------------------------------------
            | Start Date
            |--------------------------------------------------------------------------
            */

            if (
                !planPurchase.startDate
            ) {

                planPurchase.startDate = new Date();

            }


            /*
            |--------------------------------------------------------------------------
            | End Date
            |--------------------------------------------------------------------------
            */

            if (
                !planPurchase.endDate &&
                planPurchase.plan
                    ?.durationMonths
            ) {

                const endDate = new Date();

                endDate.setMonth(
                    endDate.getMonth() +
                    planPurchase.plan.durationMonths
                );

                planPurchase.endDate =
                    endDate;

            }

        }


        /*
        |--------------------------------------------------------------------------
        | 14. Payment Failed
        |--------------------------------------------------------------------------
        */

        if (
            paymentStatus ===
            "failed"
        ) {

            planPurchase.status =
                "pending_payment";

        }


        /*
        |--------------------------------------------------------------------------
        | 15. Save
        |--------------------------------------------------------------------------
        */

        await planPurchase.save();


        console.log(
            "✅ Plan Purchase Payment Updated:",
            {
                purchase_id:
                    planPurchase.purchase_id,

                razorpay_order_id:
                    razorpayOrderId,

                razorpay_payment_id:
                    paymentEntity.id,

                payment_status:
                    planPurchase.payment_status,

                payment_mode:
                    planPurchase.payment_mode

            }
        );

    }


    /*
    |--------------------------------------------------------------------------
    | 16. Other Events
    |--------------------------------------------------------------------------
    */

    else {

        console.log(
            `ℹ️ Unhandled Razorpay event: ${event}`
        );

    }


    /*
    |--------------------------------------------------------------------------
    | 17. Response
    |--------------------------------------------------------------------------
    */

    return res.status(200).json({

        success: true,

        message:
            "Webhook processed successfully"

    });

}
);

const getmyPlanPurchases = asyncHandler(async (req, res) => {

    const { id } = req.user || {};

    if (!id) {

        throw new UnauthorizedError(
            "User authentication required"
        );

    }

    // ─────────────────────────────────────
    // 2. Get User
    // ─────────────────────────────────────

    const user = await User.findById(id).select("_id");

    if (!user) {

        throw new NotFoundError(
            "User not found"
        );

    }

    // ─────────────────────────────────────
    // 3. Find Plan Purchases
    // ─────────────────────────────────────

    const planPurchases = await PurchaseplanDetails.find({
        userId: user._id
    })
        .select("-shipping_address -billing_address -payment")
        .populate({
            path: "deliveries.orderId",
            select: "order_status -_id"
        })
        .sort({ createdAt: -1 });

    return res.status(200).json({

        success: true,

        message:
            "Plan purchases retrieved successfully",

        purchases:
            planPurchases

    });
});

const retryplanPurchasePayment = asyncHandler(async (req, res) => {
    try {
        const { purchase_id } = req.body;

        // ----------------------------------------
        // 1. Validate purchase ID
        // ----------------------------------------
        if (!purchase_id) {
            return res.status(400).json({
                success: false,
                message: "Purchase ID is required"
            });
        }

        // ----------------------------------------
        // 2. Get user ID from authentication token
        // ----------------------------------------
        const userId = req.user.id;

        // ----------------------------------------
        // 3. Find purchase plan
        // ----------------------------------------
        const purchasePlan = await PurchaseplanDetails.findOne({
            _id: purchase_id,
            userId
        });

        if (!purchasePlan) {
            return res.status(404).json({
                success: false,
                message: "Purchase plan not found"
            });
        }

        // ----------------------------------------
        // 4. Payment must be failed
        // ----------------------------------------
        if (purchasePlan.payment_status !== "failed") {
            return res.status(400).json({
                success: false,
                message: `Payment retry is not allowed. Current payment status is ${purchasePlan.payment_status}`
            });
        }

        // ----------------------------------------
        // 5. Purchase must be pending payment
        // ----------------------------------------
        if (purchasePlan.status !== "pending_payment") {
            return res.status(400).json({
                success: false,
                message: `Payment retry is not allowed for purchase with status ${purchasePlan.status}`
            });
        }

        // ----------------------------------------
        // 6. Get Razorpay Order ID
        // ----------------------------------------
        const razorpayOrderId =
            purchasePlan.payment?.razorpay_order_id;

        if (!razorpayOrderId) {
            return res.status(400).json({
                success: false,
                message: "Razorpay order ID not found"
            });
        }

        // ----------------------------------------
        // 7. Fetch Razorpay Order
        // ----------------------------------------
        const razorpayOrder =
            await razorpay.orders.fetch(razorpayOrderId);

        if (!razorpayOrder) {
            return res.status(400).json({
                success: false,
                message: "Unable to fetch Razorpay order"
            });
        }

        // ----------------------------------------
        // 8. Verify payment amount
        // ----------------------------------------
        const expectedAmount =
            Math.round(Number(purchasePlan.finalAmount) * 100);

        if (Number(razorpayOrder.amount) !== expectedAmount) {
            return res.status(400).json({
                success: false,
                message: "Payment amount mismatch"
            });
        }

        // ----------------------------------------
        // 9. Check Razorpay order status
        // ----------------------------------------
        if (razorpayOrder.status === "paid") {
            return res.status(400).json({
                success: false,
                message: "This payment has already been completed"
            });
        }

        if (
            razorpayOrder.status !== "created" &&
            razorpayOrder.status !== "attempted"
        ) {
            return res.status(400).json({
                success: false,
                message:
                    `Payment cannot be retried. Razorpay order status is ${razorpayOrder.status}`
            });
        }

        // ----------------------------------------
        // 10. Return Razorpay order details
        // ----------------------------------------
        return res.status(200).json({
            success: true,
            message: "Payment retry is available",
            data: {
                purchase_id: purchasePlan.purchase_id,
                plan_purchase_id: purchasePlan._id,
                planId: purchasePlan.planId,

                razorpay_order_id: razorpayOrder.id,

                amount: razorpayOrder.amount,
                currency: razorpayOrder.currency,

                key_id: process.env.RAZORPAY_KEY_ID,

                customer: {
                    name: purchasePlan.customer?.name || "",
                    email: purchasePlan.customer?.email || "",
                    mobile: purchasePlan.customer?.mobile || ""
                },

                plan: {
                    name: purchasePlan.plan?.name || "",
                    image: purchasePlan.plan?.image || ""
                }
            }
        });

    } catch (error) {
        console.error(
            "Retry Plan Purchase Payment Error:",
            error?.error || error
        );

        return res.status(500).json({
            success: false,
            message: "Unable to retry plan purchase payment",
            error:
                error?.error?.description ||
                error.message
        });
    }
});

const getUserAddress = asyncHandler(async (req, res) => {
    const { id, role } = req.user

    if (!id) {
        throw new UnauthorizedError(
            "User authentication required"
        );
    }

    if (role !== "user") {
        throw new ForbiddenError(
            "Access denied. Only users can access this endpoint"
        );
    }

    const addresses = await ShippingAddress.find({ user_id: id })
        .sort({ createdAt: -1 })
        .lean()

    if (!addresses.length) {
        return res.status(200).json({
            success: true,
            message: 'No shipping address available',
            data: [],
        })
    }

    return res.status(200).json({
        success: true,
        message: 'Shipping addresses fetched successfully',
        count: addresses.length,
        data: addresses,
    })
});


module.exports = { checkoutPlan, razorpayWebhooks, getmyPlanPurchases, retryplanPurchasePayment, getUserAddress }