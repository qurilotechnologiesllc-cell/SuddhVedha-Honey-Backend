const ProductVideo = require('../models/productVideo.model')
const Product = require('../models/product.model')
const cloudinary = require('../config/cloudinary')
const { asyncHandler, BadRequestError, UnauthorizedError, NotFoundError, ConflictError, ServiceUnavailableError, ForbiddenError } = require('../errors/errorConfig')

const { uploadVideoToCloudinary, deleteFromCloudinary } = require('../utils/uploadToCloudinary')

const uploadProductVideo = asyncHandler(async (req, res) => {

    const { productId } = req.params;

    if (!req.file) {
        throw new BadRequestError("Please upload a video.");
    }

    const product = await Product.findById(productId);

    if (!product) {
        throw new NotFoundError("Product not found.");
    }

    if (product.videos.length >= 2) {
        throw new ForbiddenError(
            "Maximum 2 videos are allowed for a product."
        );
    }

    const result = await uploadVideoToCloudinary(
        req.file.buffer,
        "videos"
    );

    if (!result) {
        throw new ServiceUnavailableError(
            "Unable to upload video to Cloudinary."
        );
    }

    const productVideo = await ProductVideo.create({

        product: productId,

        public_id: result.public_id,

        duration: result.duration,

        format: result.format

    });

    await Product.findByIdAndUpdate(
        productId,
        {
            $push: {
                videos: productVideo._id
            }
        }
    );

    const videoUrl = cloudinary.url(result.public_id, {
        resource_type: "video",
        secure: true
    });

    const thumbnailUrl = cloudinary.url(result.public_id, {
        resource_type: "video",
        format: "jpg",
        secure: true,
        transformation: [
            {
                start_offset: "2"
            },
            {
                width: 500,
                crop: "fill"
            }
        ]
    });

    res.status(201).json({

        success: true,

        message: "Product video uploaded successfully.",

        data: {

            _id: productVideo._id,

            public_id: productVideo.public_id,

            duration: productVideo.duration,

            format: productVideo.format,

            video_url: videoUrl,

            thumbnail_url: thumbnailUrl
        }

    });

});

const getAllProductsVideo = asyncHandler(async (req, res) => {
    const { productId } = req.params

    const product = await Product.findById(productId).populate({
        path: 'videos',
        select: 'public_id duration format'
    })

    if (!product) {
        throw new NotFoundError("Product not found.");
    }

    if (!product.videos.length) {
        throw new NotFoundError('Not Video are avaliabe')
    }

    const video = product.videos.map((video) => {

        const videoUrl = cloudinary.url(video.public_id, {
            resource_type: "video",
            secure: true
        });

        const thumbnailUrl = cloudinary.url(video.public_id, {
            resource_type: "video",
            format: "jpg",
            secure: true,
            transformation: [
                {
                    start_offset: "2"
                },
                {
                    width: 500,
                    crop: "fill"
                }
            ]
        });

        return {
            id: video._id,
            duration: video.duration,
            formate: video.format,
            videoUrl,
            thumbnailUrl
        }
    })

    res.status(200).json({

        success: true,

        message: "Product video fetch successfully.",

        videoUrls: video

    });

})

const removeProductVideo = asyncHandler(async (req, res) => {

    const { videoId } = req.params;

    // Check video exists
    const videoDetails = await ProductVideo.findById(videoId);

    if (!videoDetails) {
        throw new NotFoundError("Video details not found.");
    }

    // Delete from Cloudinary
    const cloudinaryResponse = await deleteFromCloudinary(
        videoDetails.public_id,
        "video"
    );

    if (
        cloudinaryResponse.result !== "ok" &&
        cloudinaryResponse.result !== "not found"
    ) {
        throw new ServiceUnavailableError(
            "Unable to delete video from Cloudinary."
        );
    }

    // Remove reference from Product
    await Product.findByIdAndUpdate(
        videoDetails.product,
        {
            $pull: {
                videos: videoId
            }
        }
    );

    // Delete ProductVideo document
    await ProductVideo.findByIdAndDelete(videoId);

    res.status(200).json({

        success: true,

        message: "Product video removed successfully."

    });

});

module.exports = { uploadProductVideo, getAllProductsVideo, removeProductVideo }