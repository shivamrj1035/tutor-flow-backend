import express from "express";
import upload from "../utils/multer.js";
import { uploadMedia } from "../utils/cloudInary.js";

const router = express.Router();

router.route("/upload-video").post(upload.single("file"),async(req,res) => {
    try {
        
        const result = await uploadMedia(req.file.buffer);
        // const result = await uploadMedia(req.file.path);
        return res.status(201).json({ message: 'Video uploaded', data : result, success : true });
    } catch (error) {
     console.log(error)   
     return res.status(500).json({ message: 'Failed to upload video', error : err });
    } 
});

export default router;