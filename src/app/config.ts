const CLOUD_NAME = 'dzqnyehxn';
const UPLOAD_PRESET = 'fuhrsp2z';

export const CLOUDINARY_CONFIG = {
    CLOUD_NAME,
    UPLOAD_PRESET,
    getUploadUrl: (fileType: 'image' | 'video') =>
        `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/${fileType}/upload`
};
