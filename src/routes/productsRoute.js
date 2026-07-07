const express = require('express')
const router = express.Router()
const { createProduct, getAllProducts, getProductById, uploadProductImages, createProductVariant, updateProductimage, updateProductVariant } = require('../controllers/productController')
const { uploadMultiple, uploadSingle } = require('../middlewares/upload.middleware')

// Route to create a new product
router.post('/', createProduct)

// Route to get all products
router.get('/', getAllProducts)

// Route to get a product by ID
router.get('/:id', getProductById)

// Route to upload product images
router.post('/:id/images', uploadMultiple, uploadProductImages)

// Route to create a product variant
router.post('/:id/variants', createProductVariant)

// Route to update a product image
router.put('/:productId/images/:imageId', uploadSingle, updateProductimage)

// Route to update a product variant
router.put('/:productId/variants/:variantId', updateProductVariant)


module.exports = router