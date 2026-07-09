const Feedback = require('../models/feedbackVideo.model')
const cloudinary = require('../config/cloudinary')
const { asyncHandler, BadRequestError, NotFoundError, ServiceUnavailableError } = require('../errors/errorConfig')
const { uploadVideoToCloudinary, deleteFromCloudinary } = require('../utils/uploadToCloudinary')

const uploadFeedbackVideo = asyncHandler(async (req, res) => {

    const file = req.file;

    if (!file) {
        throw new BadRequestError("Please upload a feedback video.");
    }

    // Upload video to Cloudinary
    const result = await uploadVideoToCloudinary(
        file.buffer,
        "feedback"
    );

    if (!result) {
        throw new ServiceUnavailableError(
            "Unable to upload video to Cloudinary."
        );
    }

    // Save only metadata in MongoDB
    const feedbackVideo = await Feedback.create({
        public_id: result.public_id,
        duration: result.duration,
        format: result.format
    });

    // Generate Video URL
    const videoUrl = cloudinary.url(feedbackVideo.public_id, {
        resource_type: "video",
        secure: true
    });

    // Generate Thumbnail URL
    const thumbnailUrl = cloudinary.url(feedbackVideo.public_id, {
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

        message: "Feedback video uploaded successfully.",

        data: {

            id: feedbackVideo._id,

            public_id: feedbackVideo.public_id,

            duration: feedbackVideo.duration,

            format: feedbackVideo.format,

            video_url: videoUrl,

            thumbnail_url: thumbnailUrl

        }

    });

});

const getAllFeedbackVideos = asyncHandler(async (req, res) => {

    const feedbackVideos = await Feedback.find()
        .select('public_id duration format')
        .lean();

    if (!feedbackVideos.length) {
        throw new NotFoundError('No feedback videos found.');
    }

    const videos = feedbackVideos.map((video) => ({

        id: video._id,

        duration: video.duration,

        format: video.format,

        video_url: cloudinary.url(video.public_id, {
            resource_type: 'video',
            secure: true
        }),

        thumbnail_url: cloudinary.url(video.public_id, {
            resource_type: 'video',
            format: 'jpg',
            secure: true,
            transformation: [
                {
                    start_offset: '2'
                },
                {
                    width: 500,
                    crop: 'fill'
                }
            ]
        })

    }));

    res.status(200).json({

        success: true,

        message: 'Feedback videos fetched successfully.',

        totalVideos: videos.length,

        data: videos

    });

});

const removeFeedbackVideo = asyncHandler(async (req, res) => {

    const { videoId } = req.params;

    // Check if feedback video exists
    const feedbackVideo = await Feedback.findById(videoId);

    if (!feedbackVideo) {
        throw new NotFoundError("Feedback video not found.");
    }

    // Delete video from Cloudinary
    const cloudinaryResponse = await deleteFromCloudinary(
        feedbackVideo.public_id,
        "video"
    );

    if (
        cloudinaryResponse.result !== "ok" &&
        cloudinaryResponse.result !== "not found"
    ) {
        throw new ServiceUnavailableError(
            "Unable to delete feedback video from Cloudinary."
        );
    }

    // Delete feedback video document
    await Feedback.findByIdAndDelete(videoId);

    res.status(200).json({

        success: true,

        message: "Feedback video removed successfully."

    });

});


module.exports = { uploadFeedbackVideo, getAllFeedbackVideos, removeFeedbackVideo }