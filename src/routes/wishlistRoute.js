const express = require('express')
const router = express.Router()
const { addProductToWishlist, removeProductFromWishlist, getWishlist, wishlistCount } = require('../controllers/wishlistController')
const { authMiddleware } = require('../middlewares/authmiddleware')

router.post('/add/:productId', authMiddleware, addProductToWishlist)
router.delete('/remove/:productId', authMiddleware, removeProductFromWishlist)
router.get('/', authMiddleware, getWishlist)
router.get('/product-count', authMiddleware, wishlistCount)

module.exports = router