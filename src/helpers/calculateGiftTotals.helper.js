const calculateGiftTotals = (
    giftItem,
    catalogMap,
    giftBoxMap
) => {

    let totalWeight = 0;
    let totalAmount = 0;

    const giftBox = giftBoxMap.get(
        giftItem.giftBoxId.toString()
    );

    if (giftBox) {

        totalAmount += giftBox.price;

    }

    const products = giftItem.products.map(item => {

        const catalog = catalogMap.get(
            item.productId.toString()
        );

        if (!catalog) return null;

        const variant = catalog.variantDocument?.variants.find(
            variant =>
                variant._id.toString() ===
                item.selectedWeight.toString()
        );

        if (!variant) return null;

        totalAmount += variant.price;

        totalWeight += parseInt(variant.weight);

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

                price: variant.price,

                mrp: variant.mrp,

                discount: variant.discount

            }

        };

    }).filter(Boolean);

    return {

        products,

        totalWeight,

        packingPrice: giftBox?.price || 0,

        totalAmount

    };

};

module.exports = calculateGiftTotals;