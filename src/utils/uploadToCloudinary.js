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

// this is the cloudinary function for upload a video on cloudinary 
const uploadVideoToCloudinary = (buffer, folder) => {
    return new Promise((resolve, reject) => {

        const stream = cloudinary.uploader.upload_stream(
            {
                folder,
                resource_type: 'video',

                // Optional
                overwrite: false,
                use_filename: true,
                unique_filename: true,
            },
            (error, result) => {

                if (error) {
                    return reject(error);
                }

                resolve({
                    public_id: result.public_id,
                    url: result.secure_url,
                    duration: result.duration,
                    format: result.format,
                    bytes: result.bytes,
                    width: result.width,
                    height: result.height,
                    resource_type: result.resource_type
                });

            }
        );

        stream.end(buffer);
    });
};


const deleteFromCloudinary = (
    publicId,
    resourceType = "image"
) => {

    return new Promise((resolve, reject) => {

        cloudinary.uploader.destroy(
            publicId,
            {
                resource_type: resourceType
            },
            (error, result) => {

                if (error) {
                    return reject(error);
                }

                resolve(result);

            }
        );

    });

};

module.exports = { uploadToCloudinary, uploadVideoToCloudinary, deleteFromCloudinary }
