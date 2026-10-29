const Subscriber = require('../models/subscribe.model');

const CAMPAIGN_TYPES = {

    'subscriber-launch': {
        templateId: () => Number(process.env.BREVO_LAUNCH_WEBSITE_TEMPLATE_ID),
        requiredParams: ['launch_date', 'time'],            // jo admin body ke params mein bhejega
        getAudience: async () => {
            const subs = await Subscriber.find({ email: { $exists: true, $ne: '' } }).select('email').lean();
            return subs.map((s) => s.email);
        },
    },

    'product-launch': {
        templateId: () => Number(process.env.BREVO_PRODUCT_LAUNCH_TEMPLATE_ID),
        requiredParams: ['product_name', 'launch_date'],
        getAudience: async () => {
            const subs = await Subscriber.find({ email: { $exists: true, $ne: '' } }).select('email').lean();
            return subs.map((s) => s.email);
        },
    },
};

module.exports = CAMPAIGN_TYPES;