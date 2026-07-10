const express = require('express')
const router = express.Router()
const { filterProductByCategory, filterProductByQuantityPrice } = require('../controllers/filterproductController')

router.get('/category/:slug', filterProductByCategory)
router.get('/price', filterProductByQuantityPrice)

module.exports = router