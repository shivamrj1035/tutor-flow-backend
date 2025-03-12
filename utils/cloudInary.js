import {v2 as cloudinary} from 'cloudinary';
import dotenv from 'dotenv';

dotenv.config({});

cloudinary.config({
    cloud_name: process.env.CLOUD_NAME,
    api_key: process.env.API_KEY,
    api_secret: process.env.API_SECRET // Click 'View API Keys' above to copy your API secret
});

export const uploadMedia = async (file) => {
    try {
        const uploadResponse = await cloudinary.uploader.upload(file, {
            resource_type: 'auto',
        });
        return uploadResponse;
    } catch (err) {
        console.log(err);
    }
}
export const deleteMedia = async (publicId) => {
    try {
        const deleteMediaResponse = await cloudinary.uploader.destroy(publicId);
        return deleteMediaResponse;
    } catch (err) {
        console.log(err);
    }
}
export const deleteVideo = async (publicId) => {
    try {
        await cloudinary.uploader.destroy(publicId,{
            resource_type: 'video',
        });

    } catch (err) {
        console.log(err);
    }
}