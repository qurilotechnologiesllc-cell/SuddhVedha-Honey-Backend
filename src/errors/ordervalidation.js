const validateOrderItems = (items) => {

    if (!Array.isArray(items) || items.length === 0) {
        throw new BadRequestError(
            'Order must contain at least one item'
        )
    }


    for (const item of items) {

        // Type
        if (!item.type) {
            throw new BadRequestError(
                'Order item type is required'
            )
        }


        if (!['NORMAL', 'CUSTOM'].includes(item.type)) {
            throw new BadRequestError(
                `Invalid order item type: ${item.type}`
            )
        }


        // Product Details
        if (
            !item.product_details ||
            typeof item.product_details !== 'object' ||
            Array.isArray(item.product_details)
        ) {
            throw new BadRequestError(
                'product_details is required for every order item'
            )
        }


        // Quantity
        if (
            !Number.isInteger(item.quantity) ||
            item.quantity < 1
        ) {
            throw new BadRequestError(
                'Item quantity must be a positive integer'
            )
        }


        // Reserved Quantity
        if (
            !Number.isInteger(item.reserved_quantity) ||
            item.reserved_quantity < 0
        ) {
            throw new BadRequestError(
                'reserved_quantity must be a non-negative integer'
            )
        }


        /*
        |--------------------------------------------------------------------------
        | CUSTOM item validation
        |--------------------------------------------------------------------------
        |
        | Custom gift cart should contain products array.
        |
        */

        if (item.type === 'CUSTOM') {

            if (
                !Array.isArray(item.product_details.products) ||
                item.product_details.products.length === 0
            ) {
                throw new BadRequestError(
                    'CUSTOM order item must contain products'
                )
            }


            /*
            |--------------------------------------------------------------------------
            | Validate reserved quantity for products inside gift box
            |--------------------------------------------------------------------------
            */

            for (
                const product
                of item.product_details.products
            ) {

                if (
                    !product.reserved_quantity &&
                    product.reserved_quantity !== 0
                ) {
                    throw new BadRequestError(
                        'reserved_quantity is required for custom products'
                    )
                }


                if (
                    !Number.isInteger(
                        product.reserved_quantity
                    ) ||
                    product.reserved_quantity < 0
                ) {
                    throw new BadRequestError(
                        'Invalid reserved_quantity in custom product'
                    )
                }
            }
        }
    }
}


module.exports = validateOrderItems