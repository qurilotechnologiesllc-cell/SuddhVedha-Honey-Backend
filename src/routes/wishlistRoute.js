const express = require('express')
const router = express.Router()
const { addProductToWishlist, removeProductFromWishlist, getWishlist } = require('../controllers/wishlistController')
const { authMiddleware } = require('../middlewares/authmiddleware')

router.post('/add/:productId', authMiddleware, addProductToWishlist)
router.delete('/remove/:productId', authMiddleware, removeProductFromWishlist)
router.get('/', authMiddleware, getWishlist)

module.exports = router