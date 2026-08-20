const validateOrderItems = (items) => {

    if (!Array.isArray(items) || items.length === 0) {
        throw new BadRequestError(
            "Order must contain at least one item"
        );
    }


    for (const item of items) {

        /*
        |--------------------------------------------------------------------------
        | 1. Type
        |--------------------------------------------------------------------------
        */

        if (!item.type) {
            throw new BadRequestError(
                "Order item type is required"
            );
        }


        if (!["NORMAL", "CUSTOM"].includes(item.type)) {
            throw new BadRequestError(
                `Invalid order item type: ${item.type}`
            );
        }


        /*
        |--------------------------------------------------------------------------
        | 2. Product Details
        |--------------------------------------------------------------------------
        */

        if (
            !item.product_details ||
            typeof item.product_details !== "object" ||
            Array.isArray(item.product_details)
        ) {
            throw new BadRequestError(
                "product_details is required for every order item"
            );
        }


        /*
        |--------------------------------------------------------------------------
        | 3. Quantity
        |--------------------------------------------------------------------------
        */

        if (
            !Number.isInteger(item.quantity) ||
            item.quantity < 1
        ) {
            throw new BadRequestError(
                "Item quantity must be a positive integer"
            );
        }


        /*
        |--------------------------------------------------------------------------
        | 4. Reserved Quantity
        |--------------------------------------------------------------------------
        */

        if (
            !Number.isInteger(item.reserved_quantity) ||
            item.reserved_quantity < 0
        ) {
            throw new BadRequestError(
                "reserved_quantity must be a non-negative integer"
            );
        }


        if (
            item.reserved_quantity >
            item.quantity
        ) {
            throw new BadRequestError(
                "reserved_quantity cannot be greater than quantity"
            );
        }


        /*
        |--------------------------------------------------------------------------
        | 5. Item Final Amount
        |--------------------------------------------------------------------------
        */

        const itemFinalAmount = item.product_details.totalAmount;


        if (
            typeof itemFinalAmount !== "number" ||
            !Number.isFinite(itemFinalAmount) ||
            itemFinalAmount < 0
        ) {
            throw new BadRequestError(
                "Valid finalAmount is required for every order item"
            );
        }


        /*
        |--------------------------------------------------------------------------
        | 6. CUSTOM Item
        |--------------------------------------------------------------------------
        */

        if (item.type === "CUSTOM") {

            /*
            |--------------------------------------------------------------------------
            | Gift Box
            |--------------------------------------------------------------------------
            */

            if (
                !item.product_details.giftBox ||
                typeof item.product_details.giftBox !== "object"
            ) {
                throw new BadRequestError(
                    "CUSTOM order item must contain giftBox"
                );
            }


            /*
            |--------------------------------------------------------------------------
            | Products
            |--------------------------------------------------------------------------
            */

            if (
                !Array.isArray(
                    item.product_details.products
                ) ||
                item.product_details.products.length === 0
            ) {
                throw new BadRequestError(
                    "CUSTOM order item must contain products"
                );
            }


            /*
            |--------------------------------------------------------------------------
            | Validate Gift Box Products
            |--------------------------------------------------------------------------
            */

            for (
                const product
                of item.product_details.products
            ) {

                if (!product.productId) {
                    throw new BadRequestError(
                        "productId is required for custom product"
                    );
                }


                if (!product.variant) {
                    throw new BadRequestError(
                        "variant is required for custom product"
                    );
                }


                if (
                    !Number.isInteger(
                        product.reserved_quantity
                    ) ||
                    product.reserved_quantity < 0
                ) {
                    throw new BadRequestError(
                        "Invalid reserved_quantity in custom product"
                    );
                }


                if (
                    product.reserved_quantity >
                    item.quantity
                ) {
                    throw new BadRequestError(
                        "Custom product reserved_quantity cannot be greater than item quantity"
                    );
                }

            }

        }

    }

};


module.exports = validateOrderItems;