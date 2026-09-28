
const Cart = require('../models/cart.model')
const ComboCart = require('../models/ComboCart.model')


const removeOrderedItemsFromCart = async (userId, items) => {

    const normalCartItemIds = []
    const giftCartItemIds = []


    for (const item of items) {

        if (item.type === 'NORMAL') {

            normalCartItemIds.push(
                item.product_details.cartItemId
            )

        }

        if (item.type === 'CUSTOM') {

            giftCartItemIds.push(
                item.product_details.giftCartItemId
            )
        }
    }


    /*
    |--------------------------------------------------------------------------
    | Remove NORMAL items
    |--------------------------------------------------------------------------
    */

    if (normalCartItemIds.length > 0) {

        const cart = await Cart.findOneAndUpdate(
            {
                userId
            },
            {
                $pull: {
                    items: {
                        _id: {
                            $in: normalCartItemIds
                        }
                    }
                }
            },
            {
                new: true
            }
        )


        /*
        |--------------------------------------------------------------------------
        | If cart exists and no items are left,
        | delete complete cart document
        |--------------------------------------------------------------------------
        */

        if (
            cart &&
            cart.items.length === 0
        ) {

            await Cart.deleteOne({
                _id: cart._id
            })
        }
    }


    /*
    |--------------------------------------------------------------------------
    | Remove CUSTOM / Gift Cart items
    |--------------------------------------------------------------------------
    */

    if (giftCartItemIds.length > 0) {

        const comboCart = await ComboCart.findOneAndUpdate(
            {
                userId
            },
            {
                $pull: {
                    items: {
                        _id: {
                            $in: giftCartItemIds
                        }
                    }
                }
            },
            {
                new: true
            }
        )


        /*
        |--------------------------------------------------------------------------
        | If gift cart exists and no items are left,
        | delete complete gift cart document
        |--------------------------------------------------------------------------
        */

        if (
            comboCart &&
            comboCart.items.length === 0
        ) {

            await ComboCart.deleteOne({
                _id: comboCart._id
            })
        }
    }
}

module.exports = removeOrderedItemsFromCart
