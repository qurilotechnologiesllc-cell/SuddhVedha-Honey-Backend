const express = require('express')
const router = express.Router()
const { createProduct, getAllProducts, getProductsByPagination, getAllProductByweight, getProductById, uploadProductImages, createProductVariant, updateProductImage, updateProductVariant, updateProductStock, removeProductByAdmin } = require('../controllers/productController')
const { uploadMultiple, uploadSingle } = require('../middlewares/upload.middleware')
const { authMiddleware } = require('../middlewares/authmiddleware')

// Route to create a new product
router.post('/', createProduct)

// Route to get all products
router.get('/', getAllProducts)

// Route to get product pagenation form
router.get('/paginate', getProductsByPagination)

router.get('/weight', getAllProductByweight)

// Route to get a product by ID
router.get('/:id', getProductById)

// Route to upload product images
router.post('/:id/images', uploadMultiple, uploadProductImages)

// Route to update a product image
router.put('/:productId/images/:imageId', uploadSingle, updateProductImage)

// Route to create a product variant
router.post('/:id/variants', createProductVariant)

// Route to update a product variant
router.put('/:productId/variants/:variantId', updateProductVariant)

router.put('/:productId/stock/:variantId', updateProductStock)

router.delete('/remove/:productId', authMiddleware, removeProductByAdmin)


module.exports = router