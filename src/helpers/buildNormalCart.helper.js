const buildNormalCart = (
    cart,
    catalogMap
) => {

    if (!cart?.items?.length) {
        return [];
    }

    return cart.items.map(item => {

        const catalog = catalogMap.get(
            item.productId.toString()
        );

        if (!catalog) return null;


        // --------------------------------
        // Find Selected Variant
        // --------------------------------

        const variant = catalog.variantDocument?.variants.find(
            variant =>
                variant._id.toString() ===
                item.selectedWeight.toString()
        );

        if (!variant) return null;


        // --------------------------------
        // Calculate Product Amount
        // --------------------------------

        const totalAmount = variant.price * item.quantity;


        // --------------------------------
        // Return Cart Item
        // --------------------------------

        return {

            type: "NORMAL",

            cartItemId: item._id,

            quantity: item.quantity,

            product: {

                _id: catalog.product._id,

                product_name:
                    catalog.product.product_name,

                brand:
                    catalog.product.brand,

                flavor:
                    catalog.product.flavor,

                description:
                    catalog.product.description,

                image:
                    catalog.image?.images?.[0]
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

                    save: variant.you_save

                }

            },

            totalAmount,

            totalWeight:
                variant.weight * item.quantity,

            totalsave:
                variant.you_save * item.quantity

        };

    }).filter(Boolean);
};


module.exports = buildNormalCart;