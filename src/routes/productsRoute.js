const express = require('express')
const router = express.Router()
const { createProduct, getAllProducts, getProductsByPagination, getProductById, uploadProductImages, createProductVariant, updateProductImage, updateProductVariant } = require('../controllers/productController')
const { uploadMultiple, uploadSingle } = require('../middlewares/upload.middleware')

// Route to create a new product
router.post('/', createProduct)

// Route to get all products
router.get('/', getAllProducts)

// Route to get product pagenation form
router.get('/paginate', getProductsByPagination)

// Route to get a product by ID
router.get('/:id', getProductById)

// Route to upload product images
router.post('/:id/images', uploadMultiple, uploadProductImages)

// Route to update a product image
router.put('/:productId/images/:imageId', uploadSingle, updateProductImage)

// Route to create a product variant
router.post('/:id/variants', createProductVariant)

// Route to update a product variant
router.put('/:productId/variants', updateProductVariant)


module.exports = router