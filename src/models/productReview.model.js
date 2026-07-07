const mongoose = require("mongoose");

const ProductReviewSchema = new mongoose.Schema({

    product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
        required: true
    },

    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    },

    rating: {
        type: Number,
        min: 1,
        max: 5
    },

    review: {
        type: String
    }

},
    {
        timestamps: true
    });

module.exports = mongoose.model("ProductReview", ProductReviewSchema);