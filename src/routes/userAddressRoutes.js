const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middlewares/authmiddleware');
const { addUserAddress, getUserAddresses, deleteUserAddress, updateUserAddress } = require('../controllers/userAddressController');

// Route to add a new address for the authenticated user
router.post('/add', authMiddleware, addUserAddress);

// Route to get all addresses for the authenticated user
router.get('/all', authMiddleware, getUserAddresses);

// Route to delete an address for the authenticated user
router.delete('/delete/:addressId', authMiddleware, deleteUserAddress);

// Route to update an address for the authenticated user
router.put('/update/:addressId', authMiddleware, updateUserAddress);

module.exports = router;