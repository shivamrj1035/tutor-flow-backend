import mongoose from "mongoose";

const Schema = new mongoose.Schema({
    courseTitle: {
        type: String,
        required: true,
    },
    subTitle: {
        type: String,
    },
    description: {
        type: String,
    },
    level: {
        type: String,
        enum: ['Beginner', 'Medium', 'Advance'],
    },
    category: {
        type: String,
        required: true,
    },
    coursePrice: {
        type: Number,
        // required: true,
    },
    thumbnail : {
        type: String,
    },
    enrolledStudents:[
        {
            type:mongoose.Schema.Types.ObjectId,
            ref:'User'
        }
    ],
    creator: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
    },
    lectures : [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Lecture",
        }
    ],
    isPublished: {
        type: Boolean,
        default: false,
    },


}, {timestamps : true});

export const Course = mongoose.model("Course", Schema);