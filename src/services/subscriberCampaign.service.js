const Subscriber = require('../models/subscribe.model');
const { EmailCampaign, EmailCampaignRecipient } = require('../models/emailCampaign.model');
const { bulkEmailQueue } = require('../queues/bulkEmail.queue');
const { sendEmailForSubscribers } = require('../utils/sendEmail');

const BATCH_SIZE = 500;

/* Pending recipients ko queue mein daalo (jobId ki wajah se duplicate nahi banega) */
const enqueuePendingRecipients = async (campaignId) => {
    let lastId = null;

    while (true) {
        const query = { campaignId, status: 'pending' };
        if (lastId) query._id = { $gt: lastId };

        const batch = await EmailCampaignRecipient.find(query)
            .sort({ _id: 1 })
            .limit(BATCH_SIZE)
            .select('_id')
            .lean();

        if (!batch.length) break;

        await bulkEmailQueue.addBulk(
            batch.map((r) => ({
                name: 'subscriber-launch',
                data: { campaignId: String(campaignId), recipientId: String(r._id) },
                opts: { jobId: `subscriber-${campaignId}-${r._id}` },
            }))
        );

        lastId = batch[batch.length - 1]._id;
    }
};

/* Campaign banao + recipients save karo + enqueue */
const startSubscriberCampaign = async ({ launch_date, time = "", createdBy }) => {
    const running = await EmailCampaign.findOne({ type: 'subscriber-launch', status: 'running' }).lean();
    if (running) {
        const err = new Error('Ek campaign pehle se chal raha hai');
        err.statusCode = 409;
        throw err;
    }

    // Unique, valid emails
    const subscribers = await Subscriber.find({ email: { $exists: true, $ne: '' } })
        .select('email')
        .lean();

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const emails = [
        ...new Set(subscribers.map((s) => String(s.email).trim().toLowerCase()).filter((e) => emailRegex.test(e))),
    ];

    if (!emails.length) {
        const err = new Error('Koi subscriber nahi mila');
        err.statusCode = 400;
        throw err;
    }

    const campaign = await EmailCampaign.create({
        launch_date,
        time,
        total: emails.length,
        createdBy,
    });

    await EmailCampaignRecipient.insertMany(
        emails.map((email) => ({ campaignId: campaign._id, email })),
        { ordered: false }
    );

    await enqueuePendingRecipients(campaign._id);

    return campaign;
};

/* Counter badhao aur campaign complete hua ya nahi dekho */
const bumpCounter = async (campaignId, field) => {
    const c = await EmailCampaign.findByIdAndUpdate(campaignId, { $inc: { [field]: 1 } }, { new: true });

    if (c && c.status === 'running' && c.sent + c.failed >= c.total) {
        await EmailCampaign.updateOne(
            { _id: campaignId, status: 'running' },
            {
                $set: {
                    status: c.failed > 0 ? 'completed_with_errors' : 'completed',
                    completedAt: new Date(),
                },
            }
        );
    }
};

/* Worker is function ko chalata hai (ek job = ek email) */
const processSubscriberEmailJob = async (job) => {
    const { campaignId, recipientId } = job.data;

    const recipient = await EmailCampaignRecipient.findById(recipientId);
    if (!recipient || recipient.status === 'sent') return;   // duplicate se bachav

    const campaign = await EmailCampaign.findById(campaignId).lean();
    if (!campaign) return;

    const result = await sendEmailForSubscribers(recipient.email, {
        launch_date: campaign.launch_date,
        time: campaign.time
    });

    if (result.success) {
        await EmailCampaignRecipient.updateOne(
            { _id: recipientId },
            {
                $set: { status: 'sent', messageId: result.data?.messageId, sentAt: new Date(), lastError: null },
                $inc: { attempts: 1 },
            }
        );
        await bumpCounter(campaignId, 'sent');
        return;
    }

    // Fail hua
    const isLastAttempt = job.attemptsMade + 1 >= (job.opts.attempts || 1);

    await EmailCampaignRecipient.updateOne(
        { _id: recipientId },
        {
            $set: { lastError: result.error, ...(isLastAttempt && { status: 'failed' }) },
            $inc: { attempts: 1 },
        }
    );

    if (isLastAttempt) await bumpCounter(campaignId, 'failed');

    throw new Error(result.error);   // BullMQ retry karega
};

/* Failed + pending ko dobara chalao */
const resumeSubscriberCampaign = async (campaignId) => {
    await EmailCampaignRecipient.updateMany({ campaignId, status: 'failed' }, { $set: { status: 'pending' } });

    const sent = await EmailCampaignRecipient.countDocuments({ campaignId, status: 'sent' });

    await EmailCampaign.updateOne(
        { _id: campaignId },
        { $set: { sent, failed: 0, status: 'running', completedAt: null } }
    );

    await enqueuePendingRecipients(campaignId);
};

module.exports = { startSubscriberCampaign, processSubscriberEmailJob, resumeSubscriberCampaign };