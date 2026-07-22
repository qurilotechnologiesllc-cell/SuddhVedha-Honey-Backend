const calculateGiftTotals = require("./calculateGiftTotals.helper");

const buildGiftCart = (

    giftCart,

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

            totalAmount

        } = calculateGiftTotals(

            item,

            catalogMap,

            giftBoxMap

        );

        return {

            type: "CUSTOM",

            giftCartItemId: item._id,

            quantity: item.quantity,

            customMessage: item.customMessage,

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

            totalAmount

        };

    });

};

module.exports = buildGiftCart;