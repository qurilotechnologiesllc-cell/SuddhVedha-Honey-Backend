const Order = require('../models/orders.model')

const updateOrderGroupAndOrders = async ({
    orderGroup,
    orderStatus,
    paymentStatus,
    paymentData
}) => {

    /*
    |--------------------------------------------------------------------------
    | 1. Update OrderGroup
    |--------------------------------------------------------------------------
    */

    orderGroup.payment_status = paymentStatus;

    orderGroup.payment = {
        ...orderGroup.payment,

        ...paymentData
    };

    await orderGroup.save();


    /*
    |--------------------------------------------------------------------------
    | 2. Update All Individual Orders
    |--------------------------------------------------------------------------
    */

    await Order.updateMany(

        {
            _id: {
                $in:
                    orderGroup.orderIds
            }
        },

        {
            $set: {

                payment_status: paymentStatus,

                payment_mode: paymentData.method,

                ...(orderStatus && { order_status: orderStatus }),
            }
        }

    );
};

module.exports = updateOrderGroupAndOrders