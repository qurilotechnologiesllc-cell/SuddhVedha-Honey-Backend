const calculateGiftTotals = require("./calculateGiftTotals.helper");

const buildGiftCart = (
    giftCart,
    offerMap,
    catalogMap,
    giftBoxMap
) => {

    if (!giftCart?.items?.length) {
        return [];
    }

    return giftCart.items.map(item => {

        const giftBox = giftBoxMap.get(
            item.giftBoxId.toString()
        );


        const {
            products,
            totalWeight,
            packingPrice,
            totalAmount,
            totalsave
        } = calculateGiftTotals(
            item,
            catalogMap,
            giftBoxMap
        );


        let couponDiscount = 0;
        let finalAmount = totalAmount;
        let offer = null;


        if (item.couponId) {

            // Find Offer using couponId
            offer = offerMap.get(
                item.couponId.toString()
            );


            if (offer) {

                if (offer.discountType === "PERCENTAGE") {

                    couponDiscount =
                        (totalAmount * offer.discountValue) / 100;

                }



                else if (offer.discountType === "FLAT") {

                    couponDiscount =
                        offer.discountValue;

                }


                // ----------------------------
                // Prevent Excess Discount
                // ----------------------------

                couponDiscount = Math.min(
                    couponDiscount,
                    totalAmount
                );


                // ----------------------------
                // Final Amount
                // ----------------------------

                finalAmount = Math.max(
                    totalAmount - couponDiscount,
                    0
                );

            }

        }

        return {

            type: "CUSTOM",

            giftCartItemId: item._id,

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

            giftBox: giftBox
                ? {

                    _id: giftBox._id,

                    name: giftBox.name,

                    image: giftBox.image,

                    price: giftBox.price

                }
                : null,

            products,

            totalWeight,

            packingPrice,

            totalAmount,

            couponDiscount,

            finalAmount,

            totalsave

        };

    });
};


module.exports = buildGiftCart;