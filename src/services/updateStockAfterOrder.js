const Product = require('../models/product.model')
const ProductVariant = require('../models/productVariant.model')

const updateStockAfterOrder = async (items) => {

    for (const item of items) {

        // ─── Normal Item ──────────────────────────
        if (item.type === 'NORMAL') {

            const productId = item.product_details?.product?._id
            const variantId = item.product_details?.product?.variant?._id
            const quantity = item.reserved_quantity || 1

            await deductStock(productId, variantId, quantity)
        }

        // ─── Custom Gift Box Item ─────────────────
        if (item.type === 'CUSTOM') {

            const products = item.product_details?.products || []
            const quantity = item.reserved_quantity || 1

            // Har product ke liye stock deduct karo
            for (const product of products) {
                const productId = product.productId
                const variantId = product.variant?._id

                await deductStock(productId, variantId, quantity)
            }
        }
    }
}

// ─── Stock Deduct Helper ──────────────────────────
const deductStock = async (productId, variantId, quantity) => {
    try {

        // ── Product se variantDocumentId lo ───────
        const product = await Product.findById(productId)
            .select('variantDocumentId')
            .lean()

        if (!product) return

        // ── Variant Document fetch karo ───────────
        const variantDoc = await ProductVariant.findById(
            product.variantDocumentId
        )

        if (!variantDoc) return

        // ── Variants array mein match karo ────────
        const variant = variantDoc.variants.find(
            v => v._id.toString() === variantId.toString()
        )

        if (!variant) return

        // ── Stock Deduct karo ─────────────────────
        const newStock = variant.available_stock - quantity

        variant.available_stock = Math.max(newStock, 0)
        // ↑ 0 se neeche nahi jayega

        // ── Stock Status Update karo ──────────────
        if (variant.available_stock === 0) {
            variant.stock_status = 'out_of_stock'

        } else if (variant.available_stock <= variant.low_stock_alert) {
            variant.stock_status = 'low_stock'

        } else {
            variant.stock_status = 'in_stock'
        }

        await variantDoc.save()

        console.log(`✅ Stock updated: ${variant.sku} → ${variant.available_stock} remaining`)

    } catch (error) {
        console.error(`❌ Stock update failed: ${error.message}`)
    }
}

module.exports = { updateStockAfterOrder }