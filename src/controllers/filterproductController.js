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
        .populate({
            path: "variants",
            select: "variants -_id"
        })
        .populate({
            path: "images",
            select: "images -_id"
        })
        .populate({
            path: "videos",
            select: "videos -_id"
        })
        .lean();

    res.status(200).json({

        success: true,

        message: "Products fetched successfully.",

        totalProducts: products.length,

        data: products

    });

});

const filterProductByQuantityPrice = asyncHandler(async (req, res) => {

    let { minPrice, maxPrice } = req.query;


    // Default Values
    minPrice = Number(minPrice) || 0;
    maxPrice = Number(maxPrice) || Number.MAX_SAFE_INTEGER;
    

    if (minPrice < 0 || maxPrice < 0) {
        throw new BadRequestError("Price cannot be negative.");
    }

    if (minPrice > maxPrice) {
        throw new BadRequestError("Minimum price cannot be greater than maximum price.");
    }

    // Find Variant Documents
    const variantDocuments = await ProductVariant.find({
        variants: {
            $elemMatch: {
                price: {
                    $gte: minPrice,
                    $lte: maxPrice
                }
            }
        }
    }).select("product");


    if (!variantDocuments.length) {
        return res.status(200).json({
            success: true,
            message: "No products found in this price range.",
            totalProducts: 0,
            data: []
        });
    }

    // Extract Product IDs
    const productIds = variantDocuments.map(item => item.product);

    // Fetch Complete Product Details
    const products = await Product.find({
        _id: {
            $in: productIds
        },
        is_active: true
    })
        .populate("category")
        .populate("variants")
        .populate("images")
        .populate("videos");

    res.status(200).json({

        success: true,

        message: "Products fetched successfully.",

        totalProducts: products.length,

        data: products

    });

});

module.exports = { filterProductByCategory, filterProductByQuantityPrice }
