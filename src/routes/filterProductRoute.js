const express = require('express')
const router = express.Router()
const { filterProductByFloralSource, getFloralSources, filterProductByQuantityPrice, filterProductByRating, filterProductByQuantity, filterProductByProductName } = require('../controllers/filterproductController')

router.get('/flora-source', filterProductByFloralSource)
router.get('/flora-sources', getFloralSources)
router.get('/price', filterProductByQuantityPrice)
router.get('/rating', filterProductByRating)
router.get('/quantity', filterProductByQuantity)
router.get('/search', filterProductByProductName)

module.exports = router