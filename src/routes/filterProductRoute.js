const express = require('express')
const router = express.Router()
const { filterProductByCategory, filterProductByQuantityPrice, filterProductByRating, filterProductByQuantity, filterProductByProductName } = require('../controllers/filterproductController')

router.get('/category/:slug', filterProductByCategory)
router.get('/price', filterProductByQuantityPrice)
router.get('/rating', filterProductByRating)
router.get('/quantity', filterProductByQuantity)
router.get('/search', filterProductByProductName)

module.exports = router