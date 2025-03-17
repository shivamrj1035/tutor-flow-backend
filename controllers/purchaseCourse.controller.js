import Stripe from "stripe";
import { Course } from "../models/course.model.js";
import { CoursePurchase } from "../models/purchaseCourse.model.js";
import { Lecture } from "../models/lecture.model.js";
import { User } from "../models/user.model.js";
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export const createCheckoutSession = async (req, res) => {
  try {
    const userId = req.id;
    const { courseId } = req.body;
    const course = await Course.findById(courseId);

    if (!course) return res.status(404).json({ message: "Course not found." });
    // Create a new course purchase record
    const newPurchase = new CoursePurchase({
      courseId,
      userId,
      amount: course.coursePrice,
      status: "pending",
    });
    
    const successUrl =
      req.body.success_url ||
      `${process.env.BASE_URI}/purchase-success?courseId=${courseId}&userId=${userId}`;

    // Create a Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "inr",
            product_data: {
              name: course.courseTitle,
              images: [course.thumbnail],
            },
            unit_amount: course.coursePrice * 100,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: successUrl,
      cancel_url: `${process.env.BASE_URI}/course-detail/${courseId}`,
      metadata: {
        courseId: courseId,
        userId: userId,
      },
    });
    

    if (!session.url) {
      return res
        .status(400)
        .json({ success: false, message: "Error while creating session" });
    }
    // Save the purchase record
    newPurchase.paymentId = session.id;
    await newPurchase.save();

    return res.status(200).json({
      success: true,
      url: session.url, // Return the Stripe checkout URL
    });
  } catch (error) {
    console.log(error);
  }
};

export const stripeWebhook = async (req, res) => {
  let event;

  try {
    const payloadString = JSON.stringify(req.body, null, 2);
    const secret = process.env.WEBHOOK_ENDPOINT_SECRET;

    const header = stripe.webhooks.generateTestHeaderString({
      payload: payloadString,
      secret,
    });

    event = stripe.webhooks.constructEvent(payloadString, header, secret);
  } catch (error) {
    console.error("Webhook error:", error.message);
    return res.status(400).send(`Webhook error: ${error.message}`);
  }

  // Handle the checkout session completed event
  if (event.type === "checkout.session.completed") {
    console.log("check session complete is called");

    try {
      const session = event.data.object;

      const purchase = await CoursePurchase.findOne({
        paymentId: session.id,
      }).populate({ path: "courseId" });

      if (!purchase) {
        return res.status(404).json({ message: "Purchase not found" });
      }

      if (session.amount_total) {
        purchase.amount = session.amount_total / 100;
      }
      purchase.status = "completed";

      // Make all lectures visible by setting `isPreviewFree` to true
      if (purchase.courseId && purchase.courseId.lectures.length > 0) {
        await Lecture.updateMany(
          { _id: { $in: purchase.courseId.lectures } },
          { $set: { isPreviewFree: true } }
        );
      }

      await purchase.save();

      // Update user's enrolledCourses
      await User.findByIdAndUpdate(
        purchase.userId,
        { $addToSet: { enrolledCourses: purchase.courseId._id } }, // Add course ID to enrolledCourses
        { new: true }
      );

      // Update course to add user ID to enrolledStudents
      await Course.findByIdAndUpdate(
        purchase.courseId._id,
        { $addToSet: { enrolledStudents: purchase.userId } }, // Add user ID to enrolledStudents
        { new: true }
      );
    } catch (error) {
      console.error("Error handling event:", error);
      return res.status(500).json({ message: "Internal Server Error" });
    }
  }
  res.status(200).send();
};

export const getCourseDetailWithPurchaseStatus = async (req, res) => {
  try {
    const { courseId } = req.params;
    const userId = req.id;

    const course = await Course.findById(courseId).populate("creator lectures");
    const purchased = await CoursePurchase.findOne({ userId, courseId, status: "completed" });

    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }
    return res.status(200).json({ course, purchased: !!purchased });
  } catch (error) {
    console.log(error);
  }
};


// export const getCourseDetailWithPurchaseStatus = async (req, res) => {
//   try {
//     const { courseId } = req.params;
//     const userId = req.id;

//     const course = await Course.findById(courseId)
//       .populate({ path: "creator" })
//       .populate({ path: "lectures" });

//     const purchased = await CoursePurchase.findOne({
//       userId,
//       courseId,
//       status: "completed",
//     });

//     if (!course) {
//       return res.status(404).json({ message: "Course not found" });
//     }
//     return res.status(200).json({ course, purchased: !!purchased });
//   } catch (error) {
//     console.log(error);
//   }
// };

export const getAllPurchasedCourse = async (req, res) => {
  try {
    const purchasedCourses = await CoursePurchase.find({
      status: "completed",
    }).populate("courseId");

    if (!purchasedCourses) {
      return res.status(404).json({ message: "Purchased Courses not found" });
    }
    return res.status(200).json({ purchasedCourses });
  } catch (error) {
    console.log(error);
  }
};


export const updatePurchaseStatus = async (req, res) => {
  try {
      const { courseId, userId } = req.body;

      if (!courseId || !userId) {
          return res.status(400).json({ message: "Course ID and User ID are required." });
      }

      // Find the purchase record
      const purchase = await CoursePurchase.findOne({ courseId, userId });

      if (!purchase) {
          return res.status(404).json({ message: "Purchase not found" });
      }

      // Update the purchase status
      purchase.status = "completed";
      await purchase.save();

      // Add the course to the user's enrolledCourses list
      await User.findByIdAndUpdate(
          userId,
          { $addToSet: { enrolledCourses: courseId } },
          { new: true }
      );

      // Add the user to the course's enrolledStudents list
      await Course.findByIdAndUpdate(
          courseId,
          { $addToSet: { enrolledStudents: userId } },
          { new: true }
      );

      return res.status(200).json({ message: "Purchase status updated successfully." });
  } catch (error) {
      console.error("Error updating purchase status:", error);
      return res.status(500).json({ message: "Internal Server Error" });
  }
};
