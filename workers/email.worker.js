require('dotenv').config();
const { Worker } = require('bullmq');
const connectDB = require('../src/config/database');                       // apna DB connect function
const { connection, EMAIL_QUEUE_NAME } = require('../src/queues/email.queue');
const { sendPaymentSuccessEmail } = require('../src/services/emails.service');
const { BULK_EMAIL_QUEUE_NAME } = require('../src/queues/bulkEmail.queue');
const { processCampaignJob } = require('../src/services/subscriberCampaign.service');

const start = async () => {
    await connectDB();

    const worker = new Worker(
        EMAIL_QUEUE_NAME,
        async (job) => {
            switch (job.name) {
                case 'payment-success':
                    return sendPaymentSuccessEmail(
                        job.data.orderGroupId,
                        job.data.paymentCreatedAt
                    );
                default:
                    console.warn(`Unknown job: ${job.name}`);
            }
        },
        {
            connection,
            concurrency: 10,                        // ek saath max 10 emails
            limiter: { max: 20, duration: 1000 },   // 1 second mein max 20 (Brevo plan ke hisaab se)
        }
    );

    worker.on('completed', (job) =>
        console.log(`✅ Email job done: ${job.id}`)
    );

    worker.on('failed', (job, err) => {
        console.error(
            `❌ Email job failed (${job?.attemptsMade}/${job?.opts?.attempts}) ${job?.id}: ${err.message}`
        );
        // Final failure pe yahan Slack/Sentry alert laga sakte ho
    });

    const bulkWorker = new Worker(
        BULK_EMAIL_QUEUE_NAME,
        async (job) => {
            if (job.name === 'bulk-campaign') return processCampaignJob(job);
            throw new Error(`Unknown bulk email job: ${job.name}`);
        },
        { connection, concurrency: 5, limiter: { max: 10, duration: 1000 } }
    );

    bulkWorker.on('failed', (job, err) =>
        console.error(`❌ Bulk email failed (${job?.attemptsMade}/${job?.opts?.attempts}) ${job?.id}: ${err.message}`)
    );

    // Deploy ya restart pe chal rahe jobs poore hone do
    const shutdown = async () => {
        console.log('Shutting down worker...');
        await worker.close();
        process.exit(0);
    };
    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);

    console.log('📧 Email worker started');
};

start().catch((err) => {
    console.error('Worker failed to start:', err);
    process.exit(1);
});