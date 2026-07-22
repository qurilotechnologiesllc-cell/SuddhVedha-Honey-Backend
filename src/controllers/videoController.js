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

    let videoDocument = await ProductVideo.findOne({
        product: productId
    });

    if (videoDocument && videoDocument.videos.length >= 2) {
        throw new ForbiddenError(
            "Maximum 2 videos are allowed for this product."
        );
    }

    const result = await uploadVideoToCloudinary(
        req.file.buffer,
        "productvideos"
    );

    if (!result) {
        throw new ServiceUnavailableError(
            "Unable to upload video to Cloudinary."
        );
    }

    const newVideo = {

        public_id: result.public_id,

        duration: result.duration,

        format: result.format

    };

    // Create first document
    if (!videoDocument) {

        videoDocument = await ProductVideo.create({

            product: productId,

            videos: [newVideo]

        });

        product.videoDocumentId = videoDocument._id;

        await product.save();

    } else {

        videoDocument.videos.push(newVideo);

        await videoDocument.save();

    }

    const savedVideo =
        videoDocument.videos[
        videoDocument.videos.length - 1
        ];

    const videoUrl = cloudinary.url(savedVideo.public_id, {
        resource_type: "video",
        secure: true
    });

    const thumbnailUrl = cloudinary.url(savedVideo.public_id, {
        resource_type: "video",
        secure: true,
        format: "jpg",
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

            _id: savedVideo._id,

            public_id: savedVideo.public_id,

            duration: savedVideo.duration,

            format: savedVideo.format,

            video_url: videoUrl,

            thumbnail_url: thumbnailUrl

        }

    });

});

const getAllProductsVideo = asyncHandler(async (req, res) => {

    const { productId } = req.params;

    const product = await Product.findById(productId).populate({
        path: "videoDocumentId",
        select: "videos"
    });

    if (!product) {
        throw new NotFoundError("Product not found.");
    }

    if (!product.videoDocumentId) {
        throw new NotFoundError("No video document found.");
    }

    if (product.videoDocumentId.videos.length === 0) {
        throw new NotFoundError("No videos available for this product.");
    }

    const videoData = product.videoDocumentId.videos.map((video) => {

        const videoUrl = cloudinary.url(video.public_id, {
            resource_type: "video",
            secure: true
        });

        const thumbnailUrl = cloudinary.url(video.public_id, {
            resource_type: "video",
            secure: true,
            format: "jpg",
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

            _id: video._id,

            duration: video.duration,

            format: video.format,

            video_url: videoUrl,

            thumbnail_url: thumbnailUrl

        };

    });

    res.status(200).json({

        success: true,

        message: "Product videos fetched successfully.",

        totalVideos: videoData.length,

        data: videoData

    });

});

const removeProductVideo = asyncHandler(async (req, res) => {

    const { productId, videoId } = req.params;

    // Check Product
    const product = await Product.findById(productId);

    if (!product) {
        throw new NotFoundError("Product not found.");
    }

    // Find ProductVideo document
    const videoDocument = await ProductVideo.findOne({
        product: productId
    });

    if (!videoDocument) {
        throw new NotFoundError("Product videos not found.");
    }

    // Find particular video
    const video = videoDocument.videos.id(videoId);

    if (!video) {
        throw new NotFoundError("Video not found.");
    }

    // Delete from Cloudinary
    const cloudinaryResponse = await deleteFromCloudinary(
        video.public_id,
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

    // Remove video from array
    video.deleteOne();

    // If no videos left
    if (videoDocument.videos.length === 0) {

        await ProductVideo.findByIdAndDelete(videoDocument._id);

        product.videoDocumentId = null;

        await product.save();

    } else {

        await videoDocument.save();

    }

    res.status(200).json({

        success: true,

        message: "Product video removed successfully."

    });

});

module.exports = { uploadProductVideo, getAllProductsVideo, removeProductVideo }