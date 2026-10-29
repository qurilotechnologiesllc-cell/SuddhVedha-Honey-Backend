const mongoose = require('mongoose');

const campaignSchema = new mongoose.Schema(
    {
        type: { type: String, default: 'subscriber-launch' },
        launch_date: { type: String, required: true },
        time: {
            type: String, default: "", trim: true,
        },
        total: { type: Number, default: 0 },
        sent: { type: Number, default: 0 },
        failed: { type: Number, default: 0 },
        status: {
            type: String,
            enum: ['running', 'completed', 'completed_with_errors'],
            default: 'running',
            index: true,
        },
        createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
        completedAt: Date,
    },
    { timestamps: true }
);

const recipientSchema = new mongoose.Schema(
    {
        campaignId: { type: mongoose.Schema.Types.ObjectId, ref: 'EmailCampaign', index: true },
        email: { type: String, required: true, lowercase: true, trim: true },
        status: { type: String, enum: ['pending', 'sent', 'failed'], default: 'pending', index: true },
        attempts: { type: Number, default: 0 },
        lastError: String,
        messageId: String,
        sentAt: Date,
    },
    { timestamps: true }
);

// Ek campaign mein ek email sirf ek baar
recipientSchema.index({ campaignId: 1, email: 1 }, { unique: true });

module.exports = {
    EmailCampaign: mongoose.model('EmailCampaign', campaignSchema),
    EmailCampaignRecipient: mongoose.model('EmailCampaignRecipient', recipientSchema),
};