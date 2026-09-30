const Cart = require("../models/cart.model");

const removeOrderedItemsFromCart = async (userId, items) => {

    /*
    |--------------------------------------------------------------------------
    | Collect cart item IDs from order items
    |--------------------------------------------------------------------------
    */

    const cartItemIds = items
        .map(item => item.product_details?.cartItemId)
        .filter(Boolean);


    /*
    |--------------------------------------------------------------------------
    | Nothing to remove
    |--------------------------------------------------------------------------
    */

    if (cartItemIds.length === 0) {
        return;
    }


    /*
    |--------------------------------------------------------------------------
    | Find user's cart and remove ordered items
    |--------------------------------------------------------------------------
    */

    const cart = await Cart.findOneAndUpdate(
        {
            userId
        },
        {
            $pull: {
                items: {
                    _id: {
                        $in: cartItemIds
                    }
                }
            }
        },
        {
            new: true
        }
    );


    /*
    |--------------------------------------------------------------------------
    | Cart not found
    |--------------------------------------------------------------------------
    */

    if (!cart) {
        return;
    }


    /*
    |--------------------------------------------------------------------------
    | If no items are left,
    | delete complete cart document
    |--------------------------------------------------------------------------
    */

    if (cart.items.length === 0) {

        await Cart.deleteOne({
            _id: cart._id
        });

    }
};


module.exports = removeOrderedItemsFromCart;