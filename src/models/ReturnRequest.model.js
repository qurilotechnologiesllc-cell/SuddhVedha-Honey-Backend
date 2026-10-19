
const { Schema, model } = require("mongoose");

const imageSchema = new Schema(
    {
        url: {
            type: String,
            required: true,
        },
        public_id: {
            type: String,
            required: true,
        },
    },
    { _id: false }
);

const videoSchema = new Schema(
    {
        public_id: {
            type: String,
            required: true,
        },
    },
    { _id: false }
);

const reviewHistorySchema = new Schema(
    {
        status: {
            type: String,
            enum: ["under_review", "approved", "rejected"],
            required: true,
        },
        adminNote: {
            type: String,
            trim: true,
            default: "",
        },
        reviewedBy: {
            type: Schema.Types.ObjectId,
            ref: "Admin",
            required: true,
        },
        reviewedAt: {
            type: Date,
            default: Date.now,
        },
    },
    { _id: true }
);

const returnRequestSchema = new Schema(
    {
        userId: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },

        orderId: {
            type: Schema.Types.ObjectId,
            ref: "Order",
            required: true,
            index: true,
        },

        orderGroupId: {
            type: Schema.Types.ObjectId,
            ref: "OrderGroup",
            required: true,
            index: true,
        },

        // Packaging images uploaded by the customer
        packagingImages: {
            type: [imageSchema],
            required: true,
            validate: {
                validator: (images) => images.length > 0,
                message: "At least one packaging image is required",
            },
        },

        // Only Cloudinary public_id will be stored
        unboxingVideo: {
            type: videoSchema,
            required: true,
        },

        status: {
            type: String,
            enum: [
                "requested",
                "under_review",
                "approved",
                "rejected",
            ],
            default: "requested",
            index: true,
        },
        phoneNumber: {
            type: String,
            required: true,
        },
        reason: {
            type: String,
            required: true,
        },
        // Latest note added by admin
        adminNote: {
            type: String,
            trim: true,
            default: "",
        },
        // Complete history of admin reviews
        reviewHistory: {
            type: [reviewHistorySchema],
            default: [],
        },
    },
    {
        timestamps: true,
    }
);

returnRequestSchema.index({
    userId: 1,
    createdAt: -1,
});

module.exports = model("ReturnRequest", returnRequestSchema);
