const express = require('express');
const router = express.Router()
const { authMiddleware } = require('../middlewares/authmiddleware')
const { uploadSingle, uploadMultiple } = require('../middlewares/upload.middleware')

const { createComboProduct, uploadComboProductImage, createSetPackOfcomboProduct, getAllcomboProducts, getComboProductDetails } = require('../controllers/combopackProductController')

router.post('/create', createComboProduct)

router.post('/image-uploads/:comboProductId', uploadMultiple, uploadComboProductImage);

router.post('/add/set-pack/:comboProductId', uploadSingle, createSetPackOfcomboProduct);

router.get('/all/combo-products', getAllcomboProducts);

router.get('/details/:comboProductId', getComboProductDetails)

module.exports = router