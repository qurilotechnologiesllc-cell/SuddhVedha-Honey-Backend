const cloudinary = require('../config/cloudinary')

const uploadToCloudinary = (buffer, folder, resourceType = 'image') => {
    return new Promise((resolve, reject) => {

        const stream = cloudinary.uploader.upload_stream(
            {
                folder,
                resource_type: resourceType,
            },
            (error, result) => {
                if (error) reject(error)
                else resolve(result)
            }
        )

        stream.end(buffer)
    })
}

const deleteFromCloudinary = (publicId) => {
    return new Promise((resolve, reject) => {
        cloudinary.uploader.destroy(publicId, (error, result) => {
            if (error) reject(error)
            else resolve(result)
        })
    })
}

module.exports = { uploadToCloudinary, deleteFromCloudinary }
