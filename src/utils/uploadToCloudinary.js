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

const uploadPdfToCloudinary = (buffer, folder, originalName = 'document') => {
    // clean file name, so the stored URL ends with .pdf
    const baseName = originalName
        .replace(/\.pdf$/i, '')
        .replace(/[^a-zA-Z0-9_-]/g, '_')
        .slice(0, 50);

    return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
            {
                folder,
                resource_type: 'raw',                    // PDFs are stored as raw files
                public_id: `${baseName}-${Date.now()}.pdf`, // for raw files the extension must be part of public_id
                overwrite: false,
            },
            (error, result) => {
                if (error) return reject(error);

                resolve({
                    public_id: result.public_id,
                    url: result.secure_url,
                    bytes: result.bytes,
                    resource_type: result.resource_type,
                });
            }
        );

        stream.end(buffer);
    });
};

module.exports = { uploadToCloudinary, uploadVideoToCloudinary, deleteFromCloudinary, uploadPdfToCloudinary }
