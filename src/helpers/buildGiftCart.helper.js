const calculateGiftTotals = require("./calculateGiftTotals.helper");

const buildGiftCart = (

    giftCart,

    catalogMap,

    giftBoxMap,

    giftWrapMap

) => {

    if (!giftCart?.items?.length) {

        return [];

    }

    return giftCart.items.map(item => {

        const giftBox = giftBoxMap.get(
            item.giftBoxId.toString()
        );

        const giftWrap = giftWrapMap.get(
            item.giftWrapId?.toString()
        );

        const {

            products,

            totalWeight,

            packingPrice,

            totalAmount

        } = calculateGiftTotals(

            item,

            catalogMap,

            giftBoxMap,

            giftWrapMap

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

                    image: giftBox.image

                }
                : null,

            giftWrap: giftWrap
                ? {

                    _id: giftWrap._id,

                    color: giftWrap.color

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