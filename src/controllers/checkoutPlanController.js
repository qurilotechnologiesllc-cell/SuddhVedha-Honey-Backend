
const crypto = require("crypto");
const mongoose = require('mongoose')
const User = require("../models/user.model")
const Plan = require('../models/plans.models')
const PurchaseplanDetails = require('../models/purchaseplan.model')
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

    const planPurchase =
        await PurchaseplanDetails.create({

            purchase_id,

            userId: user._id,

            planId: plan._id,


            // ─────────────────────────────
            // Plan Snapshot
            // ─────────────────────────────

            plan: {

                name:
                    plan.name,

                plan_image:
                    plan.image,

                packageLabel:
                    plan.packageLabel,

                quantityPerJar:
                    plan.quantityPerJar,

                quantityUnit:
                    plan.quantityUnit,

                numberOfJars:
                    plan.numberOfJars,

                totalQuantity:
                    plan.totalQuantity,

                totalQuantityUnit:
                    plan.totalQuantityUnit,

                idealFor:
                    plan.idealFor,

                price:
                    plan.price,

                originalPrice:
                    plan.originalPrice,

                discountPercentage:
                    plan.discountPercentage,

                currency:
                    plan.currency,

                badge:
                    plan.badge,

                isPopular:
                    plan.isPopular,

                durationMonths:
                    plan.durationMonths,

                deliveriesPerMonth:
                    plan.deliveriesPerMonth,

                jarsPerDelivery:
                    plan.jarsPerDelivery

            },


            // ─────────────────────────────
            // Customer
            // ─────────────────────────────

            customer: {

                name:
                    customer.name,

                mobile:
                    customer.mobile,

                email:
                    customer.email || ""

            },


            // ─────────────────────────────
            // Address
            // ─────────────────────────────

            shipping_address,

            billing_address,


            // ─────────────────────────────
            // Amount
            // ─────────────────────────────

            finalAmount,

            currency:
                plan.currency || "INR",


            // ─────────────────────────────
            // Payment
            // ─────────────────────────────

            payment_status: "pending",

            payment: {},


            status: "pending_payment",

            totalDeliveries: plan.durationMonths * plan.deliveriesPerMonth,

            completedDeliveries: 0,

            currentDeliveryNumber: 0

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

            console.error(
                "❌ Plan purchase not found:",
                razorpayOrderId
            );

            /*
            |--------------------------------------------------------------------------
            | Important:
            |--------------------------------------------------------------------------
            | Webhook valid hai but hamare database
            | mein matching purchase nahi mila.
            |
            */

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

    const planPurchases =
        await PurchaseplanDetails.find({

            userId: user._id

        }).select('-shipping_address -billing_address -payment').sort({ createdAt: -1 });

    return res.status(200).json({

        success: true,

        message:
            "Plan purchases retrieved successfully",

        purchases:
            planPurchases

    });
});


module.exports = { checkoutPlan, razorpayWebhooks, getmyPlanPurchases }