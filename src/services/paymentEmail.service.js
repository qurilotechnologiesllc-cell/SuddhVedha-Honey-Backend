const User = require('../models/user.model');           // apna path/model name adjust karo
const Order = require('../models/orders.model');
const Ordergroup = require('../models/orderGoup.model'); // apna path adjust karo
const { sendEmailforSuccesfullPayment } = require('../utils/sendEmail');

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


const sendPaymentSuccessEmail = async (orderGroup, payment) => {
    // Atomic claim: sirf ek hi webhook email bhej payega (duplicate se bachne ke liye)
    const claimed = await Ordergroup.findOneAndUpdate(
        { _id: orderGroup._id, payment_email_sent: { $ne: true } },
        { $set: { payment_email_sent: true } }
    );

    if (!claimed) {
        console.log(`Payment email already sent: ${orderGroup.group_id}`);
        return;
    }

    try {
        const user = await User.findById(orderGroup.userId)
            .select('email name fullName firstName lastName')
            .lean();

        if (!user?.email) {
            throw new Error(`User email not found for group ${orderGroup.group_id}`);
        }

        const customerName = user.name

        const paymentTimestamp = payment?.created_at
            ? payment.created_at * 1000 // Razorpay unix seconds deta hai
            : Date.now();

        const result = await sendEmailforSuccesfullPayment(user.email, {
            customer_name: customerName,
            order_number: orderGroup.group_id,
            transaction_amount: formatAmount(orderGroup.finalAmount),
            transaction_id: payment?.id || orderGroup.payment?.razorpay_payment_id,
            payment_method: formatMethod(payment?.method || orderGroup.payment?.method),
            order_date: formatDate(orderGroup.createdAt),
            payment_date: formatDate(paymentTimestamp)
        });

        if (!result.success) {
            throw new Error(result.error);
        }
    } catch (error) {
        // Fail hua to flag reset karo, taaki baad mein dobara try ho sake
        await Ordergroup.updateOne(
            { _id: orderGroup._id },
            { $set: { payment_email_sent: false } }
        );

        console.error('❌ Payment success email error:', error.message);
    }
};

module.exports = sendPaymentSuccessEmail;