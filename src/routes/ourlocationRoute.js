const express = require('express')
const router = express.Router()

const { addOurLocation, getLocations, removeLocation } = require('../controllers/ourlocationController')

router.post('/add', addOurLocation)

router.get('/all', getLocations)

router.delete('/remove', removeLocation)

module.exports = router
