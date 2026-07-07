const multer = require('multer')

// Memory storage — sirf bypass karna hai
const storage = multer.memoryStorage()

const fileFilter = (req, file, cb) => {
    const allowedImages = [
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/webp'
    ]

    const allowedVideos = [
        'video/mp4',
        'video/mpeg',
        'video/quicktime'
    ]

    const allowed = [...allowedImages, ...allowedVideos]

    if (allowed.includes(file.mimetype)) {
        cb(null, true)
    } else {
        cb(
            new Error('Invalid file! Only jpg/png/webp/mp4 allowed'),
            false
        )
    }
}

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

module.exports = { uploadSingle, uploadMultiple, uploadVideo }