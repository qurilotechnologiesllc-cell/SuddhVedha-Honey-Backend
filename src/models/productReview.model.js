const mongoose = require("mongoose");

const ProductReviewSchema = new mongoose.Schema({

    fullname: {
        type: String,
        require: true
    },

    rating: {
        type: Number,
        min: 1,
        max: 5
    },

    review: {
        type: String,
        required: true,
    },

    profile_url: {
        type: String,
        default: ''
    },

    public_id: {
        type: String,
        default: ''
    },

    role: {
        type: String
    }

},
    {
        timestamps: true
    });

module.exports = mongoose.model("ProductReview", ProductReviewSchema);