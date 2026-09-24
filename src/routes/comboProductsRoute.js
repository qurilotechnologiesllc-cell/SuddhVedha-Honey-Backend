const express = require('express');
const router = express.Router()
const { authMiddleware } = require('../middlewares/authmiddleware')
const { uploadSingle, uploadMultiple } = require('../middlewares/upload.middleware')

const { createComboProduct, updateComboproductinfo, uploadComboProductImage, deleteImageOfComboProduct, updateComboProductImages, createSetPackOfcomboProduct, removeSetPackfromComboProduct, getAllcomboProducts, getComboProductDetails } = require('../controllers/combopackProductController')

router.post('/create', createComboProduct)

router.patch('/update/combo-product/info/:comboProductId', updateComboproductinfo)

router.post('/image-uploads/:comboProductId', uploadMultiple, uploadComboProductImage);

router.delete('/remove/combo-product/:comboProductId/image/:imageId', deleteImageOfComboProduct);

router.put('/update/comboProduct-image/:comboProductId', uploadSingle, updateComboProductImages);

router.post('/add/set-pack/:comboProductId', uploadSingle, createSetPackOfcomboProduct);

router.delete('/remove/setpack/:comboProductId/:setPackId', authMiddleware, removeSetPackfromComboProduct)

router.get('/all/combo-products', getAllcomboProducts);

router.get('/details/:comboProductId', getComboProductDetails)

module.exports = router