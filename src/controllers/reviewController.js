const ProductReview = require('../models/productReview.model');
const Product = require('../models/product.model');

const { asyncHandler, NotFoundError, BadRequestError, UnauthorizedError, ForbiddenError, ConflictError } = require('../errors/errorConfig')

const createProductReview = asyncHandler(async (req, res) => {
    const { productId, rating, review } = req.body;
    const userId = req.user.id;

    // Update the product's average rating and total reviews
    const product = await Product.findById(productId);
    if (!product) {
        throw new NotFoundError('Product not found.');
    }

    // Check if the user has already reviewed this product
    const existingReview = await ProductReview.findOne({ product: productId, user: userId });
    if (existingReview) {
        throw new ConflictError('You have already reviewed this product.');
    }

    const newReview = await ProductReview.create({
        product: productId,
        user: userId,
        rating,
        review
    });

    product.reviews.push(newReview._id);
    product.total_reviews += 1;
    product.average_rating = (product.average_rating * (product.total_reviews - 1) + rating) / product.total_reviews;
    await product.save();

    res.status(201).json({ message: 'Product review created successfully', review: newReview });
});

const removeProductReview = asyncHandler(async (req, res) => {
    const { reviewId } = req.params;
    const userId = req.user.id;

    const review = await ProductReview.findById(reviewId);
    if (!review) {
        throw new NotFoundError('Review not found.');
    }

    // Check if the user is the owner of the review
    if (review.user.toString() !== userId) {
        throw new ForbiddenError('You are not authorized to delete this review.');
    }

    // Update the product's average rating and total reviews
    const product = await Product.findById(review.product);

    if (product) {
        product.reviews.pull(review._id);
        product.total_reviews -= 1;
        if (product.total_reviews > 0) {
            product.average_rating = (product.average_rating * (product.total_reviews + 1) - review.rating) / product.total_reviews;
        } else {
            product.average_rating = 0;
        }
        await product.save();
    }

    await ProductReview.findByIdAndDelete(reviewId);

    res.status(200).json({ message: 'Product review removed successfully' });
});

module.exports = {
    createProductReview,
    removeProductReview
};