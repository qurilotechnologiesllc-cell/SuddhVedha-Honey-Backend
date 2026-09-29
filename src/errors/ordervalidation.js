const validateOrderItems = (items) => {

    /*
    |--------------------------------------------------------------------------
    | 1. Items
    |--------------------------------------------------------------------------
    */

    if (!Array.isArray(items) || items.length === 0) {
        throw new BadRequestError(
            "Order must contain at least one item"
        );
    }


    /*
    |--------------------------------------------------------------------------
    | 2. Validate Each Item
    |--------------------------------------------------------------------------
    */

    for (const item of items) {

        /*
        |--------------------------------------------------------------------------
        | Type
        |--------------------------------------------------------------------------
        */

        if (!item.type) {
            throw new BadRequestError(
                "Order item type is required"
            );
        }


        /*
        |--------------------------------------------------------------------------
        | Only NORMAL and COMBO are allowed
        |--------------------------------------------------------------------------
        */

        if (!["NORMAL", "COMBO"].includes(item.type)) {
            throw new BadRequestError(
                `Invalid order item type: ${item.type}`
            );
        }


        /*
        |--------------------------------------------------------------------------
        | Product Details
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
        | Quantity
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
        | Reserved Quantity
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
        | Item Total Amount
        |--------------------------------------------------------------------------
        */

        const itemTotalAmount =
            item.product_details.totalAmount;


        if (
            typeof itemTotalAmount !== "number" ||
            !Number.isFinite(itemTotalAmount) ||
            itemTotalAmount < 0
        ) {
            throw new BadRequestError(
                "Valid totalAmount is required for every order item"
            );
        }


        /*
        |--------------------------------------------------------------------------
        | NORMAL Specific Validation
        |--------------------------------------------------------------------------
        */

        if (item.type === "NORMAL") {

            const product =
                item.product_details.product;

            if (
                !product ||
                typeof product !== "object" ||
                Array.isArray(product)
            ) {
                throw new BadRequestError(
                    "Product details are required for NORMAL order item"
                );
            }


            if (!product._id) {
                throw new BadRequestError(
                    "Product ID is required for NORMAL order item"
                );
            }


            if (
                !product.variant ||
                typeof product.variant !== "object"
            ) {
                throw new BadRequestError(
                    "Variant is required for NORMAL order item"
                );
            }


            if (!product.variant._id) {
                throw new BadRequestError(
                    "Variant ID is required for NORMAL order item"
                );
            }
        }


        /*
        |--------------------------------------------------------------------------
        | COMBO Specific Validation
        |--------------------------------------------------------------------------
        |
        | Combo product does NOT have any stock/variant validation.
        | We only need the combo product ID.
        |
        */

        if (item.type === "COMBO") {

            const product =
                item.product_details.product;

            if (
                !product ||
                typeof product !== "object" ||
                Array.isArray(product)
            ) {
                throw new BadRequestError(
                    "Product details are required for COMBO order item"
                );
            }


            if (!product._id) {
                throw new BadRequestError(
                    "Combo product ID is required for COMBO order item"
                );
            }
        }

    }

};


module.exports = validateOrderItems;