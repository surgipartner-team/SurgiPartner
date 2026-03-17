import { v2 as cloudinary } from 'cloudinary';
import sharp from 'sharp';
import crypto from 'crypto';

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.NEXT_CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Security: Strict Whitelist of Allowed MIME Types
const ALLOWED_TYPES = {
    IMAGES: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
    DOCUMENTS: [
        'application/pdf',
        'application/msword', // .doc
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
        'text/plain',
        'text/csv',
        'application/vnd.ms-excel', // .xls
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
        'application/vnd.ms-powerpoint', // .ppt
        'application/vnd.openxmlformats-officedocument.presentationml.presentation' // .pptx
    ]
};

// Security: Max File Sizes
const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB (before optimization)
const MAX_DOC_SIZE = 10 * 1024 * 1024;   // 10MB

/**
 * Uploads a file to Cloudinary with security checks and optimization.
 * 
 * @param {File} file - The file object from Request.formData()
 * @param {string} folder - The folder path in Cloudinary (e.g., 'hospitals', 'patients/docs')
 * @returns {Promise<{url: string, public_id: string, format: string}>}
 */
export async function uploadToCloudinary(file, folder = 'uploads') {
    if (!file) throw new Error("No file provided");

    // 1. Security: Validate MIME Type
    const isImage = ALLOWED_TYPES.IMAGES.includes(file.type);
    const isDoc = ALLOWED_TYPES.DOCUMENTS.includes(file.type);

    if (!isImage && !isDoc) {
        throw new Error(`Security Error: File type '${file.type}' is not allowed. Only images and standard documents are permitted.`);
    }

    // 2. Security: Validate Size
    if (isImage && file.size > MAX_IMAGE_SIZE) throw new Error("File too large. Max image size is 10MB.");
    if (isDoc && file.size > MAX_DOC_SIZE) throw new Error("File too large. Max document size is 10MB.");

    // 3. Prepare Buffer
    const arrayBuffer = await file.arrayBuffer();
    let buffer = Buffer.from(arrayBuffer);

    // 4. Optimization (Images Only)
    // We process images in memory to reduce size and strip metadata before uploading
    if (isImage) {
        try {
            buffer = await sharp(buffer)
                .resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true }) // Reasonable max size
                .webp({ quality: 80 }) // High efficiency format
                .toBuffer();
        } catch (error) {
            console.error("Optimization failed, attempting raw upload:", error);
            // Fallback to original buffer if sharp fails (rare)
        }
    }

    // 5. Upload to Cloudinary using Stream (Memory -> Cloud)
    // resource_type: 'auto' lets Cloudinary decide (image vs raw/video)
    // 'raw' is safer for documents to prevent execution checks acting weird
    const resourceType = isImage ? 'image' : 'raw';

    return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
            {
                folder: `surgipartner/${folder}`, // Namespace everything under one root folder
                resource_type: resourceType,
                // Sanitize filename: Use UUID + Timestamp to prevent overwrites and guessing
                public_id: `${crypto.randomUUID()}_${Date.now()}`,
            },
            (error, result) => {
                if (error) {
                    reject(new Error(`Cloudinary Upload Failed: ${error.message}`));
                } else {
                    resolve({
                        url: result.secure_url,
                        public_id: result.public_id,
                        format: result.format,
                        original_filename: result.original_filename
                    });
                }
            }
        );

        // createReadStream is not available on Buffer, so we write the buffer to the stream
        uploadStream.end(buffer);
    });
}

/**
 * Deletes a file from Cloudinary.
 * 
 * @param {string} publicId - The public ID of the file to delete (can be extracted from URL)
 * @param {string} resourceType - 'image' or 'raw' (default: 'image')
 */
export async function deleteFromCloudinary(publicId, resourceType = 'image') {
    if (!publicId) return;

    try {
        await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
    } catch (error) {
        console.error("Cloudinary Delete Failed:", error);
        // We log but don't throw, as deletion failure shouldn't crash the main flow
    }
}
