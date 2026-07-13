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
        categoryId: category._id,
        is_active: true
    })
        .populate({
            path: "categoryId",
            select: "category_name slug"
        })
        .populate({
            path: "variantDocumentId",
            select: "variants -_id"
        })
        .populate({
            path: "imageDocumentId",
            select: "images -_id"
        })
        .populate({
            path: "videoDocumentId",
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
        .populate("categoryId")
        .populate("variantDocumentId")
        .populate("imageDocumentId")
        .populate("videoDocumentId").select('-createdAt -updatedAt -__v');

    res.status(200).json({

        success: true,

        message: "Products fetched successfully.",

        totalProducts: products.length,

        data: products

    });

});

const filterProductByRating = asyncHandler(async (req, res) => {

    let { minRating, maxRating } = req.query

    // Number mein convert karo
    minRating = Number(minRating) || 1
    maxRating = Number(maxRating) || 5

    // ─── Validations ────────────────────────────

    // Rating 1-5 ke beech honi chahiye
    if (minRating < 1 || minRating > 5) {
        throw new BadRequestError('minRating must be between 1 and 5')
    }

    if (maxRating < 1 || maxRating > 5) {
        throw new BadRequestError('maxRating must be between 1 and 5')
    }

    // minRating maxRating se bada nahi hona chahiye
    if (minRating > maxRating) {
        throw new BadRequestError(
            'minRating cannot be greater than maxRating'
        )
    }

    // ─── Filter ─────────────────────────────────
    const products = await Product.find({
        is_active: true,
        average_rating: {
            $gte: minRating,  // 3 ya usse zyada
            $lte: maxRating   // 5 ya usse kam
        }
    })
        .populate({
            path: 'categoryId',
            select: 'category_name slug -_id'
        })
        .populate({
            path: 'imageDocumentId',
            select: 'images -_id'
        })
        .populate({
            path: 'variantDocumentId',
            select: 'variants -_id'
        })
        .sort({ average_rating: -1 }) // ← High rating pehle

    // ─── Empty Response ──────────────────────────
    if (!products.length) {
        return res.status(200).json({
            success: true,
            message: `No products found between ${minRating} to ${maxRating} rating`,
            totalProducts: 0,
            data: []
        })
    }

    // ─── Success Response ────────────────────────
    res.status(200).json({
        success: true,
        message: 'Products fetched successfully',
        filter: {
            minRating,
            maxRating
        },
        totalProducts: products.length,
        data: products
    })
})

const filterProductByQuantity = asyncHandler(async (req, res) => {

    const { quantity } = req.query;

    if (!quantity) {
        throw new BadRequestError("Quantity is required.");
    }

    const allowedQuantities = [
        "100g",
        "250g",
        "500g",
        "1kg",
        "2kg"
    ];

    if (!allowedQuantities.includes(quantity)) {
        throw new BadRequestError("Invalid quantity.");
    }

    const variantDocuments = await ProductVariant.find({
        variants: {
            $elemMatch: {
                weight: quantity
            }
        }
    }).select("product");

    if (!variantDocuments.length) {
        return res.status(200).json({
            success: true,
            message: "No products found for this quantity.",
            totalProducts: 0,
            data: []
        });
    }

    const productIds = variantDocuments.map(item => item.product);

    const products = await Product.find({
        _id: {
            $in: productIds
        },
        is_active: true
    })
        .populate("categoryId")
        .populate("variantDocumentId")
        .populate("imageDocumentId")
        .populate("videoDocumentId");

    res.status(200).json({

        success: true,

        message: "Products fetched successfully.",

        totalProducts: products.length,

        data: products

    });

});

const filterProductByProductName = asyncHandler(async (req, res) => {

    const { name } = req.query

    // ─── Validation ─────────────────────────────
    if (!name || name.trim() === '') {
        throw new BadRequestError('Product name is required to search')
    }

    // ─── Search ──────────────────────────────────
    const products = await Product.find({
        is_active: true,
        product_name: {
            $regex: name,  // ← Partial search
            $options: 'i'    // ← Case insensitive
            // "honey" → "Honey 250g", "Pure Honey", "HONEY"
        }
    })
        .populate({
            path: 'imageDocumentId',
            select: 'images -_id'
        })
        .populate({
            path: 'variantDocumentId',
            select: 'variants -_id'
        })
        .populate({
            path: 'categoryId',
            select: 'category_name slug -_id'
        })

    // ─── Empty Response ──────────────────────────
    if (!products.length) {
        return res.status(200).json({
            success: true,
            message: `No products found for "${name}"`,
            totalProducts: 0,
            data: []
        })
    }

    // ─── Success Response ────────────────────────
    res.status(200).json({
        success: true,
        message: 'Products fetched successfully',
        searchedFor: name,
        totalProducts: products.length,
        data: products
    })
})

module.exports = { filterProductByCategory, filterProductByQuantityPrice, filterProductByRating, filterProductByQuantity, filterProductByProductName }
