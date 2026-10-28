const { UnrecoverableError } = require('bullmq')
const User = require('../models/user.model');           // apna path/model name adjust karo
const Order = require('../models/orders.model');
const Ordergroup = require('../models/orderGoup.model'); // apna path adjust karo
const { sendEmailforSuccesfullPayment, sendEmailOnOrderConfirmed } = require('../utils/sendEmail');

const formatDate = (date) => new Date(date).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Kolkata',
});

const formatAmount = (amount) =>
    `₹${Number(amount).toLocaleString('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })}`;

const METHOD_LABELS = {
    upi: 'UPI',
    card: 'Card',
    netbanking: 'Net Banking',
    wallet: 'Wallet',
    emi: 'EMI',
    paylater: 'Pay Later',
};

const formatMethod = (method) => METHOD_LABELS[method] || (method ? method.toUpperCase() : 'Online');

const PAYMENT_STATUS_LABELS = {
    paid: 'Paid',
    captured: 'Paid',
    authorized: 'Authorized',
    pending: 'Pending',
    failed: 'Failed',
};

// webp ko chhoti jpg mein badalta hai (Outlook jaise clients webp nahi dikhate)
const emailImageUrl = (url) =>
    url
        ? url
            .replace('/upload/', '/upload/w_160,h_160,c_fill,b_white,f_jpg,q_auto/')
            .replace(/\.(webp|png|jpe?g|avif)$/i, '.jpg')
        : '';

const formatAddress = (addr) =>
    addr
        ? [addr.full_name, addr.address_line1, addr.city, addr.state, addr.pincode, addr.country]
            .filter(Boolean)
            .join(', ')
        : '';

const buildEmailItems = (orders) =>
    orders.flatMap((order) =>
        (order.items || []).map((item) => {
            const details = item.product_details || {};
            const product = details.product || {};
            const variant = product.variant || {};
            const quantity = item.quantity || 1;

            return {
                name: product.product_name || 'Product',
                image_url: emailImageUrl(product.image?.image_url),
                variant: variant.weight ? `${variant.weight}${variant.unit || 'g'}` : '',
                quantity,
                unit_price: formatAmount(variant.price),
                line_total: formatAmount(details.totalAmount ?? (variant.price || 0) * quantity),
            };
        })
    );


const sendPaymentSuccessEmail = async (orderGroupId, paymentCreatedAt) => {
    const orderGroup = await Ordergroup.findById(orderGroupId).lean();

    // Retry se fayda nahi, seedha fail karo
    if (!orderGroup) throw new UnrecoverableError(`OrderGroup not found: ${orderGroupId}`);

    // Pehle se bhej diya ho to skip (duplicate protection)
    if (orderGroup.payment_email_sent) {
        console.log(`Payment email already sent: ${orderGroup.group_id}`);
        return;
    }

    const user = await User.findById(orderGroup.userId)
        .select('email name')
        .lean();

    if (!user?.email) {
        throw new UnrecoverableError(`User email not found for group ${orderGroup.group_id}`);
    }

    const paymentTimestamp = paymentCreatedAt
        ? paymentCreatedAt * 1000          // Razorpay unix seconds deta hai
        : Date.now();

    const result = await sendEmailforSuccesfullPayment(user.email, {
        customer_name: user.name,
        order_number: orderGroup.group_id,
        transaction_amount: formatAmount(orderGroup.finalAmount),
        transaction_id: orderGroup.payment?.razorpay_payment_id,
        payment_method: formatMethod(orderGroup.payment?.method || orderGroup.payment_mode),
        order_date: formatDate(orderGroup.createdAt),
        payment_date: formatDate(paymentTimestamp),
    });

    // Fail hua to throw karo, BullMQ backoff ke saath dobara try karega
    if (!result.success) throw new Error(result.error);

    // Sirf success ke baad flag set karo
    await Ordergroup.updateOne(
        { _id: orderGroupId },
        { $set: { payment_email_sent: true } }
    );
};

const sendOrderConfirmedEmailByGroup = async (orderGroupId) => {
    // Duplicate email se bachne ke liye atomic claim
    const orderGroup = await Ordergroup.findOneAndUpdate(
        { _id: orderGroupId, order_confirmed_email_sent: { $ne: true } },
        { $set: { order_confirmed_email_sent: true } },
        { new: true }
    ).lean();

    if (!orderGroup) {
        console.log(`Order confirmed email skipped (already sent / group missing): ${orderGroupId}`);
        return { success: false, skipped: true };
    }

    try {
        const [user, orders] = await Promise.all([
            User.findById(orderGroup.userId).lean(),
            Order.find({
                _id: { $in: orderGroup.orderIds },
                order_status: { $nin: ['cancelled', 'refunded'] },
            }).lean(),
        ]);

        const userEmail = user?.email || orders[0]?.email;

        if (!userEmail) throw new Error('User email not found');
        if (!orders.length) throw new Error('No active orders found');

        const isCod = orderGroup.payment_mode === 'cod';

        const params = {
            customer_name: user?.name,

            order_number: orderGroup.group_id, // subject ke liye
            order_id: orderGroup.group_id,
            order_date: formatDate(orderGroup.createdAt),

            items: buildEmailItems(orders),

            order_total: formatAmount(orderGroup.finalAmount),

            // Group ke saare orders ka address same hota hai, to pehle order ka le liya
            shipping_address: formatAddress(orders[0].shipping_address),

            payment_method: METHOD_LABELS[orderGroup.payment_mode] || 'Online',
            payment_status: isCod
                ? `Pay ${formatAmount(orderGroup.cod_amount || orderGroup.finalAmount)} on delivery`
                : PAYMENT_STATUS_LABELS[orderGroup.payment_status] || orderGroup.payment_status,

            order_url: `${process.env.WEBSITE_URL}/account`, // apna frontend route
        };

        const result = await sendEmailOnOrderConfirmed(userEmail, params);

        if (!result.success) throw new Error(result.error);

        return { success: true };
    } catch (error) {
        // Fail hua to flag reset karo, taaki dobara try ho sake
        await OrderGroup.updateOne(
            { _id: orderGroupId },
            { $set: { order_confirmed_email_sent: false } }
        );

        console.error('❌ Order confirmed email service error:', error.message);

        return { success: false, error: error.message };
    }
};


module.exports = { sendPaymentSuccessEmail, sendOrderConfirmedEmailByGroup };