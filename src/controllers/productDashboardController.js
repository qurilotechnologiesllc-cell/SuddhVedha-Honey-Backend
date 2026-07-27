const Product = require('../models/product.model')
const ProductVariant = require('../models/productVariant.model')
const ProductImage = require('../models/productImage.model')
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

const getProductStockList = asyncHandler(async (req, res) => {
    const { role } = req.user

    // ─── Admin Check ──────────────────────────────
    if (role !== 'admin' && role !== 'superadmin') {
        throw new ForbiddenError(
            'Access denied. Only admin can access this resource'
        )
    }

    // ─── Saare Products Fetch karo ────────────────
    const products = await Product.find({ is_active: true })
        .select('product_name brand batch_number categoryId imageDocumentId variantDocumentId updatedAt')
        .populate('categoryId', 'category_name slug')
        .lean()

    if (!products.length) {
        return res.status(200).json({
            success: true,
            message: 'No products found',
            total: 0,
            data: []
        })
    }

    // ─── Har Product ke liye Variants + Image fetch ─
    const stockList = await Promise.all(
        products.map(async (product) => {

            // ── Image fetch karo ──────────────────
            const imageDoc = await ProductImage.findById(
                product.imageDocumentId
            ).select('images').lean()

            // Sirf primary image lo
            const primaryImage = imageDoc?.images?.find(
                img => img.is_primary === true
            ) || imageDoc?.images?.[0] || null

            // ── Variants fetch karo ───────────────
            const variantDoc = await ProductVariant.findById(
                product.variantDocumentId
            ).select('variants updatedAt').lean()

            // Variants format karo
            const variants = variantDoc?.variants?.map(variant => ({
                variantId: variant._id,
                sku: variant.sku,
                weight: variant.weight,
                unit: variant.unit,
                available_stock: variant.available_stock,
                low_stock_alert: variant.low_stock_alert,
                stock_status: variant.stock_status,
                price: variant.price,
                mrp: variant.mrp,
                allow_backorders: variant.allow_backorders
            })) || []

            // ── Total Stock Calculate karo ────────
            const totalStock = variants.reduce(
                (sum, v) => sum + v.available_stock, 0
            )

            // ── Overall Stock Status ──────────────
            const hasOutOfStock = variants.some(
                v => v.stock_status === 'out_of_stock'
            )
            const hasLowStock = variants.some(
                v => v.stock_status === 'low_stock'
            )

            const overallStatus = hasOutOfStock
                ? 'out_of_stock'
                : hasLowStock
                    ? 'low_stock'
                    : 'in_stock'

            return {
                // ── Product Info ──────────────────
                productId: product._id,
                product_name: product.product_name,
                brand: product.brand,
                batch_number: product.batch_number,
                last_updated: variantDoc?.updatedAt,

                // ── Category ─────────────────────
                category: product.categoryId
                    ? {
                        category_name: product.categoryId.category_name,
                        slug: product.categoryId.slug
                    }
                    : null,

                // ── Primary Image ─────────────────
                image: primaryImage
                    ? {
                        image_url: primaryImage.image_url,
                        public_id: primaryImage.public_id
                    }
                    : null,

                // ── Stock Summary ─────────────────
                total_stock: totalStock,
                overall_status: overallStatus,
                variant_count: variants.length,

                // ── Variants with Stock ───────────
                variants
            }
        })
    )

    res.status(200).json({
        success: true,
        message: 'Product stock list fetched successfully',
        total: stockList.length,
        data: stockList
    })
})


module.exports = { getTotalProductCount, getProductsByType, getLowStockProductlist, getProductStockList }