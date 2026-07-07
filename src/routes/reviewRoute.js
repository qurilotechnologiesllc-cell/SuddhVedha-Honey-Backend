const express = require('express');
const router = express.Router();
const { createProductReview, removeProductReview } = require('../controllers/reviewController');
const { authMiddleware } = require('../middlewares/authmiddleware');

// Route to create a product review
router.post('/reviews', authMiddleware, createProductReview);

// Route to remove a product review
router.delete('/reviews/:reviewId', authMiddleware, removeProductReview);

module.exports = router;