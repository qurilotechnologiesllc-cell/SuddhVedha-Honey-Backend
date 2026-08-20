const Order = require('../models/orders.model');
const User = require('../models/user.model')
const crypto = require('crypto')
const razorpay = require('../utils/razorpay')
const validateOrderItems = require('../errors/ordervalidation')
const removeOrderedItemsFromCart = require('../services/removeOrderedItemsFromCart.service');
const { updateStockAfterOrder } = require('../services/updateStockAfterOrder')

const { asyncHandler, BadRequestError, UnauthorizedError, ForbiddenError, NotFoundError, ConflictError, ValidationError } = require('../errors/errorConfig')

const generateOrderId = () => {

    const date = new Date()

    const yyyy = date.getUTCFullYear()
    const mm = String(date.getUTCMonth() + 1).padStart(2, '0')
    const dd = String(date.getUTCDate()).padStart(2, '0')

    const random = crypto
        .randomBytes(4)
        .toString('hex')
        .toUpperCase()

    return `SV-${yyyy}${mm}${dd}-${random}`
}

const createOrderByUser = asyncHandler(async (req, res) => {

    const { id } = req.user || {}

    if (!id) {
        throw new UnauthorizedError(
            'User authentication required'
        )
    }


    const user = await User.findById(id).select('_id')

    if (!user) {
        throw new NotFoundError(
            'User not found'
        )
    }


    const {
        items,
        finalAmount,
        shipping_address,
        billing_address,
        payment_mode,
        customer_note
    } = req.body


    /*
    |--------------------------------------------------------------------------
    | 4. Validate Items
    |--------------------------------------------------------------------------
    */

    validateOrderItems(items)


    /*
    |--------------------------------------------------------------------------
    | 5. Validate Final Amount
    |--------------------------------------------------------------------------
    */

    if (
        typeof finalAmount !== 'number' ||
        !Number.isFinite(finalAmount) ||
        finalAmount < 0
    ) {
        throw new BadRequestError(
            'Valid finalAmount is required'
        )
    }


    /*
    |--------------------------------------------------------------------------
    | 6. Validate Shipping Address
    |--------------------------------------------------------------------------
    */

    if (
        !shipping_address ||
        typeof shipping_address !== 'object' ||
        Array.isArray(shipping_address)
    ) {
        throw new BadRequestError(
            'Shipping address is required'
        )
    }


    /*
    |--------------------------------------------------------------------------
    | 7. Validate Billing Address
    |--------------------------------------------------------------------------
    */

    if (
        !billing_address ||
        typeof billing_address !== 'object' ||
        Array.isArray(billing_address)
    ) {
        throw new BadRequestError(
            'Billing address is required'
        )
    }


    /*
    |--------------------------------------------------------------------------
    | 8. Validate Payment Mode
    |--------------------------------------------------------------------------
    */

    const allowedPaymentModes = [
        'upi',
        'card',
        'net_banking',
        'wallet',
        'cod'
    ]

    if (!payment_mode) {
        throw new BadRequestError(
            'Payment mode is required'
        )
    }


    if (!allowedPaymentModes.includes(payment_mode)) {
        throw new BadRequestError(
            `Invalid payment mode: ${payment_mode}`
        )
    }



    /*
    |--------------------------------------------------------------------------
    | 11. Generate Order ID
    |--------------------------------------------------------------------------
    */

    const order_id = generateOrderId()


    if (payment_mode === "cod") {

        const order = await Order.create({

            order_id,

            userId: user._id,

            items,

            finalAmount,

            shipping_address,

            billing_address,

            payment_mode,

            payment_status: "pending",

            payment: {},

            order_status: "processing",

            inventory_status: "reserved",

            customer_note: customer_note || ""

        });


        /*
        |--------------------------------------------------------------------------
        | Remove Cart
        |--------------------------------------------------------------------------
        */

        await removeOrderedItemsFromCart(
            user._id,
            items
        );


        /*
        |--------------------------------------------------------------------------
        | Update Stock
        |--------------------------------------------------------------------------
        */

        await updateStockAfterOrder(
            order.items
        );


        return res.status(201).json({

            success: true,

            message: "COD order created successfully",

            payment_required: false,

            order: {

                _id: order._id,

                order_id: order.order_id,

                finalAmount: order.finalAmount,

                payment_mode: order.payment_mode,

                payment_status:
                    order.payment_status,

                order_status:
                    order.order_status

            }

        });

    }

    const razorpayAmount =
        Math.round(finalAmount * 100);


    /*
    |--------------------------------------------------------------------------
    | 11. Create Razorpay Order
    |--------------------------------------------------------------------------
    */

    const razorpayOrder =
        await razorpay.orders.create({

            amount: razorpayAmount,

            currency: "INR",

            receipt: order_id,

            notes: {

                user_id: String(user._id),

                internal_order_id: order_id

            },

            partial_payment: false

        });


    /*
    |--------------------------------------------------------------------------
    | 12. Razorpay Order Created
    |--------------------------------------------------------------------------
    |
    | Ab Razorpay order successfully create ho gaya.
    |
    */

    /*
    |--------------------------------------------------------------------------
    | 12. Create Order
    |--------------------------------------------------------------------------
    */

    const order = await Order.create({

        order_id,

        userId: user._id,

        items,

        finalAmount,

        shipping_address,

        billing_address,

        payment_mode,

        payment_status: "pending",

        payment: {

            razorpay_order_id:
                razorpayOrder.id

        },

        order_status: "processing",

        inventory_status: "reserved",

        customer_note:
            customer_note || ""

    });

    /*
    |--------------------------------------------------------------------------
    | 13. Remove Ordered Items From Cart
    |--------------------------------------------------------------------------
    |
    | IMPORTANT:
    |
    | This happens AFTER order creation succeeds.
    |
    */

    await removeOrderedItemsFromCart(
        user._id,
        items
    )

    // ✅ Order create hone ke baad stock update karo
    await updateStockAfterOrder(order.items)
    /*
    |--------------------------------------------------------------------------
    | 13. Response
    |--------------------------------------------------------------------------
    */

    return res.status(201).json({

        success: true,

        message:
            "Razorpay order and database order created successfully",

        payment_required: true,

        order: {

            _id: order._id,

            order_id: order.order_id,

            razorpay_order_id:
                razorpayOrder.id,

            amount:
                razorpayOrder.amount,

            currency:
                razorpayOrder.currency,

            receipt:
                razorpayOrder.receipt,

            finalAmount:
                order.finalAmount,

            payment_mode:
                order.payment_mode,

            payment_status:
                order.payment_status,

            payment:
                order.payment,

            order_status:
                order.order_status,

            inventory_status:
                order.inventory_status,

            createdAt:
                order.createdAt

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
})

const getMyordersDetails = asyncHandler(async (req, res) => {
    const { id } = req.user

    // ─── Orders Fetch karo userId se ─────────────
    const orders = await Order.find({ userId: id })
        .select(
            'order_id items finalAmount shipping_address payment_mode payment_status order_status createdAt'
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
                amount: item.product_details?.finalAmount
            }),

            // Custom Gift Box
            ...(item.type === 'CUSTOM' && {
                gift_box: item.product_details?.giftBox?.name,
                box_image: item.product_details?.giftBox?.image,
                products: item.product_details?.products,
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


    /*
    |--------------------------------------------------------------------------
    | 2. Raw Webhook Body
    |--------------------------------------------------------------------------
    */

    const rawBody = req.body;


    if (!Buffer.isBuffer(rawBody)) {

        return res.status(400).json({

            success: false,

            message:
                "Invalid webhook body"

        });

    }


    /*
    |--------------------------------------------------------------------------
    | 3. Generate Expected Signature
    |--------------------------------------------------------------------------
    */

    const expectedSignature =
        crypto
            .createHmac(
                "sha256",
                process.env.RAZORPAY_WEBHOOK_SECRET
            )
            .update(rawBody)
            .digest("hex");


    /*
    |--------------------------------------------------------------------------
    | 4. Compare Signature
    |--------------------------------------------------------------------------
    */

    const isValidSignature =
        expectedSignature.length ===
        webhookSignature.length &&
        crypto.timingSafeEqual(
            Buffer.from(expectedSignature),
            Buffer.from(webhookSignature)
        );


    if (!isValidSignature) {

        return res.status(400).json({

            success: false,

            message:
                "Invalid Razorpay webhook signature"

        });

    }


    /*
    |--------------------------------------------------------------------------
    | 5. Parse Body AFTER Signature Verification
    |--------------------------------------------------------------------------
    */

    const webhookData = JSON.parse(rawBody.toString("utf8"));


    /*
    |--------------------------------------------------------------------------
    | 6. Get Event
    |--------------------------------------------------------------------------
    */

    const event = webhookData.event;


    /*
    |--------------------------------------------------------------------------
    | 7. Razorpay Event ID
    |--------------------------------------------------------------------------
    */

    const eventId = req.headers["x-razorpay-event-id"];


    console.log(
        "Razorpay Webhook:",
        event
    );

    console.log(
        "Razorpay Event ID:",
        eventId
    );


    /*
    |--------------------------------------------------------------------------
    | 8. Handle Events
    |--------------------------------------------------------------------------
    */

    switch (event) {


        /*
        |--------------------------------------------------------------------------
        | PAYMENT AUTHORIZED
        |--------------------------------------------------------------------------
        */

        case "payment.authorized": {

            const payment = webhookData?.payload?.payment?.entity;


            if (!payment) {
                break;
            }


            const razorpayOrderId = payment.order_id;


            const order =
                await Order.findOne({
                    "payment.razorpay_order_id":
                        razorpayOrderId
                });


            if (!order) {

                console.error(
                    "Order not found:",
                    razorpayOrderId
                );

                break;

            }


            await Order.updateOne(

                {
                    _id: order._id
                },

                {
                    $set: {

                        payment_status:
                            "processing",

                        "payment.razorpay_payment_id":
                            payment.id,

                        "payment.method":
                            payment.method,

                        "payment.amount":
                            payment.amount,

                        "payment.currency":
                            payment.currency,

                        "payment.status":
                            payment.status

                    }

                }

            );

            break;
        }


        /*
        |--------------------------------------------------------------------------
        | PAYMENT CAPTURED
        |--------------------------------------------------------------------------
        */

        case "payment.captured": {

            const payment = webhookData?.payload?.payment?.entity;


            if (!payment) {
                break;
            }


            const razorpayOrderId = payment.order_id;


            const order = await Order.findOne({ "payment.razorpay_order_id": razorpayOrderId});


            if (!order) {

                console.error(
                    "Order not found:",
                    razorpayOrderId
                );

                break;

            }


            /*
            |--------------------------------------------------------------------------
            | Amount Validation
            |--------------------------------------------------------------------------
            */

            const expectedAmount = Math.round(order.finalAmount * 100);


            if ( payment.amount !== expectedAmount) {

                console.error("Payment amount mismatch",
                    {
                        orderId:
                            order.order_id,

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
            | Update Payment
            |--------------------------------------------------------------------------
            */

            await Order.updateOne(

                {
                    _id: order._id
                },

                {
                    $set: {

                        payment_status:"paid",

                        payment_mode: payment.method,

                        "payment.razorpay_payment_id":
                            payment.id,

                        "payment.method":
                            payment.method,

                        "payment.amount":
                            payment.amount,

                        "payment.currency":
                            payment.currency,

                        "payment.status":
                            payment.status,

                        "payment.captured":
                            payment.captured,

                        "payment.email":
                            payment.email,

                        "payment.contact":
                            payment.contact,

                        "payment.bank":
                            payment.bank,

                        "payment.wallet":
                            payment.wallet,

                        "payment.vpa":
                            payment.vpa,

                        "payment.fee":
                            payment.fee,

                        "payment.tax":
                            payment.tax,

                        "payment.acquirer_data":
                            payment.acquirer_data

                    }

                }

            );


            console.log(
                `Payment captured: ${order.order_id}`
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


            const razorpayOrderId =
                payment.order_id;


            const order =
                await Order.findOne({
                    "payment.razorpay_order_id":
                        razorpayOrderId
                });


            if (!order) {

                console.error(
                    "Order not found:",
                    razorpayOrderId
                );

                break;

            }


            await Order.updateOne(

                {
                    _id: order._id
                },

                {
                    $set: {

                        payment_status:
                            "failed",

                        "payment.razorpay_payment_id":
                            payment.id,

                        "payment.method":
                            payment.method,

                        "payment.amount":
                            payment.amount,

                        "payment.currency":
                            payment.currency,

                        "payment.status":
                            payment.status,

                        "payment.error_code":
                            payment.error_code,

                        "payment.error_description":
                            payment.error_description,

                        "payment.error_source":
                            payment.error_source,

                        "payment.error_step":
                            payment.error_step,

                        "payment.error_reason":
                            payment.error_reason

                    }

                }

            );


            console.log(
                `Payment failed: ${order.order_id}`
            );


            break;
        }


        /*
        |--------------------------------------------------------------------------
        | ORDER PAID
        |--------------------------------------------------------------------------
        */

        case "order.paid": {

            /*
             * payment.captured already handles
             * successful payment.
             *
             * So yahan duplicate processing
             * nahi karna.
             */

            console.log(
                "order.paid received"
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


    /*
    |--------------------------------------------------------------------------
    | 9. Always Return 200
    |--------------------------------------------------------------------------
    */

    return res.status(200).json({

        success: true,

        message:
            "Webhook processed successfully"

    });

});

module.exports = {
    createOrderByUser,
    getMyordersDetails,
    razorpayWebhooks
}
