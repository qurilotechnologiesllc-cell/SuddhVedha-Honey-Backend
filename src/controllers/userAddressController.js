const Address = require('../models/userAddress.model')
const User = require('../models/user.model')
const { asyncHandler, ConflictError, BadRequestError, UnauthorizedError, ForbiddenError, NotFoundError, ValidationError, TooManyRequestsError, ServiceUnavailableError } = require('../errors/errorConfig')

const addUserAddress = asyncHandler(async (req, res) => {
    const id = req.user.id
   const user = await User.findById(id)
   
    if (!user) {
        throw new NotFoundError('User not found');
    }

    const { full_name, phone, address_line1, address_line2, city, state, pincode, country, address_type } = req.body;

    // Validation
    if (!full_name || !phone || !address_line1 || !city || !state || !pincode || !address_type) {
        throw new BadRequestError('All required fields must be provided');
    }

    // Create a new address document
    const newAddress = new Address({
        user_id: id,
        full_name,
        phone,
        address_line1,
        address_line2,
        city,
        state,
        pincode,
        country,
        address_type
    });

    await newAddress.save();

    res.status(201).json({
        success: true,
        message: 'Address added successfully',
        data: newAddress
    });
})

const getUserAddresses = asyncHandler(async (req, res) => {
    const id = req.user.id
    const user = await User.findById(id)

    if (!user) {
        throw new NotFoundError('User not found');
    }

    const addresses = await Address.find({ user_id: id });

    if (!addresses || addresses.length === 0) {
        throw new NotFoundError('No addresses found for this user');
    }
    
    res.status(200).json({
        success: true,
        message: 'Addresses retrieved successfully',
        data: addresses
    });
});

const deleteUserAddress = asyncHandler(async (req, res) => {
    const id = req.user.id
    const user = await User.findById(id)

    if (!user) {
        throw new NotFoundError('User not found');
    }

    const addressId = req.params.addressId;

    const address = await Address.findOne({ _id: addressId, user_id: id });

    if (!address) {
        throw new NotFoundError('Address not found for this user');
    }

    await Address.deleteOne({ _id: addressId });

    res.status(200).json({
        success: true,
        message: 'Address deleted successfully'
    });
});

const updateUserAddress = asyncHandler(async (req, res) => {
    const id = req.user.id
    const user = await User.findById(id)

    if (!user) {
        throw new NotFoundError('User not found');
    }

    const addressId = req.params.addressId;
    const { full_name, phone, address_line1, address_line2, city, state, pincode, country, address_type } = req.body;

    // Validation
    if (!full_name || !phone || !address_line1 || !city || !state || !pincode || !address_type) {
        throw new BadRequestError('All required fields must be provided');
    }

    const address = await Address.findOne({ _id: addressId, user_id: id });

    if (!address) {
        throw new NotFoundError('Address not found for this user');
    }

    // Update the address fields
    address.full_name = full_name;
    address.phone = phone;
    address.address_line1 = address_line1;
    address.address_line2 = address_line2;
    address.city = city;
    address.state = state;
    address.pincode = pincode;
    address.country = country;
    address.address_type = address_type;

    await address.save();

    res.status(200).json({
        success: true,
        message: 'Address updated successfully',
        data: address
    });
});


module.exports = { addUserAddress, getUserAddresses, deleteUserAddress , updateUserAddress}    

