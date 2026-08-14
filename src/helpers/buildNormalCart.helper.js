const buildNormalCart = (
    cart,
    offerMap,
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

        const totalAmount =
            variant.price * item.quantity;


        // --------------------------------
        // Coupon Calculation
        // --------------------------------

        let discount = 0;
        let finalAmount = totalAmount;
        let offer = null;


        if (item.couponId) {

            offer = offerMap.get(
                item.couponId.toString()
            );


            if (offer) {

                // ----------------------------
                // Percentage Discount
                // ----------------------------

                if (offer.discountType === "PERCENTAGE") {

                    discount =
                        (totalAmount * offer.discountValue) / 100;

                }


                // ----------------------------
                // Flat Discount
                // ----------------------------

                else if (offer.discountType === "FLAT") {

                    discount = offer.discountValue;

                }


                // ----------------------------
                // Prevent Discount > Amount
                // ----------------------------

                discount = Math.min(
                    discount,
                    totalAmount
                );


                // ----------------------------
                // Final Amount
                // ----------------------------

                finalAmount =
                    Math.max(
                        totalAmount - discount,
                        0
                    );

            }

        }


        // --------------------------------
        // Return Cart Item
        // --------------------------------

        return {

            type: "NORMAL",

            cartItemId: item._id,

            quantity: item.quantity,

            coupon: offer
                ? {
                    _id: offer._id,
                    title: offer.title,
                    couponCode: offer.couponCode,
                    discountType: offer.discountType,
                    discountValue: offer.discountValue
                }
                : null,

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

            couponDiscount: discount,

            finalAmount,

            totalWeight:
                variant.weight * item.quantity,

            totalsave:
                variant.you_save * item.quantity

        };

    }).filter(Boolean);
};


module.exports = buildNormalCart;