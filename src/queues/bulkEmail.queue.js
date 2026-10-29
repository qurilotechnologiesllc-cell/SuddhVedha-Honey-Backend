const { Queue } = require('bullmq');
const { connection } = require('./email.queue');

const BULK_EMAIL_QUEUE_NAME = 'bulk-email';

const bulkEmailQueue = new Queue(BULK_EMAIL_QUEUE_NAME, {
    connection,
    defaultJobOptions: {
        attempts: 5,
        backoff: { type: 'exponential', delay: 10000 },  // 10s, 20s, 40s...
        removeOnComplete: true,
        removeOnFail: true,
    },
});

module.exports = { bulkEmailQueue, BULK_EMAIL_QUEUE_NAME };