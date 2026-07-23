const ProductReview = require('../models/productReview.model');
const { uploadToCloudinary, deleteFromCloudinary } = require('../utils/uploadToCloudinary')

const { asyncHandler, NotFoundError, BadRequestError, UnauthorizedError, ForbiddenError, ConflictError, ServiceUnavailableError } = require('../errors/errorConfig')

const createProductReview = asyncHandler(async (req, res) => {

    const {
        fullname,
        rating,
        review,
        role
    } = req.body;

    let profile_url = "";
    let public_id = "";

    // -----------------------------
    // Upload Profile Image (Optional)
    // -----------------------------

    if (req.file) {

        const uploadedImage = await uploadToCloudinary(
            req.file.buffer,
            "sudhvedahoney/clientImage"
        );

        profile_url = uploadedImage.secure_url;
        public_id = uploadedImage.public_id;

    }

    // -----------------------------
    // Create Review
    // -----------------------------

    const newReview = await ProductReview.create({

        fullname,

        rating,

        review,

        role,

        profile_url,

        public_id

    });

    res.status(201).json({

        success: true,

        message: "Product review created successfully.",

        data: newReview

    });

});

const removeProductReview = asyncHandler(async (req, res) => {

    const { reviewId } = req.params;

    const review = await ProductReview.findById(reviewId);

    if (!review) {
        throw new NotFoundError("Review not found.");
    }

    // -----------------------------
    // Delete Image From Cloudinary
    // -----------------------------

    if (review.public_id) {

        const result = await deleteFromCloudinary(review.public_id);
        if (!result) {
            throw new ServiceUnavailableError('Service failed!')
        }

    }

    await ProductReview.findByIdAndDelete(reviewId);

    // -----------------------------
    // Response
    // -----------------------------

    res.status(200).json({

        success: true,

        message: "Product review removed successfully."

    });

});

const getallReviews = asyncHandler(async (req, res) => {

    const reviews = await ProductReview.find()
        .sort({ createdAt: -1 });

    return res.status(200).json({

        success: true,

        message: "Reviews fetched successfully.",

        totalReviews: reviews.length,

        data: reviews

    });

});

module.exports = {
    createProductReview,
    removeProductReview,
    getallReviews
};