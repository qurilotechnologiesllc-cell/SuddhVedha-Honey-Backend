const Category = require('../models/category.model');
const ProductVariant = require('../models/productVariant.model');
const Product = require('../models/product.model');

const { asyncHandler, BadRequestError, NotFoundError, } = require('../errors/errorConfig')

const filterProductByCategory = asyncHandler(async (req, res) => {

    const { slug } = req.params;

    const category = await Category.findOne({
        slug,
        is_active: true
    }).lean();

    if (!category) {
        throw new NotFoundError("Category not found.");
    }

    const products = await Product.find({
        category: category._id,
        is_active: true
    })
        .populate({
            path: "category",
            select: "category_name slug"
        })
        .lean();

    res.status(200).json({

        success: true,

        message: "Products fetched successfully.",

        totalProducts: products.length,

        data: products

    });

});

module.exports = { filterProductByCategory }
