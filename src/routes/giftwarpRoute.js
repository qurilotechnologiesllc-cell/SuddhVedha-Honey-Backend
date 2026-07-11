const express = require('express')
const router = express.Router()
const {
    addWrapColor,
    getAllWrapColors,
    removeWrapColor
} = require('../controllers/giftwrapController')

// Admin only
router.post('/add', addWrapColor)
router.delete('/remove/:wrapId', removeWrapColor)

// All users
router.get('/all', getAllWrapColors)

module.exports = router