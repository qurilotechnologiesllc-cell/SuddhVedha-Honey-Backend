const express = require('express');
const router = express.Router()
const { authMiddleware } = require('../middlewares/authmiddleware')
const { uploadSingle, uploadMultiple } = require('../middlewares/upload.middleware')

const { createComboProduct, uploadComboProductImage, deleteImageOfComboProduct, createSetPackOfcomboProduct, removeSetPackfromComboProduct, getAllcomboProducts, getComboProductDetails } = require('../controllers/combopackProductController')

router.post('/create', createComboProduct)

router.post('/image-uploads/:comboProductId', uploadMultiple, uploadComboProductImage);

router.delete('/remove/combo-product/:comboProductId/image/:imageId', deleteImageOfComboProduct);

router.post('/add/set-pack/:comboProductId', uploadSingle, createSetPackOfcomboProduct);

router.delete('/remove/setpack/:comboProductId/:setPackId', authMiddleware, removeSetPackfromComboProduct)

router.get('/all/combo-products', getAllcomboProducts);

router.get('/details/:comboProductId', getComboProductDetails)

module.exports = router