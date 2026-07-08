const express = require('express')
const router = express.Router()
const { addNewCategory, removeCategory, getAllCategories } = require('../controllers/categoryController')

router.post('/add', addNewCategory)

router.delete('/remove/:categoryId', removeCategory)

router.get('/all-category', getAllCategories)

module.exports = router