const Plans = require('../models/plans.models')
const { asyncHandler, BadRequestError, UnauthorizedError, ConflictError } = require('../errors/errorConfig')

const { uploadToCloudinary, deleteFromCloudinary } = require('../utils/uploadToCloudinary')


const addSubscripationPlans = asyncHandler(async (req, res) => {
    const { role } = req.user

    // Only admin can create subscription plans
    if (role !== 'admin') {
        throw new UnauthorizedError('Plans can only be added by admin')
    }

    // Image is required
    if (!req.file) {
        throw new BadRequestError('Plan image is required')
    }

    const {
        name,
        description,
        packageLabel,
        quantityPerJar,
        quantityUnit,
        numberOfJars,
        totalQuantity,
        totalQuantityUnit,
        idealFor,
        price,
        originalPrice,
        currency,
        badge,
        isPopular,
        isActive,
        displayOrder,
    } = req.body

    // -----------------------------
    // Required field validation
    // -----------------------------

    if (!name || !name.trim()) {
        throw new BadRequestError('Plan name is required')
    }

    if (!description || !description.trim()) {
        throw new BadRequestError('Plan description is required')
    }

    if (!packageLabel || !packageLabel.trim()) {
        throw new BadRequestError('Package label is required')
    }

    if (
        quantityPerJar === undefined ||
        quantityPerJar === null ||
        quantityPerJar === ''
    ) {
        throw new BadRequestError('Quantity per jar is required')
    }

    if (!quantityUnit) {
        throw new BadRequestError('Quantity unit is required')
    }

    if (
        numberOfJars === undefined ||
        numberOfJars === null ||
        numberOfJars === ''
    ) {
        throw new BadRequestError('Number of jars is required')
    }

    if (
        totalQuantity === undefined ||
        totalQuantity === null ||
        totalQuantity === ''
    ) {
        throw new BadRequestError('Total quantity is required')
    }

    if (!totalQuantityUnit) {
        throw new BadRequestError('Total quantity unit is required')
    }

    if (!idealFor || !idealFor.trim()) {
        throw new BadRequestError('Ideal for field is required')
    }

    if (
        price === undefined ||
        price === null ||
        price === ''
    ) {
        throw new BadRequestError('Price is required')
    }

    if (
        originalPrice === undefined ||
        originalPrice === null ||
        originalPrice === ''
    ) {
        throw new BadRequestError('Original price is required')
    }

    // -----------------------------
    // Validate numeric values
    // -----------------------------

    const parsedQuantityPerJar = Number(quantityPerJar)
    const parsedNumberOfJars = Number(numberOfJars)
    const parsedTotalQuantity = Number(totalQuantity)
    const parsedPrice = Number(price)
    const parsedOriginalPrice = Number(originalPrice)

    if (isNaN(parsedQuantityPerJar) || parsedQuantityPerJar < 0) {
        throw new BadRequestError('Invalid quantity per jar')
    }

    if (isNaN(parsedNumberOfJars) || parsedNumberOfJars < 1) {
        throw new BadRequestError('Number of jars must be at least 1')
    }

    if (isNaN(parsedTotalQuantity) || parsedTotalQuantity < 0) {
        throw new BadRequestError('Invalid total quantity')
    }

    if (isNaN(parsedPrice) || parsedPrice < 0) {
        throw new BadRequestError('Invalid price')
    }

    if (
        isNaN(parsedOriginalPrice) ||
        parsedOriginalPrice < 0
    ) {
        throw new BadRequestError('Invalid original price')
    }

    if (parsedPrice > parsedOriginalPrice) {
        throw new BadRequestError(
            'Price cannot be greater than original price'
        )
    }

    // -----------------------------
    // Check duplicate plan name
    // -----------------------------

    const existingPlan = await Plans.findOne({
        name: name.trim(),
    })

    if (existingPlan) {
        throw new ConflictError(
            'A subscription plan with this name already exists'
        )
    }

    // -----------------------------
    // Calculate discount
    // -----------------------------

    let discountPercentage = 0

    if (parsedOriginalPrice > 0) {
        discountPercentage =
            ((parsedOriginalPrice - parsedPrice) /
                parsedOriginalPrice) *
            100

        discountPercentage = Number(
            discountPercentage.toFixed(2)
        )
    }

    // -----------------------------
    // Upload image to Cloudinary
    // -----------------------------

    let cloudinaryResult = await uploadToCloudinary(
        req.file.buffer,
        'sudhvedahoney/plans',
        'image'
    )

    // Make sure Cloudinary returned required values
    if (
        !cloudinaryResult.secure_url ||
        !cloudinaryResult.public_id
    ) {
        throw new BadRequestError(
            'Invalid Cloudinary upload response'
        )
    }

    const image = cloudinaryResult.secure_url
    const public_id = cloudinaryResult.public_id

    try {
        const plan = await Plans.create({
            name: name.trim(),
            description: description.trim(),

            image,
            public_id,

            packageLabel: packageLabel.trim(),

            quantityPerJar: parsedQuantityPerJar,
            quantityUnit,

            numberOfJars: parsedNumberOfJars,

            totalQuantity: parsedTotalQuantity,
            totalQuantityUnit,

            idealFor: idealFor.trim(),

            price: parsedPrice,
            originalPrice: parsedOriginalPrice,
            discountPercentage,

            currency: currency || 'INR',

            badge: badge?.trim() || null,

            isPopular:
                isPopular === true ||
                isPopular === 'true',

            isActive:
                isActive === undefined
                    ? true
                    : isActive === true ||
                    isActive === 'true',

            displayOrder:
                displayOrder !== undefined
                    ? Number(displayOrder)
                    : 0,
        })

        return res.status(201).json({
            success: true,
            message: 'Subscription plan added successfully',
            data: plan,
        })
    } catch (error) {

        try {
            await deleteFromCloudinary(public_id)
        } catch (deleteError) {
            console.error(
                'Failed to delete Cloudinary image after DB error:',
                deleteError
            )
        }

        throw error
    }
})

const getSubscripationPlans = asyncHandler(async (req, res) => {
    const plans = await Plans.find({
        isActive: true,
    })
        .sort({
            displayOrder: 1,
            createdAt: 1,
        })
        .lean()

    return res.status(200).json({
        success: true,
        message: 'Subscription plans fetched successfully',
        count: plans.length,
        data: plans,
    })
})

const removeSubscripationPlans = asyncHandler(async (req, res) => {
    const { plansId } = req.params
    const { role } = req.user

    // Only admin can remove subscription plans
    if (role !== 'admin') {
        throw new UnauthorizedError(
            'Plans can only be removed by admin'
        )
    }

    // Validate plan ID
    if (!plansId) {
        throw new BadRequestError(
            'Subscription plan ID is required'
        )
    }

    // Find the plan first
    const plan = await Plans.findById(plansId)

    if (!plan) {
        throw new NotFoundError(
            'Subscription plan not found'
        )
    }

    // -----------------------------------
    // Remove image from Cloudinary
    // -----------------------------------

    if (plan.public_id) {
        try {
            await deleteFromCloudinary(plan.public_id)
        } catch (error) {
            console.error(
                'Cloudinary image deletion failed:',
                error
            )

            throw new BadRequestError(
                'Failed to remove plan image from Cloudinary. Plan was not deleted.'
            )
        }
    }

    // -----------------------------------
    // Remove plan from database
    // -----------------------------------

    await Plans.findByIdAndDelete(plansId)

    return res.status(200).json({
        success: true,
        message: 'Subscription plan removed successfully',
        data: {
            id: plan._id,
            name: plan.name,
        },
    })
})


module.exports = {
    addSubscripationPlans,
    getSubscripationPlans,
    removeSubscripationPlans
}