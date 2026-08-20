const calculateGiftTotals = (
    giftItem,
    catalogMap,
    giftBoxMap
) => {

    const quantity = giftItem.quantity || 1  // ← Quantity lo

    let totalWeight = 0
    let totalAmount = 0  // ← 1 box ka amount
    let totalsave = 0

    const giftBox = giftBoxMap.get(
        giftItem.giftBoxId.toString()
    )

    // ── GiftBox Price (1 box ka) ──────────────────
    if (giftBox) {
        totalAmount += giftBox.price
    }

    // ── Products Price (1 box ke andar) ──────────
    const products = giftItem.products.map(item => {

        const catalog = catalogMap.get(
            item.productId.toString()
        )

        if (!catalog) return null

        const variant = catalog.variantDocument?.variants.find(
            v => v._id.toString() === item.selectedWeight.toString()
        )

        if (!variant) return null

        totalAmount += variant.price      // ← 1 box ka product price
        totalWeight += parseInt(variant.weight)
        totalsave += variant.you_save

        return {
            productId: catalog.product._id,
            product_name: catalog.product.product_name,
            brand: catalog.product.brand,
            flavor: catalog.product.flavor,
            description: catalog.product.description,
            image: catalog.image?.images?.[0]
                ? { image_url: catalog.image.images[0].image_url }
                : null,
            variant: {
                _id: variant._id,
                weight: variant.weight,
                price: variant.price,
                mrp: variant.mrp,
                save: variant.you_save
            }
        }

    }).filter(Boolean)

    // ── Quantity ke saath Multiply karo ──────────
    // 1 box: giftBox(250) + products(299+449) = 998
    // 4 box: 998 × 4 = 3992
    const totalAmountWithQuantity = totalAmount * quantity
    const totalWeightWithQuantity = totalWeight * quantity
    const totalsaveWithQuantity = totalsave * quantity

    return {
        products,
        totalWeight: totalWeightWithQuantity,  // ← × quantity
        packingPrice: giftBox?.price || 0,
        totalAmount: totalAmountWithQuantity,   // ← × quantity
        totalsave: totalsaveWithQuantity      // ← × quantity
    }
}

module.exports = calculateGiftTotals