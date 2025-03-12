import { Course } from "../models/course.model.js";
import { Lecture } from "../models/lecture.model.js";
import { deleteMedia, deleteVideo, uploadMedia } from "../utils/cloudInary.js";

export const createCourse = async (req, res) => {
    try {
        const { courseTitle, category } = req.body;
        if (!courseTitle || !category) {
            return res.status(400).json(
                { message: 'Course Title & Category is required' }
            );
        }

        const course = await Course.create({
            courseTitle,
            category,
            creator: req.id
        })

        return res.status(201).json(
            { course, message: 'Course Created Successfully' }
        );
    } catch (err) {
        return res.status(500).json({ message: 'Failed to create course' });
    }
}

export const getCreatorCourse = async (req, res) => {
    try {
        const userId = req.id;
        const courses = await Course.find({ creator: userId })
        if (!courses) {
            return res.status(500).json({
                courses: [],
                message: 'Course not found'
            });
        }
        return res.status(200).json({
            courses
        });

    } catch (err) {
        return res.status(500).json({ message: 'Failed to create course' });
    }
}

export const editCourse = async (req, res) => {
    try {
        const courseId = req.params.courseId;
        const { category, level, coursePrice, courseTitle, description, subTitle } = req.body;
        const thumbnail = req.file;

        let course = await Course.findById(courseId);
        if (!course) {
            return res.status(404).json({ message: 'Course not foud' });
        }
        let courseThumbnail;
        if (thumbnail) {
            if (course.thumbnail) {
                const publicId = course.thumbnail.split("/").pop().split(".")[0];
                await deleteMedia(publicId);
            }
            courseThumbnail = await uploadMedia(thumbnail.path);
        }
        const uploadData = { category, level, coursePrice, courseTitle, description, subTitle, thumbnail: courseThumbnail?.secure_url }
        course = await Course.findByIdAndUpdate(courseId, uploadData, { new: true });
        return res.status(200).json({ message: 'Course updated successfully', course: course, success: true });
    } catch (err) {
        return res.status(500).json({ message: 'Failed to create course' });
    }
}

export const getCourseById = async (req, res) => {
    try {
        const courseId = req.params.courseId;
        const course = await Course.findById(courseId);
        if (!course) {
            return res.status(404).json({ message: 'Course not foud' });
        }
        return res.status(200).json({ message: 'Course retrived successfully', course, success: true });

    } catch (err) {
        return res.status(500).json({ message: 'Failed to fetch course by the ID' });
    }
}

export const removeCourse = async (req, res) => {
    try {
        const { courseId } = req.params;
        const course = await Course.findByIdAndDelete(courseId);
        if (!course) {
            return res.status(404).json({
                message: "Course not found!"
            });
        }

        // Delete all lectures related to this course
        await Lecture.deleteMany({ _id: { $in: course.lectures } });

        // Now, delete the course
        await Course.findByIdAndDelete(courseId);

        return res.status(200).json({
            message: "Course removed successfully."
        })
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            message: "Failed to remove course"
        })
    }
}

export const createLecture = async (req, res) => {
    try {
        const { lectureTitle } = req.body;
        const { courseId } = req.params;
        if (!lectureTitle || !courseId) {
            return res.status(400).json(
                { message: 'Lecture Title is required' }
            );
        }

        const lecture = await Lecture.create({ lectureTitle });

        const course = await Course.findById(courseId);

        if (course) {
            course.lectures.push(lecture._id);
            await course.save();
        }

        return res.status(201).json(
            { lecture, message: 'Lecture Created Successfully' }
        );
    } catch (err) {
        return res.status(500).json({ message: 'Failed to create lecture' });
    }
}

export const getCourseLecture = async (req, res) => {
    try {

        const { courseId } = req.params;

        const course = await Course.findById(courseId).populate({
            path: "lectures",
            model: "Lecture", // Ensure this matches your Lecture model name
        });

        if (!course) {
            return res.status(404).json({ message: 'Failed to fetch course for the lectures' });
        }

        return res.status(200).json(
            { lectures: course.lectures, message: 'Lecture retrived Successfully' }
        );
    } catch (err) {
        return res.status(500).json({ message: 'Failed to get lectures', error: err });
    }
}

export const editLecture = async (req, res) => {
    try {
        const { lectureTitle, videoInfo, isPreviewFree } = req.body;

        const { courseId, lectureId } = req.params;
        const lecture = await Lecture.findById(lectureId);
        if (!lecture) {
            return res.status(404).json({
                message: "Lecture not found!"
            })
        }
        if (lecture.publicId) deleteVideo(lecture.publicId)
        // update lecture
        if (lectureTitle) lecture.lectureTitle = lectureTitle;
        if (videoInfo?.videoUrl) lecture.videoUrl = videoInfo.videoUrl;
        if (videoInfo?.publicId) lecture.publicId = videoInfo.publicId;
        lecture.isPreviewFree = isPreviewFree;

        await lecture.save();

        // If  the course still has the lecture id if it was not aleardy added;
        const course = await Course.findById(courseId);
        if (course && !course.lectures.includes(lecture._id)) {
            course.lectures.push(lecture._id);
            await course.save();
        };
        return res.status(200).json({
            lecture,
            message: "Lecture updated successfully."
        })
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            message: "Failed to edit lectures"
        })
    }
}

export const removeLecture = async (req, res) => {
    try {
        const { lectureId } = req.params;
        const lecture = await Lecture.findByIdAndDelete(lectureId);
        if (!lecture) {
            return res.status(404).json({
                message: "Lecture not found!"
            });
        }
        // delete the lecture from couldinary as well
        if (lecture.publicId) {
            await deleteVideo(lecture.publicId);
        }

        // Remove the lecture reference from the associated course
        await Course.updateOne(
            { lectures: lectureId }, // find the course that contains the lecture
            { $pull: { lectures: lectureId } } // Remove the lectures id from the lectures array
        );

        return res.status(200).json({
            message: "Lecture removed successfully."
        })
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            message: "Failed to remove lecture"
        })
    }
}

export const getLectureById = async (req, res) => {
    try {
        const { lectureId } = req.params;
        const lecture = await Lecture.findById(lectureId);
        if (!lecture) {
            return res.status(404).json({
                message: "Lecture not found!"
            });
        }
        return res.status(200).json({
            lecture
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            message: "Failed to get lecture by id"
        })
    }
}

export const togglePublishCourse = async (req, res) => {
    try {
        const { courseId } = req.params;
        const { publish } = req.query; // true, false
        const course = await Course.findById(courseId);
        if (!course) {
            return res.status(404).json({
                message: "Course not found!"
            });
        }
        // publish status based on the query paramter
        course.isPublished = publish === "true";
        console.log(publish === "true")
        await course.save();

        const statusMessage = course.isPublished ? "Published" : "Unpublished";
        return res.status(200).json({
            message: `Course is ${statusMessage}`
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            message: "Failed to update status"
        })
    }
}


export const getPublishedCourses = async (req, res) => {
    try {

        const courses = await Course.find({ isPublished: true }).populate({
            path: 'creator',
            select: 'name photoUrl'
        });

        if (!courses) {
            return res.status(404).json({
                message: "Courses not found!"
            });
        }
        return res.status(200).json({
            courses,
        })
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            message: "Failed to fetch published courses"
        })
    }
}

export const searchCourse = async (req, res) => {
    try {
        const { query = "", sortByPrice = "", categories = [] } = req.query;
        const categoryArray = Array.isArray(categories) ? categories : categories.split(",");

        // create search qury
        const searchCriteria = {
            isPublished: true,
            $or: [
                { courseTitle: { $regex: query, $options: "i" } },
                { subTitle: { $regex: query, $options: "i" } },
                { category: { $regex: query, $options: "i" } }
            ],
        }
        if (categoryArray.length > 0 && categoryArray[0] !== "") {
            searchCriteria.category = { $in: categoryArray };
        }

        const sortOptions = {};
        if (sortByPrice === "low") {
            sortOptions.coursePrice = 1; // for ascending order
        } else if (sortByPrice === "high") {
            sortOptions.coursePrice = -1; // for descending order
        }

        let courses = await Course.find(searchCriteria).populate({ path: "creator", select: "name photoUrl" }).sort(sortOptions);
        return res.status(200).json({
            courses: courses || [],
            success: true
        });
    } catch (error) {
        console.log(error)
    }
}