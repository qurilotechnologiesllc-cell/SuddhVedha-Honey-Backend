const Product = require('../models/product.model')
const ProductVariant = require('../models/productVariant.model')
const { asyncHandler, BadRequestError, UnauthorizedError, ForbiddenError, ValidationError } = require('../errors/errorConfig');

const getTotalProductCount = asyncHandler(async (req, res) => {
    const { role } = req.user

    // ─── Admin Check ──────────────────────────────
    if (role !== 'admin' && role !== 'superadmin') {
        throw new UnauthorizedError(
            'Only admin can access this resource'
        )
    }

    // ─── Total Count ──────────────────────────────
    const totalProducts = await Product.countDocuments()

    // ─── Active + Inactive Count ──────────────────
    const activeProducts = await Product.countDocuments({ is_active: true })
    const inactiveProducts = await Product.countDocuments({ is_active: false })

    res.status(200).json({
        success: true,
        message: 'Product count fetched successfully',
        data: {
            totalProducts,
            activeProducts,
            inactiveProducts
        }
    })
})

const getProductsByType = asyncHandler(async (req, res) => {
    const { role } = req.user
    const { product_type } = req.query

    // ─── Admin Check ──────────────────────────────
    if (role !== 'admin' && role !== 'superadmin') {
        throw new ForbiddenError(
            'Access denied. Only admin can access this resource'
        )
    }

    // ─── product_type Validation ──────────────────
    if (!product_type) {
        throw new BadRequestError('product_type query is required')
    }

    // ─── Allowed Types ────────────────────────────
    const allowedTypes = ['honey', 'gift_box', 'combo', 'accessories']
    if (!allowedTypes.includes(product_type.toLowerCase())) {
        throw new BadRequestError(
            `Invalid product_type. Allowed: ${allowedTypes.join(', ')}`
        )
    }

    // ─── Products Filter karo ─────────────────────
    const products = await Product.find({
        product_type: product_type.toLowerCase()
    })
        .select('product_name product_type brand is_active createdAt')
        .sort({ createdAt: -1 })

    res.status(200).json({
        success: true,
        message: `Products fetched for type: ${product_type}`,
        product_type: product_type,
        total: products.length,
        data: products
    })
})

const getLowStockProductlist = asyncHandler(async (req, res) => {
    const { role } = req.user

    // ─── Admin Check ──────────────────────────────
    if (role !== 'admin' && role !== 'superadmin') {
        throw new ForbiddenError(
            'Access denied. Only admin can access this resource'
        )
    }

    // ─── Saare Variant Documents Fetch karo ───────
    const allVariantDocuments = await ProductVariant.find()
        .populate('product', 'product_name batch_number brand is_active')
    //          ↑
    // Product info attach karo

    if (!allVariantDocuments.length) {
        return res.status(200).json({
            success: true,
            message: 'No variants found',
            total: 0,
            data: []
        })
    }

    // ─── Low Stock Variants Filter karo ──────────
    const lowStockList = []

    allVariantDocuments.forEach(variantDoc => {

        // Har document ke variants array filter karo
        const lowStockVariants = variantDoc.variants.filter(
            variant => variant.stock_status === 'low_stock'
        )

        // Low stock variants hain toh response mein add karo
        if (lowStockVariants.length > 0) {
            lowStockVariants.forEach(variant => {
                lowStockList.push({
                    // ─── Product Info ─────────────
                    productId: variantDoc.product._id,
                    product_name: variantDoc.product.product_name,
                    batch_number: variantDoc.product.batch_number,
                    brand: variantDoc.product.brand,
                    is_active: variantDoc.product.is_active,

                    // ─── Variant Info ─────────────
                    variantId: variant._id,
                    sku: variant.sku,
                    weight: variant.weight,
                    unit: variant.unit,
                    available_stock: variant.available_stock,
                    low_stock_alert: variant.low_stock_alert,
                    stock_status: variant.stock_status,
                    allow_backorders: variant.allow_backorders,
                    price: variant.price,
                    mrp: variant.mrp
                })
            })
        }
    })

    // ─── Koi Low Stock Nahi ───────────────────────
    if (!lowStockList.length) {
        return res.status(200).json({
            success: true,
            message: 'No low stock products found',
            total: 0,
            data: []
        })
    }

    res.status(200).json({
        success: true,
        message: 'Low stock products fetched successfully',
        total: lowStockList.length,
        data: lowStockList
    })
})

module.exports = { getTotalProductCount, getProductsByType, getLowStockProductlist }