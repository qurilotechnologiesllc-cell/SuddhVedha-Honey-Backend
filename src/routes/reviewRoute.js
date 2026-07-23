const express = require('express');
const router = express.Router();
const { createProductReview, removeProductReview, getallReviews } = require('../controllers/reviewController');
const { authMiddleware } = require('../middlewares/authmiddleware');
const { uploadSingle } = require('../middlewares/upload.middleware')

// Route to create a product review
router.post('/reviews', uploadSingle, createProductReview);

router.get('/all', getallReviews)

// Route to remove a product review
router.delete('/reviews/:reviewId', removeProductReview);

module.exports = router;