const express = require('express')
const router = express.Router()
const { authMiddleware } = require('../middlewares/authmiddleware')
const { addShippingAddress, getUserAllShippingAddress, editShippingAddress, deleteShippingAddress } = require('../controllers/shippingAddressController')

router.post('/add', authMiddleware, addShippingAddress);

router.get('/all', authMiddleware, getUserAllShippingAddress);

router.put('/update/:shippingAddressId', authMiddleware, editShippingAddress);

router.delete('/delete/:shippingAddressId', authMiddleware, deleteShippingAddress);

module.exports = router
