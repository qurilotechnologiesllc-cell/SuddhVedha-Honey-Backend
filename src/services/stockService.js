const Product = require('../models/product.model')
const ProductVariant = require('../models/productVariant.model')

const updateStockAfterOrder = async (items) => {

    for (const item of items) {

        // ─────────────────────────────────────────
        // NORMAL ITEM
        // ─────────────────────────────────────────

        if (item.type === 'NORMAL') {

            const productId =
                item.product_details
                    ?.product?._id;

            const variantId =
                item.product_details
                    ?.product?.variant?._id;

            const quantity =
                item.reserved_quantity || 1;


            await deductStock(
                productId,
                variantId,
                quantity
            );

        }


        // ─────────────────────────────────────────
        // CUSTOM GIFT BOX
        // ─────────────────────────────────────────

        if (item.type === 'CUSTOM') {

            const products =
                item.product_details
                    ?.products || [];

            const quantity =
                item.reserved_quantity || 1;


            for (const product of products) {

                const productId =
                    product.productId;

                const variantId =
                    product.variant?._id;


                /*
                |--------------------------------------------------------------------------
                | Important
                |--------------------------------------------------------------------------
                |
                | Gift box quantity = 2
                |
                | Every product inside the gift box
                | needs stock for quantity 2.
                |
                */

                await deductStock(
                    productId,
                    variantId,
                    quantity
                );

            }

        }

    }


    return true;

};

// ─── Stock Deduct Helper ──────────────────────────
const deductStock = async (
    productId,
    variantId,
    quantity
) => {

    // ─────────────────────────────────────────
    // 1. Product
    // ─────────────────────────────────────────

    const product =
        await Product.findById(productId)
            .select('variantDocumentId')
            .lean();


    if (!product) {

        throw new Error(
            'Product not found'
        );

    }


    // ─────────────────────────────────────────
    // 2. Variant Document
    // ─────────────────────────────────────────

    const variantDoc =
        await ProductVariant.findById(
            product.variantDocumentId
        );


    if (!variantDoc) {

        throw new Error(
            'Product variant not found'
        );

    }


    // ─────────────────────────────────────────
    // 3. Find Variant
    // ─────────────────────────────────────────

    const variant =
        variantDoc.variants.find(
            v =>
                v._id.toString() ===
                variantId.toString()
        );


    if (!variant) {

        throw new Error(
            'Selected product variant not found'
        );

    }


    // ─────────────────────────────────────────
    // 4. Validate Quantity
    // ─────────────────────────────────────────

    if (
        !Number.isInteger(quantity) ||
        quantity < 1
    ) {

        throw new Error(
            'Invalid product quantity'
        );

    }


    // ─────────────────────────────────────────
    // 5. Check Current Stock
    // ─────────────────────────────────────────

    if (
        variant.available_stock <=
        variant.low_stock_alert
    ) {

        throw new Error(
            `This variant (${variant.weight}${variant.unit}) of this product is not available. Please choose another variant of the same product.`
        );

    }


    // ─────────────────────────────────────────
    // 6. Check Stock After Order
    // ─────────────────────────────────────────

    const remainingStock = variant.available_stock - quantity;


    if (
        remainingStock <
        variant.low_stock_alert
    ) {

        throw new Error(
            `This variant (${variant.weight}${variant.unit}) of this product does not have enough available stock. Please choose another variant of the same product.`
        );

    }


    // ─────────────────────────────────────────
    // 7. Deduct Stock
    // ─────────────────────────────────────────

    variant.available_stock = remainingStock;


    // ─────────────────────────────────────────
    // 8. Update Stock Status
    // ─────────────────────────────────────────

    if (
        variant.available_stock === 0
    ) {

        variant.stock_status =
            'out_of_stock';

    }

    else if (
        variant.available_stock <=
        variant.low_stock_alert
    ) {

        variant.stock_status =
            'low_stock';

    }

    else {

        variant.stock_status =
            'in_stock';

    }


    // ─────────────────────────────────────────
    // 9. Save
    // ─────────────────────────────────────────

    await variantDoc.save();


    console.log(
        `✅ Stock updated: ${variant.sku} → ${variant.available_stock} remaining`
    );


    return {

        success: true,

        productId,

        variantId,

        quantity,

        remainingStock:
            variant.available_stock

    };

};

const checkStockBeforeOrder = async (items) => {

    for (const item of items) {

        // ─────────────────────────────
        // NORMAL
        // ─────────────────────────────

        if (item.type === "NORMAL") {

            const productId =
                item.product_details?.product?._id;

            const variantId =
                item.product_details?.product?.variant?._id;

            const quantity =
                item.reserved_quantity || 1;

            await checkVariantStock(
                productId,
                variantId,
                quantity
            );
        }


        // ─────────────────────────────
        // CUSTOM
        // ─────────────────────────────

        if (item.type === "CUSTOM") {

            const products =
                item.product_details?.products || [];

            const quantity =
                item.reserved_quantity || 1;


            for (const product of products) {

                const productId =
                    product.productId;

                const variantId =
                    product.variant?._id;

                await checkVariantStock(
                    productId,
                    variantId,
                    quantity
                );
            }
        }
    }
};

// ─── Stock check Helper ──────────────────────────
const checkVariantStock = async (
    productId,
    variantId,
    quantity
) => {

    const product =
        await Product.findById(productId)
            .select(
                "product_name variantDocumentId"
            )
            .lean();


    if (!product) {

        throw new BadRequestError(
            "Product not found"
        );
    }


    const variantDoc =
        await ProductVariant.findById(
            product.variantDocumentId
        ).lean();


    if (!variantDoc) {

        throw new BadRequestError(
            `Variants not found for ${product.product_name}`
        );
    }


    const variant =
        variantDoc.variants.find(
            v =>
                v._id.toString() ===
                variantId.toString()
        );


    if (!variant) {

        throw new BadRequestError(
            `Selected variant not found for ${product.product_name}`
        );
    }


    const availableStock = variant.available_stock - (variant.reserved_stock || 0);


    /*
    |--------------------------------------------------------------------------
    | Stock Check
    |--------------------------------------------------------------------------
    */

    if (
        !variant.allow_backorders &&
        availableStock < quantity
    ) {

        throw new BadRequestError(
            `${product.product_name} (${variant.weight}${variant.unit}) is not available. Please choose another variant of the same product.`
        );
    }


    /*
    |--------------------------------------------------------------------------
    | Low Stock Rule
    |--------------------------------------------------------------------------
    */

    const remainingStock = availableStock - quantity;


    if (
        !variant.allow_backorders &&
        remainingStock < variant.low_stock_alert
    ) {

        throw new BadRequestError(
            `${product.product_name} (${variant.weight}${variant.unit}) is not available. Please choose another variant of the same product.`
        );
    }


    return true;
};

module.exports = { updateStockAfterOrder, checkStockBeforeOrder }