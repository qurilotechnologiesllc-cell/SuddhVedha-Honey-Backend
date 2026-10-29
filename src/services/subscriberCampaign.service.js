const Subscriber = require('../models/subscribe.model');
const CAMPAIGN_TYPES = require('../config/campaignTypes');
const { EmailCampaign, EmailCampaignRecipient } = require('../models/emailCampaign.model');
const { bulkEmailQueue } = require('../queues/bulkEmail.queue');
const { sendTemplateEmail } = require('../utils/sendEmail');

const BATCH_SIZE = 500;

const httpError = (statusCode, message) => {
    const err = new Error(message);
    err.statusCode = statusCode;
    return err;
};

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
                name: 'bulk-campaign',                                    // worker se match karna chahiye
                data: { campaignId: String(campaignId), recipientId: String(r._id) },
                opts: { jobId: `campaign-${campaignId}-${r._id}` },       // generic prefix
            }))
        );

        lastId = batch[batch.length - 1]._id;
    }
};

/* Campaign banao + recipients save karo + enqueue */
const startCampaign = async ({ type, params = {}, createdBy, resend = false }) => {
    const config = CAMPAIGN_TYPES[type];
    if (!config) throw httpError(400, `Invalid campaign type: ${type}`);

    const missing = config.requiredParams.filter((k) => !params[k]);
    if (missing.length) throw httpError(400, `Missing params: ${missing.join(', ')}`);

    const running = await EmailCampaign.findOne({ type, status: 'running' }).lean();
    if (running) throw httpError(409, 'Is type ka campaign pehle se chal raha hai');

    // Valid aur unique emails
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const audience = await config.getAudience();
    let emails = [
        ...new Set(audience.map((e) => String(e).trim().toLowerCase()).filter((e) => emailRegex.test(e))),
    ];

    // Jinko is type ka email pehle ja chuka hai, unko hatao
    if (!resend) {
        const alreadySent = new Set(await EmailCampaignRecipient.distinct('email', { type, status: 'sent' }));
        emails = emails.filter((e) => !alreadySent.has(e));
    }

    if (!emails.length) throw httpError(400, 'Koi naya recipient nahi hai, sabko pehle hi email ja chuka hai');

    const campaign = await EmailCampaign.create({
        type,
        templateId: config.templateId(),
        params,
        total: emails.length,
        createdBy,
    });

    await EmailCampaignRecipient.insertMany(
        emails.map((email) => ({ campaignId: campaign._id, type, email })),
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
const processCampaignJob = async (job) => {
    const { campaignId, recipientId } = job.data;

    const recipient = await EmailCampaignRecipient.findById(recipientId);
    if (!recipient || recipient.status === 'sent') return;   // duplicate se bachav

    const campaign = await EmailCampaign.findById(campaignId).lean();
    if (!campaign) return;

    const result = await sendTemplateEmail(recipient.email, campaign.templateId, campaign.params);

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

module.exports = { startCampaign, processCampaignJob, resumeSubscriberCampaign };