const express = require('express');
const router = express.Router();
const { getCart, addToCart, addToGiftCart, increaseQuantity, decreaseQuantity, removeFromCart } = require('../controllers/cartController');
const { authMiddleware } = require('../middlewares/authmiddleware');

// Route to get the user's cart
router.get('/', authMiddleware, getCart);

// Route to add an item to the cart
router.post('/add', authMiddleware  , addToCart);

router.post('/add/customize-product', authMiddleware, addToGiftCart);

router.post('/increase-quantity', authMiddleware, increaseQuantity);

router.post('/decrease-quantity', authMiddleware, decreaseQuantity);

// Route to remove an item from the cart
router.post('/remove', authMiddleware, removeFromCart);

module.exports = router;