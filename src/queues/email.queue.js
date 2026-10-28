const { Queue } = require('bullmq');
const IORedis = require('ioredis');

// BullMQ ke liye maxRetriesPerRequest null hona zaroori hai
const connection = new IORedis(process.env.REDIS_URL, {
    maxRetriesPerRequest: null,
});

connection.on('error', (err) => console.error('Redis error:', err.message));

const EMAIL_QUEUE_NAME = 'email';

const emailQueue = new Queue(EMAIL_QUEUE_NAME, {
    connection,
    defaultJobOptions: {
        attempts: 5,
        backoff: { type: 'exponential', delay: 5000 }, // 5s, 10s, 20s, 40s...
        removeOnComplete: { age: 24 * 3600, count: 5000 },
        removeOnFail: { age: 7 * 24 * 3600, count: 1000 }, 
    },
});

const enqueuePaymentEmail = (orderGroupId, paymentCreatedAt) =>
    emailQueue.add(
        'payment-success',
        {
            orderGroupId: String(orderGroupId),
            paymentCreatedAt: paymentCreatedAt || null, // Razorpay unix seconds, chhota scalar
        },
        { jobId: `payment-email-${orderGroupId}` } // BullMQ mein ':' allowed nahi hai
    );

module.exports = { emailQueue, enqueuePaymentEmail, EMAIL_QUEUE_NAME, connection };