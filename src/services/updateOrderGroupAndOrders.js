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

                ...(paymentData.razorpay_order_id && {
                    "payment.razorpay_order_id":
                        paymentData.razorpay_order_id
                }),

                ...(paymentData.razorpay_payment_id && {
                    "payment.razorpay_payment_id":
                        paymentData.razorpay_payment_id
                }),

                ...(paymentData.method && {
                    "payment.method":
                        paymentData.method
                }),

                ...(paymentData.amount !== undefined && {
                    "payment.amount":
                        paymentData.amount
                }),

                ...(paymentData.currency && {
                    "payment.currency":
                        paymentData.currency
                }),

                ...(paymentData.status && {
                    "payment.status":
                        paymentData.status
                }),

                ...(paymentData.captured !== undefined && {
                    "payment.captured":
                        paymentData.captured
                }),

                ...(paymentData.email && {
                    "payment.email":
                        paymentData.email
                }),

                ...(paymentData.contact && {
                    "payment.contact":
                        paymentData.contact
                }),

                ...(paymentData.bank && {
                    "payment.bank":
                        paymentData.bank
                }),

                ...(paymentData.wallet && {
                    "payment.wallet":
                        paymentData.wallet
                }),

                ...(paymentData.vpa && {
                    "payment.vpa":
                        paymentData.vpa
                }),

                ...(paymentData.fee !== undefined && {
                    "payment.fee":
                        paymentData.fee
                }),

                ...(paymentData.tax !== undefined && {
                    "payment.tax":
                        paymentData.tax
                }),

                ...(paymentData.acquirer_data && {
                    "payment.acquirer_data":
                        paymentData.acquirer_data
                }),

                ...(paymentData.error_code && {
                    "payment.error_code":
                        paymentData.error_code
                }),

                ...(paymentData.error_description && {
                    "payment.error_description":
                        paymentData.error_description
                }),

                ...(paymentData.error_source && {
                    "payment.error_source":
                        paymentData.error_source
                }),

                ...(paymentData.error_step && {
                    "payment.error_step":
                        paymentData.error_step
                }),

                ...(paymentData.error_reason && {
                    "payment.error_reason":
                        paymentData.error_reason
                })
            }
        }

    );
};

module.exports = updateOrderGroupAndOrders