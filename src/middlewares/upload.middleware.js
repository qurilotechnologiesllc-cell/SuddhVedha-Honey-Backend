const multer = require('multer')

// Memory storage — sirf bypass karna hai
const storage = multer.memoryStorage()

const fileFilter = (req, file, cb) => {
    const allowedImages = [
        "image/jpeg",
        "image/jpg",
        "image/png",
        "image/webp",
    ];

    const allowedVideos = [
        "video/mp4",
        "video/mpeg",
        "video/quicktime",
    ];

    if (
        allowedImages.includes(file.mimetype) ||
        allowedVideos.includes(file.mimetype)
    ) {
        return cb(null, true);
    }

    cb(
        new Error(
            "Invalid file type. Only JPG, PNG, WEBP and supported video formats are allowed."
        ),
        false
    );
};

const pdfFileFilter = (req, file, cb) => {
    if (file.mimetype === "application/pdf") {
        return cb(null, true);
    }
    cb(new Error("Invalid file type. Only PDF files are allowed."), false);
};

// Single file upload ke liye
const uploadSingle = multer({
    storage,
    fileFilter,
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB
}).single('image')

// Multiple files ke liye
const uploadMultiple = multer({
    storage,
    fileFilter,
    limits: { fileSize: 10 * 1024 * 1024 }
}).array('images', 5)

// Video ke liye
const uploadVideo = multer({
    storage,
    fileFilter,
    limits: { fileSize: 50 * 1024 * 1024 } // 50MB
}).single('video')

const uploadPdf = multer({
    storage,
    fileFilter: pdfFileFilter,
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB
}).single('report');


const uploadReturnEvidence = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 50 * 1024 * 1024,
        files: 6,
    },
}).fields([
    {
        name: "packagingImages",
        maxCount: 5,
    },
    {
        name: "unboxingVideo",
        maxCount: 1,
    },
]);

const validatePdfBuffer = (req, res, next) => {
    if (!req.file) {
        return res.status(400).json({ message: "PDF file is required" });
    }
    if (req.file.buffer.subarray(0, 4).toString() !== "%PDF") {
        return res.status(400).json({ message: "Uploaded file is not a valid PDF" });
    }
    next();
};

module.exports = { uploadSingle, uploadMultiple, uploadVideo, uploadReturnEvidence, uploadPdf }