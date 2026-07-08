const Category = require("../models/category.model")
const Product = require('../models/product.model')

const { asyncHandler, BadRequestError, UnauthorizedError, NotFoundError, ConflictError } = require('../errors/errorConfig')

const addNewCategory = asyncHandler(async (req, res) => {
    const { category_name, description } = req.body

    // Duplicate check — name pe
    const existingCategory = await Category.findOne({
        category_name: {
            $regex: new RegExp(`^${category_name}$`, 'i')
        }
    })

    if (existingCategory) {
        throw new ConflictError('Category already exists')
    }

    const newCategory = await Category.create({
        category_name,
        description
        // Slug auto generate hoga pre('save') hook se ✅
    })

    res.status(201).json({
        success: true,
        message: 'Category created successfully',
        data: newCategory
    })
})

const removeCategory = asyncHandler(async (req, res) => {
    const { categoryId } = req.params

    // Category exist karti hai?
    const category = await Category.findById(categoryId)
    if (!category) {
        throw new NotFoundError('Category not found')
    }

    // ✅ Important: Is category mein products hain?
    const productsCount = await Product.countDocuments({
        category: categoryId
    })

    if (productsCount > 0) {
        throw new ConflictError(
            `Cannot delete! ${productsCount} products are linked to this category`
        )
    }

    await Category.findByIdAndDelete(categoryId)

    res.status(200).json({
        success: true,
        message: 'Category deleted successfully'
    })
})

const getAllCategories = asyncHandler(async (req, res) => {

    const categories = await Category.find({ is_active: true })
        .select('category_name slug description')
        .sort({ createdAt: -1 })

    if (!categories || categories.length === 0) {
        throw new NotFoundError('No categories found')
    }

    res.status(200).json({
        success: true,
        message: 'Categories fetched successfully',
        total: categories.length,
        data: categories
    })
})

module.exports = { addNewCategory, removeCategory, getAllCategories }