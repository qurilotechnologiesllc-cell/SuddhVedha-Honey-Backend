const express = require('express');
const router = express.Router();
const { getCart, addToCart, removeFromCart } = require('../controllers/cartController');
const { authMiddleware } = require('../middlewares/authmiddleware');

// Route to get the user's cart
router.get('/', authMiddleware, getCart);

// Route to add an item to the cart
router.post('/add', authMiddleware  , addToCart);

// Route to remove an item from the cart
router.post('/remove', authMiddleware, removeFromCart);

module.exports = router;