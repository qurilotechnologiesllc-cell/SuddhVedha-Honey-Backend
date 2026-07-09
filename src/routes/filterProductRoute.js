const express = require('express')
const router = express.Router()
const { filterProductByCategory } = require('../controllers/filterproductController')

router.get('/category/:slug', filterProductByCategory)

module.exports = router