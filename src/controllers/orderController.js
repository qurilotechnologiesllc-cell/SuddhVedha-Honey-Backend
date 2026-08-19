const Order = require('../models/orders.model');
const User = require('../models/user.model')
const crypto = require('crypto')
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
        payment_status,
        payment,
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
    | 9. Validate Payment Status
    |--------------------------------------------------------------------------
    */

    const allowedPaymentStatuses = [
        'pending',
        'processing',
        'paid',
        'failed',
        'cancelled',
        'refunded',
        'partially_refunded'
    ]

    if (
        payment_status &&
        !allowedPaymentStatuses.includes(payment_status)
    ) {
        throw new BadRequestError(
            `Invalid payment status: ${payment_status}`
        )
    }


    /*
    |--------------------------------------------------------------------------
    | 10. Payment Details
    |--------------------------------------------------------------------------
    */

    if (
        payment !== undefined &&
        (
            payment === null ||
            typeof payment !== 'object' ||
            Array.isArray(payment)
        )
    ) {
        throw new BadRequestError(
            'Invalid payment details'
        )
    }


    /*
    |--------------------------------------------------------------------------
    | 11. Generate Order ID
    |--------------------------------------------------------------------------
    */

    const order_id = generateOrderId()


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

        payment_status: payment_status || 'pending',

        payment: payment || {},

        order_status: 'processing',

        inventory_status: 'reserved',

        customer_note: customer_note || ''

    })

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

        message: 'Order created successfully',

        order: {
            _id: order._id,
            order_id: order.order_id,
            userId: order.userId,
            items: order.items,
            finalAmount: order.finalAmount,

            shipping_address: order.shipping_address,
            billing_address: order.billing_address,

            payment_mode: order.payment_mode,
            payment_status: order.payment_status,
            payment: order.payment,

            order_status: order.order_status,
            inventory_status: order.inventory_status,

            createdAt: order.createdAt
        }
    })
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


module.exports = {
    createOrderByUser,
    getMyordersDetails
}
