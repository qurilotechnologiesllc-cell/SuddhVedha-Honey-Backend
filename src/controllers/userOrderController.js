const Order = require('../models/orders.model');
const Ordergroup = require('../models/orderGoup.model')
const User = require('../models/user.model')
const Offers = require('../models/offer.model')
const CouponUsage = require('../models/couponUsage.model')
const ProductVariant = require('../models/productVariant.model')
const VelocitySchema = require('../models/velocityOrder.model')
const crypto = require('crypto')
const razorpay = require('../utils/razorpay')
const validateOrderItems = require('../errors/ordervalidation')
const removeOrderedItemsFromCart = require('../services/removeOrderedItemsFromCart.service');
const { checkStockBeforeOrder, updateStockAfterOrder } = require('../services/stockService');
const updateOrderGroupAndOrders = require('../services/updateOrderGroupAndOrders');
const { getIO, ADMIN_ROOM } = require('../utils/socketHandler');
const updateOrderGroupRefundSummary = require('../helpers/updateOrderGroupRefundSummary')

const { asyncHandler, BadRequestError, UnauthorizedError, ForbiddenError, NotFoundError, ConflictError, ValidationError } = require('../errors/errorConfig')


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

const generateOrderId = () => {
    const date = new Date()
    const yyyy = date.getUTCFullYear()
    const mm = String(date.getUTCMonth() + 1).padStart(2, '0')
    const dd = String(date.getUTCDate()).padStart(2, '0')
    const random = crypto.randomBytes(4).toString('hex').toUpperCase()

    return `SV - ${yyyy}${mm}${dd} -${random}`
}

const createOrderByUser = asyncHandler(async (req, res) => {

    const { id } = req.user || {};

    /*
    |--------------------------------------------------------------------------
    | 1. Authenticate User
    |--------------------------------------------------------------------------
    */

    if (!id) {
        throw new UnauthorizedError(
            "User authentication required"
        );
    }


    /*
    |--------------------------------------------------------------------------
    | 2. Find User
    |--------------------------------------------------------------------------
    */

    const user = await User.findById(id).select("_id");

    if (!user) {
        throw new NotFoundError(
            "User not found"
        );
    }


    /*
    |--------------------------------------------------------------------------
    | 3. Request Data
    |--------------------------------------------------------------------------
    */

    const {
        items,
        finalAmount,
        couponCode,
        shipping_address,
        billing_address,
        payment_mode,
        customer_note
    } = req.body;


    /*
    |--------------------------------------------------------------------------
    | 4. Validate Items
    |--------------------------------------------------------------------------
    |
    | Single item:
    | [NORMAL]
    |
    | Multiple:
    | [NORMAL, CUSTOM]
    |
    */

    validateOrderItems(items);

    await checkStockBeforeOrder(items);

    /*
    |--------------------------------------------------------------------------
    | 5. Validate Final Amount
    |--------------------------------------------------------------------------
    */

    if (
        typeof finalAmount !== "number" ||
        !Number.isFinite(finalAmount) ||
        finalAmount < 0
    ) {
        throw new BadRequestError(
            "Valid finalAmount is required"
        );
    }


    const calculatedAmount =
        items.reduce(
            (total, item) => {

                return (
                    total +
                    Number(
                        item.product_details.totalAmount
                    )
                );

            },
            0
        );


    let couponDiscount = 0;
    let appliedCoupon = null;
    let couponUsage = null;


    /*
    |--------------------------------------------------------------------------
    | 7. Coupon Validation & Discount Calculation
    |--------------------------------------------------------------------------
    |
    | Coupon agar hai to pehle coupon discount calculate hoga.
    |
    */

    if (couponCode) {

        const normalizedCouponCode =
            couponCode
                .trim()
                .toUpperCase();


        /*
        |--------------------------------------------------------------------------
        | Find Offer
        |--------------------------------------------------------------------------
        */

        const offer =
            await Offers.findOne({

                couponCode:
                    normalizedCouponCode,

                isActive:
                    true

            });


        if (!offer) {

            throw new BadRequestError(
                "Invalid or inactive coupon code"
            );

        }


        /*
        |--------------------------------------------------------------------------
        | Check User Coupon Usage
        |--------------------------------------------------------------------------
        */

        couponUsage =
            await CouponUsage.findOne({

                userId:
                    user._id,

                offerId:
                    offer._id,

                isApplied:
                    true,

                isAvailable:
                    true

            });


        if (!couponUsage) {

            throw new BadRequestError(
                "Coupon has not been applied"
            );

        }


        /*
        |--------------------------------------------------------------------------
        | Calculate Coupon Discount
        |--------------------------------------------------------------------------
        */

        if (
            offer.discountType ===
            "PERCENTAGE"
        ) {

            couponDiscount =
                (
                    calculatedAmount *
                    offer.discountValue
                ) / 100;

        }

        else if (
            offer.discountType ===
            "FLAT"
        ) {

            couponDiscount =
                offer.discountValue;

        }

        else {

            throw new BadRequestError(
                "Invalid coupon discount type"
            );

        }


        /*
        |--------------------------------------------------------------------------
        | Prevent Negative Amount
        |--------------------------------------------------------------------------
        */

        couponDiscount =
            Math.min(
                couponDiscount,
                calculatedAmount
            );


        /*
        |--------------------------------------------------------------------------
        | Round Coupon Discount
        |--------------------------------------------------------------------------
        */

        couponDiscount =
            Math.round(
                couponDiscount * 100
            ) / 100;

    }


    /*
    |--------------------------------------------------------------------------
    | 8. Calculate Amount After Coupon
    |--------------------------------------------------------------------------
    |
    | Coupon hai:
    |
    | calculatedAmount - couponDiscount
    |
    | Coupon nahi hai:
    |
    | calculatedAmount
    |
    */

    const amountAfterCoupon =
        Math.round(
            (
                calculatedAmount -
                couponDiscount
            ) * 100
        ) / 100;


    /*
    |--------------------------------------------------------------------------
    | 9. Add COD Charge
    |--------------------------------------------------------------------------
    |
    | COD → 25% extra
    |
    | Online → No extra charge
    |
    */

    let codCharge = 0;

    let expectedFinalAmount =
        amountAfterCoupon;


    if (payment_mode === "cod") {

        codCharge =
            Math.round(
                amountAfterCoupon * 0.25 * 100
            ) / 100;


        expectedFinalAmount =
            Math.round(
                (
                    amountAfterCoupon +
                    codCharge
                ) * 100
            ) / 100;

    }


    /*
    |--------------------------------------------------------------------------
    | 10. Validate Frontend Final Amount
    |--------------------------------------------------------------------------
    */

    if (
        Math.round(finalAmount * 100) !==
        Math.round(expectedFinalAmount * 100)
    ) {

        throw new BadRequestError(

            `Final amount mismatch. Expected: ${expectedFinalAmount}, Received: ${finalAmount}`

        );

    }

    if (couponCode) {

        const offer =
            await Offers.findOne({

                couponCode:
                    couponCode
                        .trim()
                        .toUpperCase(),

                isActive:
                    true

            });


        appliedCoupon = {

            offerId:
                offer._id,

            couponCode:
                offer.couponCode,

            discountType:
                offer.discountType,

            discountValue:
                offer.discountValue,

            discountAmount:
                couponDiscount

        };

    }




    /*
    |--------------------------------------------------------------------------
    | 8. Validate Shipping Address
    |--------------------------------------------------------------------------
    */

    if (
        !shipping_address ||
        typeof shipping_address !== "object" ||
        Array.isArray(shipping_address)
    ) {
        throw new BadRequestError(
            "Shipping address is required"
        );
    }


    /*
    |--------------------------------------------------------------------------
    | 9. Validate Billing Address
    |--------------------------------------------------------------------------
    */

    if (
        !billing_address ||
        typeof billing_address !== "object" ||
        Array.isArray(billing_address)
    ) {
        throw new BadRequestError(
            "Billing address is required"
        );
    }


    /*
    |--------------------------------------------------------------------------
    | 10. Validate Payment Mode
    |--------------------------------------------------------------------------
    */

    const allowedPaymentModes = [
        "upi",
        "card",
        "net_banking",
        "wallet",
        "cod"
    ];


    if (!payment_mode) {
        throw new BadRequestError(
            "Payment mode is required"
        );
    }


    if (
        !allowedPaymentModes.includes(
            payment_mode
        )
    ) {
        throw new BadRequestError(
            `Invalid payment mode: ${payment_mode}`
        );
    }


    /*
    |--------------------------------------------------------------------------
    | 11. Generate Group ID
    |--------------------------------------------------------------------------
    */

    const group_id = generateOrderGroupId();


    /*
    |--------------------------------------------------------------------------
    | 12. Create OrderGroup
    |--------------------------------------------------------------------------
    |
    | Abhi group create hoga.
    |
    */

    const orderGroup = await Ordergroup.create({

        group_id,

        userId: user._id,

        orderIds: [],

        cod_amount: codCharge,

        totalAmount: calculatedAmount,

        coupon:
            appliedCoupon || {

                offerId: null,

                couponCode: null,

                discountType: null,

                discountValue: 0,

                discountAmount: 0

            },

        finalAmount: finalAmount,

        payment_mode,

        payment_status:
            "pending",

        payment: {}

    });

    if (couponUsage) {

        couponUsage.orderId =
            orderGroup._id;

        couponUsage.isApplied =
            true;

        couponUsage.isAvailable =
            false;

        await couponUsage.save();

    }


    /*
    |--------------------------------------------------------------------------
    | 13. COD
    |--------------------------------------------------------------------------
    */

    if (payment_mode === "cod") {

        const createdOrders = [];


        /*
        |--------------------------------------------------------------------------
        | Create Individual Orders
        |--------------------------------------------------------------------------
        */

        for (const item of items) {

            const order =
                await Order.create({

                    order_group_id:
                        orderGroup._id,

                    order_id:
                        generateOrderId(),

                    userId:
                        user._id,

                    items: [item],

                    totalAmount:
                        item.product_details.totalAmount,

                    shipping_address,

                    billing_address,

                    payment_mode,

                    payment_status:
                        "pending",

                    payment: {},

                    order_status:
                        "processing",

                    inventory_status:
                        "reserved",

                    customer_note:
                        customer_note || ""

                });


            createdOrders.push(order);


            /*
            |--------------------------------------------------------------------------
            | Remove Item From Cart
            |--------------------------------------------------------------------------
            */

            await removeOrderedItemsFromCart(
                user._id,
                [item]
            );


            /*
            |--------------------------------------------------------------------------
            | Update / Reserve Stock
            |--------------------------------------------------------------------------
            */

            await updateStockAfterOrder(
                order.items
            );

        }


        /*
        |--------------------------------------------------------------------------
        | Save Order IDs Into Group
        |--------------------------------------------------------------------------
        */

        const orderIds = createdOrders.map(order => order._id);


        orderGroup.orderIds = orderIds;


        await orderGroup.save();


        /*
        |--------------------------------------------------------------------------
        | COD Response
        |--------------------------------------------------------------------------
        */

        const io = getIO();

        io.to(ADMIN_ROOM).emit("new-order", {

            title: "New COD Order Placed",

            message: `Order group ${orderGroup.group_id} has been placed.`,

            userName: user.name || "Unknown User",

            userMobile: user.mobile || "Unknown Mobile",

            finalAmount: orderGroup.finalAmount,

            cod_amount: orderGroup.cod_amount,

            orderIds: orderGroup.orderIds,

            orderDate: new Date().toLocaleString(),

            orderdetails: createdOrders.map(order => ({
                _id: order._id,
                order_id: order.order_id,
                payment_mode: order.payment_mode,
                payment_status: order.payment_status,
                order_status: order.order_status,
                items: order.items
            }))
        });

        return res.status(201).json({

            success: true,

            message:
                "COD order group created successfully",

            payment_required:
                false,

            group: {

                _id:
                    orderGroup._id,

                group_id:
                    orderGroup.group_id,

                finalAmount:
                    orderGroup.finalAmount,

                payment_mode:
                    orderGroup.payment_mode,

                payment_status:
                    orderGroup.payment_status,

                orderIds

            },

            orders:
                createdOrders.map(
                    order => ({

                        _id:
                            order._id,

                        order_id:
                            order.order_id,

                        totalAmount:
                            order.totalAmount,

                        payment_status:
                            order.payment_status,

                        order_status:
                            order.order_status

                    })
                )

        });

    }


    /*
    |--------------------------------------------------------------------------
    | 14. Razorpay Amount
    |--------------------------------------------------------------------------
    */

    const razorpayAmount = Math.round(finalAmount * 100);


    /*
    |--------------------------------------------------------------------------
    | 15. Create ONE Razorpay Order
    |--------------------------------------------------------------------------
    |
    | Chahe 1 item ho ya 10 items,
    | Razorpay par sirf ONE order.
    |
    */

    const razorpayOrder = await razorpay.orders.create({

        amount:
            razorpayAmount,

        currency:
            "INR",

        receipt:
            group_id,

        notes: {

            user_id:
                String(user._id),

            order_group_id:
                String(orderGroup._id),

            group_id

        },

        partial_payment:
            false

    });


    /*
    |--------------------------------------------------------------------------
    | 16. Update OrderGroup With Razorpay Details
    |--------------------------------------------------------------------------
    */

    orderGroup.payment = {

        razorpay_order_id:
            razorpayOrder.id

    };


    await orderGroup.save();


    /*
    |--------------------------------------------------------------------------
    | 17. Create Individual Orders
    |--------------------------------------------------------------------------
    */

    const createdOrders = [];


    for (const item of items) {

        const order =
            await Order.create({

                order_group_id:
                    orderGroup._id,

                order_id:
                    generateOrderId(),

                userId:
                    user._id,

                items: [item],

                totalAmount:
                    item.product_details.totalAmount,

                shipping_address,

                billing_address,

                payment_mode,

                payment_status:
                    "pending",

                order_status:
                    "processing",

                inventory_status:
                    "reserved",

                customer_note:
                    customer_note || ""

            });


        createdOrders.push(order);


        /*
        |--------------------------------------------------------------------------
        | Remove Item From Cart
        |--------------------------------------------------------------------------
        */

        await removeOrderedItemsFromCart(
            user._id,
            [item]
        );


        /*
        |--------------------------------------------------------------------------
        | Update / Reserve Stock
        |--------------------------------------------------------------------------
        */

        await updateStockAfterOrder(
            order.items
        );

    }


    /*
    |--------------------------------------------------------------------------
    | 18. Add Order IDs To OrderGroup
    |--------------------------------------------------------------------------
    */

    orderGroup.orderIds =
        createdOrders.map(
            order => order._id
        );


    await orderGroup.save();

    const io = getIO();

    io.to(ADMIN_ROOM).emit("new-order", {

        title: "New Order Placed",

        message: `Order group ${orderGroup.group_id} has been placed.`,

        userName: user.name || "Unknown User",

        userMobile: user.mobile || "Unknown Mobile",

        finalAmount: orderGroup.finalAmount,

        cod_amount: orderGroup.cod_amount || 0,

        orderIds: orderGroup.orderIds,

        orderDate: new Date().toLocaleString(),

        orderdetails: createdOrders.map(order => ({
            _id: order._id,
            order_id: order.order_id,
            payment_mode: order.payment_mode,
            payment_status: order.payment_status,
            order_status: order.order_status,
            items: order.items
        }))
    })


    /*
    |--------------------------------------------------------------------------
    | 19. Response
    |--------------------------------------------------------------------------
    */

    return res.status(201).json({

        success: true,

        message:
            "Order group and Razorpay order created successfully",

        payment_required:
            true,

        group: {

            _id:
                orderGroup._id,

            group_id:
                orderGroup.group_id,

            finalAmount:
                orderGroup.finalAmount,

            payment_mode:
                orderGroup.payment_mode,

            payment_status:
                orderGroup.payment_status,

            orderIds:
                orderGroup.orderIds,

            payment:
                orderGroup.payment

        },

        orders:
            createdOrders.map(
                order => ({

                    _id:
                        order._id,

                    order_id:
                        order.order_id,

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

                })
            ),

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

const getMyordersDetails = asyncHandler(async (req, res) => {
    const { id } = req.user

    // ─── Orders Fetch karo userId se ─────────────
    const orders = await Order.find({ userId: id })
        .select(
            'order_id order_group_id items finalAmount shipping_address payment_mode payment_status order_status createdAt'
        )
        .sort({ createdAt: -1 }) // ← Latest pehle

    if (!orders.length) {
        return res.status(200).json({
            success: true,
            message: 'No orders found',
            totalOrders: 0,
            data: []
        })
    }

    // ─── Response Format karo ─────────────────────
    const formattedOrders = orders.map(order => ({

        // ── Order Info ────────────────────────────
        _id: order._id,
        order_group_id: order.order_group_id,
        order_id: order.order_id,
        order_status: order.order_status,
        order_date: order.createdAt,

        // ── Items ─────────────────────────────────
        items: order.items.map(item => ({
            type: item.type,
            quantity: item.quantity,

            // Normal Product
            ...(item.type === 'NORMAL' && {
                product_name: item.product_details?.product?.product_name,
                brand: item.product_details?.product?.brand,
                image: item.product_details?.product?.image,
                variant: {
                    weight: item.product_details?.product?.variant?.weight,
                    price: item.product_details?.product?.variant?.price,
                    mrp: item.product_details?.product?.variant?.mrp
                },
                amount: item.product_details?.totalAmount
            }),

            // Custom Gift Box
            ...(item.type === 'CUSTOM' && {
                gift_box: item.product_details?.giftBox?.name,
                box_image: item.product_details?.giftBox?.image,
                products: item.product_details?.products,
                amount: item.product_details?.totalAmount
            }),

            ...(item.type === 'PLAN' && {
                product_name: item.product_details?.product?.product_name,
                brand: item.product_details?.product?.brand,
                image: item.product_details?.product?.image,
                variant: {
                    weight: item.product_details?.product?.variant?.weight,
                    price: item.product_details?.product?.variant?.price,
                    mrp: item.product_details?.product?.variant?.mrp
                },
                amount: item.product_details?.totalAmount
            })
        })),

        // ── Payment ───────────────────────────────
        payment: {
            mode: order.payment_mode,
            status: order.payment_status,
            amount: order.finalAmount
        },

        // ── Shipping Address ──────────────────────
        shipping_address: {
            full_name: order.shipping_address?.full_name,
            phone: order.shipping_address?.phone,
            address_line1: order.shipping_address?.address_line1,
            address_line2: order.shipping_address?.address_line2,
            city: order.shipping_address?.city,
            state: order.shipping_address?.state,
            pincode: order.shipping_address?.pincode,
            country: order.shipping_address?.country
        }
    }))

    res.status(200).json({
        success: true,
        message: 'Orders fetched successfully',
        totalOrders: formattedOrders.length,
        data: formattedOrders
    })
})

const razorpayWebhooks = asyncHandler(async (req, res) => {

    const webhookSignature = req.headers["x-razorpay-signature"];

    if (!webhookSignature) {
        return res.status(400).json({
            success: false,
            message: "Razorpay webhook signature missing"
        });
    }


    // IMPORTANT:
    // Original raw request body
    const rawBody = req.rawBody;



    if (!rawBody) {
        return res.status(400).json({
            success: false,
            message: "Raw webhook body not available"
        });
    }


    // Signature verification
    const expectedSignature =
        crypto
            .createHmac(
                "sha256",
                process.env.RAZORPAY_WEBHOOK_SECRET
            )
            .update(rawBody)
            .digest("hex");


    const isValidSignature =
        expectedSignature.length ===
        webhookSignature.length &&
        crypto.timingSafeEqual(
            Buffer.from(expectedSignature),
            Buffer.from(webhookSignature)
        );


    if (!isValidSignature) {

        console.error(
            "❌ Invalid Razorpay webhook signature"
        );

        return res.status(400).json({
            success: false,
            message: "Invalid Razorpay webhook signature"
        });

    }

    // Parse ONLY after signature verification
    const webhookData =
        JSON.parse(
            rawBody.toString("utf8")
        );


    console.log(
        "Webhook Data:",
        webhookData
    );


    const event = webhookData.event;


    console.log(webhookData?.payload?.payment?.entity)

    /*
    |--------------------------------------------------------------------------
    | 8. PAYMENT AUTHORIZED
    |--------------------------------------------------------------------------
    */

    switch (event) {


        case "payment.authorized": {

            const payment =
                webhookData
                    ?.payload
                    ?.payment
                    ?.entity;


            if (!payment) {
                break;
            }


            /*
            |--------------------------------------------------------------------------
            | Find OrderGroup
            |--------------------------------------------------------------------------
            */

            const razorpayOrderId = payment.order_id;


            const orderGroup =
                await Ordergroup.findOne({

                    "payment.razorpay_order_id":
                        razorpayOrderId

                });


            if (!orderGroup) {

                console.error(
                    "OrderGroup not found:",
                    razorpayOrderId
                );

                break;

            }


            /*
            |--------------------------------------------------------------------------
            | Update Group + All Orders
            |--------------------------------------------------------------------------
            */

            await updateOrderGroupAndOrders({

                orderGroup,

                orderStatus:
                    "processing",

                paymentStatus: payment.status,

                paymentData: {

                    razorpay_order_id:
                        razorpayOrderId,

                    razorpay_payment_id:
                        payment.id,

                    method:
                        payment.method,

                    amount:
                        payment.amount,

                    currency:
                        payment.currency,

                    status:
                        payment.status

                }

            });


            console.log(
                `Payment authorized: ${orderGroup.group_id}`
            );


            break;
        }


        /*
        |--------------------------------------------------------------------------
        | PAYMENT CAPTURED
        |--------------------------------------------------------------------------
        */

        case "payment.captured": {

            const payment =
                webhookData
                    ?.payload
                    ?.payment
                    ?.entity;


            if (!payment) {
                break;
            }


            /*
            |--------------------------------------------------------------------------
            | Find OrderGroup
            |--------------------------------------------------------------------------
            */

            const razorpayOrderId =
                payment.order_id;


            const orderGroup =
                await Ordergroup.findOne({

                    "payment.razorpay_order_id":
                        razorpayOrderId

                });


            if (!orderGroup) {

                console.error(
                    "OrderGroup not found:",
                    razorpayOrderId
                );

                break;

            }


            /*
            |--------------------------------------------------------------------------
            | Validate Total Payment
            |--------------------------------------------------------------------------
            */

            const expectedAmount =
                Math.round(
                    orderGroup.totalAmount * 100
                );


            if (
                payment.amount !==
                expectedAmount
            ) {

                console.error(
                    "Payment amount mismatch",
                    {

                        group_id:
                            orderGroup.group_id,

                        expected:
                            expectedAmount,

                        received:
                            payment.amount

                    }
                );

                break;

            }


            /*
            |--------------------------------------------------------------------------
            | Update Group + All Orders
            |--------------------------------------------------------------------------
            */

            await updateOrderGroupAndOrders({

                orderGroup,

                orderStatus:
                    "processing",

                paymentStatus: payment.status,

                paymentData: {

                    razorpay_order_id:
                        razorpayOrderId,

                    razorpay_payment_id:
                        payment.id,

                    method:
                        payment.method,

                    amount:
                        payment.amount,

                    currency:
                        payment.currency,

                    status:
                        payment.status,

                    captured:
                        payment.captured,

                    email:
                        payment.email,

                    contact:
                        payment.contact,

                    bank:
                        payment.bank,

                    wallet:
                        payment.wallet,

                    vpa:
                        payment.vpa,

                    fee:
                        payment.fee,

                    tax:
                        payment.tax,

                    acquirer_data:
                        payment.acquirer_data

                }

            });


            console.log(
                `Payment captured: ${orderGroup.group_id}`
            );


            break;
        }


        /*
        |--------------------------------------------------------------------------
        | PAYMENT FAILED
        |--------------------------------------------------------------------------
        */

        case "payment.failed": {

            const payment =
                webhookData
                    ?.payload
                    ?.payment
                    ?.entity;


            if (!payment) {
                break;
            }


            /*
            |--------------------------------------------------------------------------
            | Find OrderGroup
            |--------------------------------------------------------------------------
            */

            const razorpayOrderId =
                payment.order_id;


            const orderGroup =
                await Ordergroup.findOne({

                    "payment.razorpay_order_id":
                        razorpayOrderId

                });


            if (!orderGroup) {

                console.error(
                    "OrderGroup not found:",
                    razorpayOrderId
                );

                break;

            }


            /*
            |--------------------------------------------------------------------------
            | Update Group + All Orders
            |--------------------------------------------------------------------------
            */

            await updateOrderGroupAndOrders({

                orderGroup,

                orderStatus:
                    "processing",

                paymentStatus: payment.status,

                paymentData: {

                    razorpay_order_id:
                        razorpayOrderId,

                    razorpay_payment_id:
                        payment.id,

                    method:
                        payment.method,

                    amount:
                        payment.amount,

                    currency:
                        payment.currency,

                    status:
                        payment.status,

                    error_code:
                        payment.error_code,

                    error_description:
                        payment.error_description,

                    error_source:
                        payment.error_source,

                    error_step:
                        payment.error_step,

                    error_reason:
                        payment.error_reason

                }

            });


            console.log(
                `Payment failed: ${orderGroup.group_id}`
            );


            break;
        }


        /*
        |--------------------------------------------------------------------------
        | ORDER PAID
        |--------------------------------------------------------------------------
        */

        case "order.paid": {

            const razorpayOrder =
                webhookData
                    ?.payload
                    ?.order
                    ?.entity;


            if (!razorpayOrder) {
                break;
            }


            /*
            |--------------------------------------------------------------------------
            | Find OrderGroup
            |--------------------------------------------------------------------------
            */

            const razorpayOrderId =
                razorpayOrder.id;


            const orderGroup =
                await Ordergroup.findOne({

                    "payment.razorpay_order_id":
                        razorpayOrderId

                });


            if (!orderGroup) {

                console.error(
                    "OrderGroup not found:",
                    razorpayOrderId
                );

                break;

            }


            /*
            |--------------------------------------------------------------------------
            | Amount Validation
            |--------------------------------------------------------------------------
            */

            const expectedAmount =
                Math.round(
                    orderGroup.totalAmount * 100
                );


            if (
                razorpayOrder.amount !==
                expectedAmount
            ) {

                console.error(
                    "Order paid amount mismatch",
                    {

                        group_id:
                            orderGroup.group_id,

                        expected:
                            expectedAmount,

                        received:
                            razorpayOrder.amount

                    }
                );

                break;

            }


            /*
            |--------------------------------------------------------------------------
            | Update Group + All Orders
            |--------------------------------------------------------------------------
            |
            | order.paid payload mein payment entity
            | ke saare details necessarily nahi milte.
            |
            | Isliye jo payment details pehle
            | payment.captured mein save ho chuki hain,
            | unhe preserve karenge.
            |
            */

            await updateOrderGroupAndOrders({

                orderGroup,

                orderStatus:
                    "processing",

                paymentStatus: razorpayOrder.status,

                paymentData: {

                    razorpay_order_id:
                        razorpayOrderId,

                    amount:
                        razorpayOrder.amount,

                    currency:
                        razorpayOrder.currency,

                    status:
                        "paid"

                }

            });


            console.log(
                `Order paid: ${orderGroup.group_id}`
            );


            break;
        }

        case "refund.created": {

            const refund =
                webhookData
                    ?.payload
                    ?.refund
                    ?.entity;


            if (!refund) {
                break;
            }


            console.log(
                "Refund created:",
                refund.id
            );


            const order =
                await Order.findOne({
                    "refunds.razorpay_refund_id":
                        refund.id
                });


            if (!order) {

                console.error(
                    "Order not found for refund:",
                    refund.id
                );

                break;
            }


            const refundIndex =
                order.refunds.findIndex(
                    item =>
                        item.razorpay_refund_id ===
                        refund.id
                );


            if (refundIndex === -1) {
                break;
            }


            // Update refund information

            order.refunds[refundIndex].status =
                refund.status || "pending";

            order.refunds[refundIndex].amount =
                refund.amount / 100;

            order.refunds[refundIndex].currency =
                refund.currency || "INR";

            order.refunds[refundIndex].acquirer_data =
                refund.acquirer_data || null;


            // Optional: save complete webhook
            order.refunds[refundIndex].webhook_payload =
                webhookData;

            order.payment_status =
                "refund_pending";


            await order.save();


            console.log(
                `Refund created updated for order: ${order.order_id}`
            );


            break;
        }

        case "refund.processed": {

            const refund =
                webhookData
                    ?.payload
                    ?.refund
                    ?.entity;


            if (!refund) {
                break;
            }


            console.log(
                "Refund processed:",
                refund.id
            );


            const order =
                await Order.findOne({
                    "refunds.razorpay_refund_id":
                        refund.id
                });


            if (!order) {

                console.error(
                    "Order not found for processed refund:",
                    refund.id
                );

                break;
            }


            const refundIndex =
                order.refunds.findIndex(
                    item =>
                        item.razorpay_refund_id ===
                        refund.id
                );


            if (refundIndex === -1) {
                break;
            }


            // ─────────────────────────────────────────
            // Check duplicate webhook
            // ─────────────────────────────────────────

            const alreadyProcessed =
                order.refunds[refundIndex].status ===
                "processed";


            // ─────────────────────────────────────────
            // Update refund
            // ─────────────────────────────────────────

            order.refunds[refundIndex].status =
                "processed";

            order.refunds[refundIndex].amount =
                refund.amount / 100;

            order.refunds[refundIndex].currency =
                refund.currency || "INR";

            order.refunds[refundIndex].processedAt =
                new Date();

            order.refunds[refundIndex].acquirer_data =
                refund.acquirer_data || null;

            order.refunds[refundIndex].webhook_payload =
                webhookData;


            // ─────────────────────────────────────────
            // Update Order
            // ─────────────────────────────────────────

            order.payment_status =
                "refunded";

            order.order_status = "cancelled";


            await order.save();


            // ─────────────────────────────────────────
            // Update OrderGroup
            // ─────────────────────────────────────────

            await updateOrderGroupRefundSummary(
                order.order_group_id
            );


            console.log(
                `Refund processed for order: ${order.order_id}`
            );


            break;
        }

        case "refund.failed": {

            const refund =
                webhookData
                    ?.payload
                    ?.refund
                    ?.entity;


            if (!refund) {
                break;
            }


            const order =
                await Order.findOne({
                    "refunds.razorpay_refund_id":
                        refund.id
                });


            if (!order) {

                console.error(
                    "Order not found for failed refund:",
                    refund.id
                );

                break;
            }


            const refundIndex =
                order.refunds.findIndex(
                    item =>
                        item.razorpay_refund_id ===
                        refund.id
                );


            if (refundIndex === -1) {
                break;
            }


            order.refunds[refundIndex].status =
                "failed";

            order.refunds[refundIndex].failedAt =
                new Date();

            order.refunds[refundIndex].acquirer_data =
                refund.acquirer_data || null;

            order.refunds[refundIndex].webhook_payload =
                webhookData;


            // Refund failed.
            // Order was cancelled but money was NOT refunded.

            order.payment_status = "refund_failed";

            order.order_status =
                "cancelled";


            await order.save();


            // Recalculate group summary

            await updateOrderGroupRefundSummary(
                order.order_group_id
            );


            console.log(
                `Refund failed for order: ${order.order_id}`
            );


            break;
        }

        case "refund.reversed": {

            const refund =
                webhookData
                    ?.payload
                    ?.refund
                    ?.entity;


            if (!refund) {
                break;
            }


            const order =
                await Order.findOne({
                    "refunds.razorpay_refund_id":
                        refund.id
                });


            if (!order) {

                console.error(
                    "Order not found for reversed refund:",
                    refund.id
                );

                break;
            }


            const refundIndex =
                order.refunds.findIndex(
                    item =>
                        item.razorpay_refund_id ===
                        refund.id
                );


            if (refundIndex === -1) {
                break;
            }


            order.refunds[refundIndex].status =
                "reversed";

            order.refunds[refundIndex].acquirer_data =
                refund.acquirer_data || null;

            order.refunds[refundIndex].webhook_payload =
                webhookData;


            // Refund is no longer successful

            order.payment_status =
                "refund_reversed";

            order.order_status =
                "cancelled";


            await order.save();


            await updateOrderGroupRefundSummary(
                order.order_group_id
            );


            console.log(
                `Refund reversed for order: ${order.order_id}`
            );


            break;
        }
        /*
        |--------------------------------------------------------------------------
        | UNKNOWN EVENT
        |--------------------------------------------------------------------------
        */

        default: {

            console.log(
                `Unhandled Razorpay event: ${event}`
            );

            break;

        }

    }


    return res.status(200).json({

        success: true,

        message:
            "Webhook processed successfully"

    });

});

const CANCELLABLE_STATUSES = ["pending", "processing"];

const cancelSingleOrderByUser = asyncHandler(async (req, res) => {

    const userId = req.user.id;
    const { orderId } = req.params;
    // ─────────────────────────────────────────
    // 1. FIND ORDER
    // ─────────────────────────────────────────

    const order = await Order.findOne({
        _id: orderId,
        userId
    }).exec();

    if (!order) {
        throw new NotFoundError("Order not found.");
    }


    // ─────────────────────────────────────────
    // 2. CHECK ORDER STATUS
    // ─────────────────────────────────────────

    if (!CANCELLABLE_STATUSES.includes(order.order_status)) {
        throw new BadRequestError(
            `Order cannot be cancelled. Current status: ${order.order_status}`
        );
    }


    // ─────────────────────────────────────────
    // 3. FIND ORDER GROUP
    // ─────────────────────────────────────────

    const orderGroup = await Ordergroup
        .findById(order.order_group_id)
        .exec();

    if (!orderGroup) {
        throw new NotFoundError(
            "Order group not found."
        );
    }


    // ─────────────────────────────────────────
    // 4. RELEASE RESERVED STOCK
    // ─────────────────────────────────────────

    await Promise.all(

        order.items.map(async (item) => {

            // ═════════════════════════════════════
            // NORMAL ORDER
            // ═════════════════════════════════════

            if (item.type === "NORMAL") {

                const product = item.product_details?.product;

                const productId = product?._id;

                const variantId = product?.variant?._id;

                const reservedQty = Number(item.reserved_quantity || 0);


                if (!productId || !variantId || reservedQty <= 0) {
                    return;
                }


                await ProductVariant.updateOne(
                    {
                        product: productId,
                        "variants._id": variantId
                    },
                    {
                        $inc: {
                            "variants.$[v].available_stock":
                                reservedQty
                        }
                    },
                    {
                        arrayFilters: [
                            {
                                "v._id": variantId
                            }
                        ]
                    }
                );


                // Reserved quantity release ho gayi
                item.reserved_quantity = 0;

                return;
            }


            // ═════════════════════════════════════
            // CUSTOM ORDER
            // ═════════════════════════════════════

            if (item.type === "CUSTOM") {

                const products = item.product_details?.products || [];


                await Promise.all(

                    products.map(async (customProduct) => {

                        const productId = customProduct?.productId;

                        const variantId = customProduct?.variant?._id;

                        const reservedQty = Number(customProduct.reserved_quantity ?? customProduct.quantity ?? 0);


                        if (!productId || !variantId || reservedQty <= 0) {
                            return;
                        }


                        await ProductVariant.updateOne(
                            {
                                product: productId,
                                "variants._id": variantId
                            },
                            {
                                $inc: {
                                    "variants.$[v].available_stock": reservedQty
                                }
                            },
                            {
                                arrayFilters: [
                                    {
                                        "v._id": variantId
                                    }
                                ]
                            }
                        );


                        // Agar reserved_quantity customProduct
                        // ke andar maintain ho raha hai
                        if (
                            customProduct.reserved_quantity !== undefined
                        ) {
                            customProduct.reserved_quantity = 0;
                        }

                    })

                );


                // Agar parent CUSTOM item ke andar bhi
                // reserved_quantity maintain ho raha hai
                item.reserved_quantity = 0;
            }

        })

    );


    order.inventory_status = "released";


    // ─────────────────────────────────────────
    // 5. COD / ONLINE PAYMENT
    // ─────────────────────────────────────────

    let refundResult = null;


    // ═══════════════════════════════════════════
    // COD ORDER
    // ═══════════════════════════════════════════

    if (orderGroup.payment_mode === "cod") {


        // ---------------------------------------
        // Cancel order first
        // ---------------------------------------

        order.order_status = "cancelled";

        // COD payment abhi hua hi nahi hai
        order.payment_status = "pending";


        await order.save();


        // ---------------------------------------
        // Recalculate group amount
        // ---------------------------------------

        const remainingOrders =
            await Order.find({
                order_group_id:
                    orderGroup._id,

                order_status: {
                    $nin: [
                        "cancelled",
                        "refunded"
                    ]
                }
            })
                .select("totalAmount")
                .lean();


        // ---------------------------------------
        // Remaining products total
        // ---------------------------------------

        const newTotalAmount =
            remainingOrders.reduce(
                (total, remainingOrder) =>
                    total +
                    Number(
                        remainingOrder.totalAmount || 0
                    ),
                0
            );


        // ---------------------------------------
        // Calculate COD
        //
        // Existing COD percentage:
        // 187 / 748 = 25%
        // ---------------------------------------

        const oldTotalAmount =
            Number(
                orderGroup.totalAmount || 0
            );

        const oldCodAmount =
            Number(
                orderGroup.cod_amount || 0
            );


        let codPercentage = 0;


        if (oldTotalAmount > 0) {

            codPercentage =
                oldCodAmount /
                oldTotalAmount;
        }


        // ---------------------------------------
        // New COD amount
        // ---------------------------------------

        const newCodAmount =
            Math.round(
                newTotalAmount *
                codPercentage
            );


        // ---------------------------------------
        // New final amount
        // ---------------------------------------

        const newFinalAmount =
            newTotalAmount +
            newCodAmount;


        // ---------------------------------------
        // Update OrderGroup
        // ---------------------------------------

        orderGroup.totalAmount =
            newTotalAmount;

        orderGroup.cod_amount =
            newCodAmount;

        orderGroup.finalAmount =
            newFinalAmount;


        // COD order mein refund nahi hai
        orderGroup.refund_status =
            "none";

        orderGroup.total_refunded_amount =
            0;

        orderGroup.remaining_amount =
            0;

        orderGroup.refund_count =
            0;

        orderGroup.refunded_order_count =
            0;

        orderGroup.refunded_order_ids =
            [];


        await orderGroup.save();


        // ═══════════════════════════════════════════
        // ONLINE PAYMENT
        // ═══════════════════════════════════════════

    } else if (orderGroup.payment?.razorpay_payment_id) {


        // ---------------------------------------
        // Refund only cancelled order amount
        // ---------------------------------------

        const refundAmount =
            Number(order.totalAmount) * 100;


        refundResult =
            await razorpay.payments.refund(
                orderGroup.payment.razorpay_payment_id,
                {
                    amount: refundAmount,

                    speed: "normal",

                    notes: {

                        reason:
                            "Order cancelled before shipment",

                        order_id:
                            String(order._id),

                        order_number:
                            order.order_id,

                        group_id:
                            String(orderGroup._id),

                        group_number:
                            orderGroup.group_id
                    }
                }
            );


        // ---------------------------------------
        // Save refund transaction
        // ---------------------------------------

        order.refunds.push({

            razorpay_refund_id:
                refundResult.id,

            razorpay_payment_id:
                orderGroup.payment.razorpay_payment_id,

            amount:
                refundResult.amount / 100,

            currency:
                refundResult.currency || "INR",

            status:
                refundResult.status,

            reason:
                "Order cancelled before shipment",

            initiatedAt:
                new Date(),

            processedAt:
                refundResult.status === "processed"
                    ? new Date()
                    : null,

            acquirer_data:
                refundResult.acquirer_data || null
        });


        // ---------------------------------------
        // Update payment status
        // ---------------------------------------

        if (
            refundResult.status === "processed"
        ) {

            order.payment_status =
                "refunded";

        } else if (
            refundResult.status === "pending"
        ) {

            order.payment_status =
                "refund_pending";
        }


        // Order status always cancelled
        order.order_status =
            "cancelled";


        await order.save();
    }


    // ─────────────────────────────────────────
    // 6. RESPONSE
    // ─────────────────────────────────────────

    return res.status(200).json({

        success: true,

        message:
            "Order cancelled successfully",

        data: {

            cancelled_order:
                order.order_id,

            payment_mode:
                orderGroup.payment_mode,

            refund:
                refundResult
                    ? {
                        id:
                            refundResult.id,

                        amount:
                            refundResult.amount / 100,

                        status:
                            refundResult.status
                    }
                    : null,

            // Useful especially for COD
            orderGroup: {

                totalAmount:
                    orderGroup.totalAmount,

                cod_amount:
                    orderGroup.cod_amount,

                finalAmount:
                    orderGroup.finalAmount
            }
        }
    });
});

const getliveTrackingDetails = asyncHandler(async (req, res) => {
    const { ordergroupId } = req.params;

    const userId = req.user.id;

    // -----------------------------------------
    // 1. Validate OrderGroup
    // -----------------------------------------

    const orderGroup = await Ordergroup.findOne({
        _id: ordergroupId,
        userId: userId,
    }).select("_id");

    if (!orderGroup) {
        return res.status(404).json({
            success: false,
            message: "Order group not found",
        });
    }

    // -----------------------------------------
    // 2. Find Velocity shipment
    // -----------------------------------------

    const velocityOrder = await VelocitySchema.findOne({
        orderGroupId: orderGroup._id,
    })
        .select(
            "awbCode shipmentId courierName tracking.current"
        )
        .lean();

    if (!velocityOrder) {
        return res.status(404).json({
            success: false,
            message:
                "Velocity shipment tracking details not found",
        });
    }

    // -----------------------------------------
    // 3. Return tracking details
    // -----------------------------------------

    return res.status(200).json({
        success: true,
        message: "Live tracking details fetched successfully",
        data: {
            awbCode: velocityOrder.awbCode,
            shipmentId: velocityOrder.shipmentId,
            courierName: velocityOrder.courierName,
            tracking: velocityOrder.tracking?.current || null,
        },
    });
});

module.exports = {
    createOrderByUser,
    getMyordersDetails,
    razorpayWebhooks,
    cancelSingleOrderByUser,
    getliveTrackingDetails
}
