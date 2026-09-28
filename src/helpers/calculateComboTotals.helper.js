const calculateComboTotals = (
    giftItem,
    catalogMap,
    comboPack
) => {

    const quantity = Number(giftItem.quantity || 1);

    let totalWeight = 0;

    const products = giftItem.products.map(item => {

        const catalog = catalogMap.get(
            item.productId.toString()
        );

        if (!catalog) return null;

        const variant = catalog.variantDocument?.variants.find(
            v =>
                v._id.toString() ===
                item.selectedWeight.toString()
        );

        if (!variant) return null;

        // Product weight only
        totalWeight += Number(variant.weight || 0);

        return {
            productId: catalog.product._id,
            product_name: catalog.product.product_name,
            brand: catalog.product.brand,
            flavor: catalog.product.flavor,
            description: catalog.product.description,

            image: catalog.image?.images?.[0]
                ? {
                    image_url:
                        catalog.image.images[0].image_url
                }
                : null,

            variant: {
                _id: variant._id,
                weight: variant.weight,
                sku: variant.sku,
                price: variant.price,
                mrp: variant.mrp,
                save: variant.you_save
            }
        };

    }).filter(Boolean);


    // ==========================================
    // COMBO PACK PRICE
    // ==========================================
    // Individual product prices are NOT added.
    //
    // Example:
    // SetPack selling_price = 999
    // Quantity = 4
    //
    // Total Amount = 999 × 4 = 3996
    // ==========================================

    const totalAmount =
        Number(comboPack?.selling_price || 0) * quantity;


    // ==========================================
    // COMBO PACK SAVING
    // ==========================================

    const totalsave =
        (
            Number(comboPack?.mrp || 0) -
            Number(comboPack?.selling_price || 0)
        ) * quantity;


    // ==========================================
    // TOTAL WEIGHT
    // ==========================================

    const totalWeightWithQuantity =
        totalWeight * quantity;


    return {
        products,

        totalWeight: totalWeightWithQuantity,

        totalAmount,

        totalsave
    };
};


module.exports = calculateComboTotals;