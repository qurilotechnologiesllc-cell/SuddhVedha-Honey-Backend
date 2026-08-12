const ShippingAddress = require('../models/userShippingAddress.mode')
const User = require('../models/user.model')
const { asyncHandler, BadRequestError, UnauthorizedError, NotFoundError, ConflictError } = require('../errors/errorConfig')

const addShippingAddress = asyncHandler(async (req, res) => {
    const { id } = req.user
    const user = await User.findById(id)

    if (!user) {
        throw new BadRequestError('User not found!')
    }

    const { full_name, phone_number, address_line1, address_line2, city, state, pincode, country, address_type } = req.body;

    // Validation
    if (!full_name || !phone_number || !address_line1 || !city || !state || !pincode || !address_type) {
        throw new BadRequestError('All required fields must be provided');
    }

    // ─── Phone Validation ─────────────────────────
    const phoneRegex = /^[6-9][0-9]{9}$/
    if (!phoneRegex.test(phone_number)) {
        throw new BadRequestError(
            'Invalid phone number. Must be 10 digits starting with 6-9'
        )
    }

    // 2. Set is_default: false for all OTHER addresses belonging to this user
    await ShippingAddress.updateMany(
        {
            user_id: id
        },
        { $set: { is_default: false } }
    );

    const newShippingAddress = await ShippingAddress.create({
        user_id: id,
        full_name,
        phone_number,
        address_line1,
        address_line2,
        city,
        state,
        pincode,
        country,
        address_type,
        is_default: true
    })

    await newShippingAddress.save()

    res.status(201).json({
        success: true,
        message: 'New Shipping Address added successfully',
        data: newShippingAddress
    });
});


const getUserAllShippingAddress = asyncHandler(async (req, res) => {
    const { id } = req.user
    const user = await User.findById(id)

    if (!user) {
        throw new NotFoundError('User not found!')
    }

    const AllShippingAddress = await ShippingAddress.find({ user_id: id })

    if (!AllShippingAddress || AllShippingAddress.length === 0) {
        throw new NotFoundError('No Shipping Address found for this users')
    }

    res.status(200).json({
        success: true,
        message: 'Shipping Addresses retrieved successfully',
        data: AllShippingAddress
    });
});


const editShippingAddress = asyncHandler(async (req, res) => {
    const { id } = req.user;
    const { shippingAddressId } = req.params;

    const { full_name, phone_number, address_line1, address_line2, city, state, pincode, country, address_type } = req.body;

    if (!full_name || !phone_number || !address_line1 || !city || !state || !pincode || !address_type) {
        throw new BadRequestError('All required fields must be provided');
    }

    // 1. Find and update the targeted shipping address
    const shippingAddress = await ShippingAddress.findOneAndUpdate(
        { _id: shippingAddressId, user_id: id },
        {
            full_name,
            phone_number,
            address_line1,
            address_line2,
            city,
            state,
            pincode,
            country,
            address_type,
            is_default: true
        },
        { new: true }
    );

    if (!shippingAddress) {
        throw new NotFoundError('Shipping Address not found for this User');
    }

    // 2. Set is_default: false for all OTHER addresses belonging to this user
    await ShippingAddress.updateMany(
        {
            user_id: id,
            _id: { $ne: shippingAddressId } // Using $ne (not equal) or $nin: [shippingAddressId]
        },
        { $set: { is_default: false } }
    );

    res.status(200).json({
        success: true,
        message: 'Shipping Address updated successfully',
        data: shippingAddress
    });
});


const deleteShippingAddress = asyncHandler(async (req, res) => {
    const { id } = req.user
    const { shippingAddressId } = req.params

    const user = await User.findById(id)

    if (!user) {
        throw new BadRequestError('User not found!')
    }

    const shippingAddress = await ShippingAddress.findOne({ _id: shippingAddressId, user_id: id })

    if (!shippingAddress) {
        throw new NotFoundError('No Shipping Address found for this users')
    }

    await ShippingAddress.deleteOne({ _id: shippingAddressId })

    res.status(200).json({
        success: true,
        message: 'Shipping Address deleted successfully'
    });

});

module.exports = {
    addShippingAddress,
    getUserAllShippingAddress,
    editShippingAddress,
    deleteShippingAddress
}

