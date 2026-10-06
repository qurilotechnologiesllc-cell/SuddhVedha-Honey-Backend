const ShippingAddress = require('../models/userShippingAddress.mode')
const User = require('../models/user.model')
const { generateAddressHash } = require('../helpers/addressHelper')
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

    const cleanAddress = {
        address_line1: String(address_line1 || "").trim(),
        address_line2: String(address_line2 || "").trim(),
        city: String(city || "").trim(),
        state: String(state || "").trim(),
        pincode: String(pincode || "").trim(),
        country: String(country || "India").trim()
    }

    // ─── Duplicate Address Check (user_id + address_hash) ───
    const addressHash = generateAddressHash(cleanAddress)

    const addressExists = await ShippingAddress.exists({
        user_id: id,
        address_hash: addressHash
    })

    if (addressExists) {
        throw new ConflictError('This address is already saved')
    }

    // 2. Set is_default: false for all OTHER addresses belonging to this user
    await ShippingAddress.updateMany(
        { user_id: id },
        { $set: { is_default: false } }
    );

    let newShippingAddress
    try {
        newShippingAddress = await ShippingAddress.create({
            user_id: id,
            full_name,
            phone_number,
            ...cleanAddress,
            address_type,
            address_hash: addressHash,
            is_default: true
        })
    } catch (error) {
        // Race condition: do requests ek saath aayi to unique index ne dusri ko roka
        if (error.code === 11000) {
            throw new ConflictError('This address is already saved')
        }
        throw error
    }

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
        return res.status(204).json({
            success: true,
            message: 'No Shipping Addresses found for this user',
            data: []
        });
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

    const cleanAddress = {
        address_line1: String(address_line1 || "").trim(),
        address_line2: String(address_line2 || "").trim(),
        city: String(city || "").trim(),
        state: String(state || "").trim(),
        pincode: String(pincode || "").trim(),
        country: String(country || "India").trim()
    }

    // ─── Duplicate Address Check (user_id + address_hash) ───
    const addressHash = generateAddressHash(cleanAddress)

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
            address_hash: addressHash,
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

