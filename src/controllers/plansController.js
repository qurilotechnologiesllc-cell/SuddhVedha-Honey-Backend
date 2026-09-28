const mongoose = require("mongoose");
const Plans = require('../models/plans.models')
const PlanComboSet = require('../models/PlanComboSet.model')
const { asyncHandler, BadRequestError, UnauthorizedError, ConflictError } = require('../errors/errorConfig')

const { uploadToCloudinary, deleteFromCloudinary } = require('../utils/uploadToCloudinary')


const addSubscripationPlans = asyncHandler(async (req, res) => {

    const { role } = req.user;

    // ==========================================
    // ADMIN CHECK
    // ==========================================

    if (role !== "admin") {
        throw new UnauthorizedError(
            "Plans can only be added by admin"
        );
    }


    // ==========================================
    // REQUEST BODY
    // ==========================================

    const {
        name,
        description,
        idealFor,

        // Pricing
        price,
        originalPrice,
        currency,

        // Badge
        badge,
        isPopular,

        // Duration
        durationMonths,

        // Status
        isActive
    } = req.body;


    // ==========================================
    // IMAGE VALIDATION
    // ==========================================

    if (!req.file) {
        throw new BadRequestError(
            "Plan image is required"
        );
    }


    if (!req.file.buffer) {
        throw new BadRequestError(
            "Plan image buffer is missing"
        );
    }


    // ==========================================
    // BASIC FIELD VALIDATION
    // ==========================================

    if (
        !name ||
        typeof name !== "string" ||
        !name.trim()
    ) {
        throw new BadRequestError(
            "Plan name is required"
        );
    }


    if (
        !description ||
        typeof description !== "string" ||
        !description.trim()
    ) {
        throw new BadRequestError(
            "Plan description is required"
        );
    }


    if (
        !idealFor ||
        typeof idealFor !== "string" ||
        !idealFor.trim()
    ) {
        throw new BadRequestError(
            "Ideal for field is required"
        );
    }


    // ==========================================
    // DURATION VALIDATION
    // ==========================================

    if (
        durationMonths === undefined ||
        durationMonths === null ||
        durationMonths === ""
    ) {
        throw new BadRequestError(
            "Duration months is required"
        );
    }


    const parsedDurationMonths =
        Number(durationMonths);


    if (
        !Number.isInteger(parsedDurationMonths) ||
        parsedDurationMonths < 1
    ) {
        throw new BadRequestError(
            "Duration months must be a valid positive integer"
        );
    }


    // ==========================================
    // PRICE VALIDATION
    // ==========================================

    if (
        price === undefined ||
        price === null ||
        price === ""
    ) {
        throw new BadRequestError(
            "Price is required"
        );
    }


    if (
        originalPrice === undefined ||
        originalPrice === null ||
        originalPrice === ""
    ) {
        throw new BadRequestError(
            "Original price is required"
        );
    }


    const parsedPrice =
        Number(price);

    const parsedOriginalPrice =
        Number(originalPrice);


    if (
        !Number.isFinite(parsedPrice) ||
        parsedPrice < 0
    ) {
        throw new BadRequestError(
            "Invalid price"
        );
    }


    if (
        !Number.isFinite(parsedOriginalPrice) ||
        parsedOriginalPrice < 0
    ) {
        throw new BadRequestError(
            "Invalid original price"
        );
    }


    if (
        parsedPrice > parsedOriginalPrice
    ) {
        throw new BadRequestError(
            "Price cannot be greater than original price"
        );
    }


    // ==========================================
    // CALCULATE DISCOUNT
    // ==========================================

    let discountPercentage = 0;


    if (parsedOriginalPrice > 0) {

        discountPercentage =
            (
                (parsedOriginalPrice - parsedPrice) /
                parsedOriginalPrice
            ) * 100;


        discountPercentage =
            Number(
                discountPercentage.toFixed(2)
            );
    }


    // ==========================================
    // CHECK DUPLICATE PLAN
    // ==========================================

    const existingPlan =
        await Plans.findOne({
            name: name.trim()
        });


    if (existingPlan) {
        throw new ConflictError(
            "A subscription plan with this name already exists"
        );
    }


    // ==========================================
    // UPLOAD IMAGE TO CLOUDINARY
    // ==========================================

    const uploadedImage =
        await uploadToCloudinary(
            req.file.buffer,
            "sudhvedahoney/plans"
        );


    // ==========================================
    // VALIDATE CLOUDINARY RESPONSE
    // ==========================================

    if (
        !uploadedImage ||
        !uploadedImage.secure_url ||
        !uploadedImage.public_id
    ) {
        throw new BadRequestError(
            "Failed to upload plan image"
        );
    }


    // ==========================================
    // CREATE PLAN
    // ==========================================

    let plan;

    try {

        plan = await Plans.create({

            // --------------------------------------
            // Basic Information
            // --------------------------------------

            name:
                name.trim(),

            image_url:
                uploadedImage.secure_url,

            public_id:
                uploadedImage.public_id,

            description:
                description.trim(),

            idealFor:
                idealFor.trim(),


            // --------------------------------------
            // Duration
            // --------------------------------------

            durationMonths:
                parsedDurationMonths,


            // --------------------------------------
            // ComboSet Reference
            // --------------------------------------

            comboSetId:
                null,


            // --------------------------------------
            // Pricing
            // --------------------------------------

            price:
                parsedPrice,

            originalPrice:
                parsedOriginalPrice,

            discountPercentage:
                discountPercentage,


            // --------------------------------------
            // Other
            // --------------------------------------

            currency:
                currency?.trim() || "INR",

            badge:
                badge?.trim() || null,

            isPopular:
                isPopular === true ||
                isPopular === "true",

            isActive:
                isActive === undefined
                    ? true
                    : isActive === true ||
                    isActive === "true"
        });

    } catch (error) {

        // ==========================================
        // DATABASE FAILED AFTER CLOUDINARY UPLOAD
        // Remove uploaded image to avoid orphan image
        // ==========================================

        if (uploadedImage.public_id) {

            try {

                await deleteFromCloudinary(
                    uploadedImage.public_id
                );

            } catch (deleteError) {

                console.error(
                    "Failed to cleanup Cloudinary image:",
                    deleteError
                );

            }
        }

        throw error;
    }


    // ==========================================
    // RESPONSE
    // ==========================================

    return res.status(201).json({

        success: true,

        message:
            "Subscription plan added successfully",

        data:
            plan
    });
});

const AddComboSetsInPlans = asyncHandler(async (req, res) => {
    const { role } = req.user;

    // ==========================================
    // ADMIN CHECK
    // ==========================================

    if (role !== "admin") {
        throw new UnauthorizedError(
            "Plans can only be added by admin"
        );
    }

    const {
        planId,
        monthName,
        title,
        products,
        season,
        harvestTitle,
        description,
        readMore
    } = req.body;

    // ==========================================
    // VALIDATE PLAN ID
    // ==========================================

    if (!planId) {
        throw new BadRequestError(
            "Plan ID is required"
        );
    }

    if (!mongoose.Types.ObjectId.isValid(planId)) {
        throw new BadRequestError(
            "Invalid plan ID"
        );
    }

    // ==========================================
    // FIND PLAN
    // ==========================================

    const plan = await Plans.findById(planId);

    if (!plan) {
        throw new NotFoundError(
            "Subscription plan not found"
        );
    }

    // ==========================================
    // VALIDATE BASIC FIELDS
    // ==========================================

    if (
        !monthName ||
        typeof monthName !== "string" ||
        !monthName.trim()
    ) {
        throw new BadRequestError(
            "Month name is required"
        );
    }

    if (
        !title ||
        typeof title !== "string" ||
        !title.trim()
    ) {
        throw new BadRequestError(
            "Title is required"
        );
    }

    if (
        !season ||
        typeof season !== "string" ||
        !season.trim()
    ) {
        throw new BadRequestError(
            "Season is required"
        );
    }

    if (
        !harvestTitle ||
        typeof harvestTitle !== "string" ||
        !harvestTitle.trim()
    ) {
        throw new BadRequestError(
            "Harvest title is required"
        );
    }

    if (
        !description ||
        typeof description !== "string" ||
        !description.trim()
    ) {
        throw new BadRequestError(
            "Description is required"
        );
    }

    if (
        !readMore ||
        typeof readMore !== "string" ||
        !readMore.trim()
    ) {
        throw new BadRequestError(
            "Read more content is required"
        );
    }

    // ==========================================
    // PARSE PRODUCTS
    // ==========================================

    let parsedProducts = products;

    if (typeof products === "string") {
        try {
            parsedProducts = JSON.parse(products);
        } catch (error) {
            throw new BadRequestError(
                "Products must be a valid JSON array"
            );
        }
    }

    // ==========================================
    // VALIDATE PRODUCTS ARRAY
    // ==========================================

    if (
        !Array.isArray(parsedProducts) ||
        parsedProducts.length === 0
    ) {
        throw new BadRequestError(
            "At least one product is required"
        );
    }

    // ==========================================
    // VALIDATE EACH PRODUCT
    // ==========================================

    parsedProducts = parsedProducts.map(
        (product, index) => {

            if (
                !product ||
                typeof product !== "object"
            ) {
                throw new BadRequestError(
                    `Invalid product at index ${index}`
                );
            }

            if (
                !product.name ||
                typeof product.name !== "string" ||
                !product.name.trim()
            ) {
                throw new BadRequestError(
                    `Product name is required at index ${index}`
                );
            }

            const weight = Number(product.weight);

            if (
                !Number.isFinite(weight) ||
                weight <= 0
            ) {
                throw new BadRequestError(
                    `Invalid product weight at index ${index}`
                );
            }

            // Only 500g products allowed
            if (weight !== 500) {
                throw new BadRequestError(
                    `Product weight must be 500g at index ${index}`
                );
            }

            if (product.unit !== "g") {
                throw new BadRequestError(
                    `Product unit must be g at index ${index}`
                );
            }

            return {
                name: product.name.trim(),
                weight: 500,
                unit: "g"
            };
        }
    );

    // ==========================================
    // FIND EXISTING PLAN COMBO SET
    // ==========================================

    let planComboSet = null;

    if (plan.comboSetId) {

        planComboSet =
            await PlanComboSet.findById(
                plan.comboSetId
            );

        if (!planComboSet) {
            throw new NotFoundError(
                "Plan combo set document not found"
            );
        }
    }

    // ==========================================
    // DUPLICATE MONTH CHECK
    // ==========================================

    if (planComboSet) {

        const normalizedMonthName =
            monthName.trim().toLowerCase();

        const monthAlreadyExists =
            planComboSet.combosets.some(
                combo =>
                    combo.monthName
                        ?.trim()
                        .toLowerCase() ===
                    normalizedMonthName
            );

        if (monthAlreadyExists) {
            throw new ConflictError(
                `${monthName.trim()} combo set already exists for this plan`
            );
        }
    }

    // ==========================================
    // IMAGE VALIDATION
    // ==========================================

    if (!req.file) {
        throw new BadRequestError(
            "Combo set image is required"
        );
    }

    // ==========================================
    // UPLOAD IMAGE TO CLOUDINARY
    // ==========================================

    const uploadedImage =
        await uploadToCloudinary(
            req.file.buffer,
            "sudhvedahoney/plans"
        );

    // ==========================================
    // CREATE NEW COMBO SET OBJECT
    // ==========================================

    const newComboSet = {
        monthName: monthName.trim(),

        title: title.trim(),

        image: uploadedImage.secure_url,

        public_id: uploadedImage.public_id,

        products: parsedProducts,

        season: season.trim(),

        harvestTitle: harvestTitle.trim(),

        description: description.trim(),

        readMore: readMore.trim()
    };

    // ==========================================
    // CASE 1:
    // EXISTING PLAN COMBO SET
    // ==========================================

    if (planComboSet) {

        planComboSet.combosets.push(
            newComboSet
        );

        await planComboSet.save();

        return res.status(200).json({
            success: true,

            message:
                "New combo set added to the subscription plan successfully",

            data: planComboSet
        });
    }

    // ==========================================
    // CASE 2:
    // FIRST COMBO SET
    // ==========================================

    const newPlanComboSet =
        await PlanComboSet.create({
            planId: plan._id,

            combosets: [
                newComboSet
            ]
        });

    // ==========================================
    // SAVE comboSetId INTO PLAN
    // ==========================================

    plan.comboSetId =
        newPlanComboSet._id;

    await plan.save();

    // ==========================================
    // RESPONSE
    // ==========================================

    return res.status(201).json({
        success: true,

        message:
            "Plan combo set created successfully",

        data: newPlanComboSet
    });
});

const getSubscripationPlans = asyncHandler(async (req, res) => {

    const plans = await Plans.find({
        isActive: true,
    })
        .populate({
            path: "comboSetId",
            select: "combosets createdAt updatedAt"
        })
        .sort({
            createdAt: 1
        })
        .lean();

    return res.status(200).json({
        success: true,
        message: "Subscription plans fetched successfully",
        count: plans.length,
        data: plans
    });
});

const removeComboSets = asyncHandler(async (req, res) => {
    const { planId, combosetId } = req.params;

    // ==========================================
    // VALIDATE IDS
    // ==========================================

    if (!planId) {
        throw new BadRequestError(
            "Plan ID is required"
        );
    }

    if (!combosetId) {
        throw new BadRequestError(
            "Combo set ID is required"
        );
    }

    if (!mongoose.Types.ObjectId.isValid(planId)) {
        throw new BadRequestError(
            "Invalid plan ID"
        );
    }

    if (!mongoose.Types.ObjectId.isValid(combosetId)) {
        throw new BadRequestError(
            "Invalid combo set ID"
        );
    }

    // ==========================================
    // FIND PLAN
    // ==========================================

    const plan = await Plans.findById(planId);

    if (!plan) {
        throw new NotFoundError(
            "Subscription plan not found"
        );
    }

    // ==========================================
    // CHECK PLAN COMBO SET REFERENCE
    // ==========================================

    if (!plan.comboSetId) {
        throw new NotFoundError(
            "No combo sets found for this plan"
        );
    }

    // ==========================================
    // FIND PLAN COMBO SET DOCUMENT
    // ==========================================

    const planComboSet =
        await PlanComboSet.findById(
            plan.comboSetId
        );

    if (!planComboSet) {
        throw new NotFoundError(
            "Plan combo set document not found"
        );
    }

    // ==========================================
    // FIND COMBO SET
    // ==========================================

    const comboSet =
        planComboSet.combosets.find(
            combo =>
                combo._id.toString() ===
                combosetId
        );

    if (!comboSet) {
        throw new NotFoundError(
            "Combo set not found"
        );
    }

    // ==========================================
    // DELETE IMAGE FROM CLOUDINARY
    // ==========================================

    if (comboSet.public_id) {
        await deleteFromCloudinary(
            comboSet.public_id
        );
    }

    // ==========================================
    // REMOVE COMBO SET FROM ARRAY
    // ==========================================

    planComboSet.combosets.pull(
        combosetId
    );

    await planComboSet.save();

    // ==========================================
    // OPTIONAL:
    // IF NO COMBO SETS REMAIN
    // ==========================================

    if (planComboSet.combosets.length === 0) {

        await PlanComboSet.findByIdAndDelete(
            planComboSet._id
        );

        plan.comboSetId = null;

        await plan.save();

        return res.status(200).json({
            success: true,
            message:
                "Combo set and its image deleted successfully. No combo sets remain for this plan.",
            data: {
                planId,
                combosetId
            }
        });
    }

    // ==========================================
    // RESPONSE
    // ==========================================

    return res.status(200).json({
        success: true,
        message:
            "Combo set removed successfully",
        data: planComboSet
    });
});

const removeSubscripationPlans = asyncHandler(async (req, res) => {
    const { plansId } = req.params;
    const { role } = req.user;

    // ==========================================
    // ADMIN CHECK
    // ==========================================

    if (role !== "admin") {
        throw new UnauthorizedError(
            "Plans can only be removed by admin"
        );
    }

    // ==========================================
    // VALIDATE PLAN ID
    // ==========================================

    if (!plansId) {
        throw new BadRequestError(
            "Subscription plan ID is required"
        );
    }

    if (!mongoose.Types.ObjectId.isValid(plansId)) {
        throw new BadRequestError(
            "Invalid subscription plan ID"
        );
    }

    // ==========================================
    // FIND PLAN
    // ==========================================

    const plan = await Plans.findById(plansId);

    if (!plan) {
        throw new NotFoundError(
            "Subscription plan not found"
        );
    }

    // ==========================================
    // CHECK COMBO SET
    // ==========================================

    if (plan.comboSetId) {
        throw new BadRequestError(
            "This subscription plan cannot be deleted because combo sets are still attached to it. Please remove all combo sets first."
        );
    }

    // ==========================================
    // DELETE PLAN
    // ==========================================

    await Plans.findByIdAndDelete(plansId);

    // ==========================================
    // RESPONSE
    // ==========================================

    return res.status(200).json({
        success: true,
        message: "Subscription plan removed successfully",
        data: {
            id: plan._id,
            name: plan.name
        }
    });
});


module.exports = {
    addSubscripationPlans,
    AddComboSetsInPlans,
    getSubscripationPlans,
    removeComboSets,
    removeSubscripationPlans
}