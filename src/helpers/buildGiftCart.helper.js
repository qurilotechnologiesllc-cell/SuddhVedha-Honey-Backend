const calculateComboTotals = require("./calculateComboTotals.helper");


const buildGiftCart = (
    comboCart,
    catalogMap,
    comboPackMap
) => {

    if (!comboCart?.items?.length) {
        return [];
    }


    return comboCart.items.map(item => {

        // =================================================
        // Get ComboPack
        // =================================================

        const comboPack = comboPackMap.get(
            item.setPackId.toString()
        );


        if (!comboPack) {
            return null;
        }


        // =================================================
        // Calculate Combo Details
        // =================================================

        const {
            products,
            totalWeight,
            totalAmount,
            totalsave
        } = calculateComboTotals(

            item,

            catalogMap,

            comboPack

        );


        // =================================================
        // Response
        // =================================================

        return {

            type: "CUSTOM",

            comboCartItemId:
                item._id,

            quantity:
                item.quantity,


            // =================================================
            // SetPack Information
            // =================================================

            setPack: {

                _id:
                    comboPack._id,

                comboProductId:
                    comboPack.comboProductId,

                pack_name:
                    comboPack.pack_name,

                pack_size:
                    comboPack.pack_size,

                mrp:
                    comboPack.mrp,

                selling_price:
                    comboPack.selling_price,

                discount_percent:
                    comboPack.discount_percent,

                image:
                    comboPack.image,

                public_id:
                    comboPack.public_id

            },


            // =================================================
            // Products
            // =================================================

            products,


            // =================================================
            // Summary
            // =================================================

            totalWeight,

            totalAmount,

            totalsave

        };

    }).filter(Boolean);

};


module.exports = buildGiftCart;