import jwt from "jsonwebtoken";

export const generateToken = async ( res, user, message) =>{
    const token = jwt.sign({userId : user._id}, process.env.SECRET_KEY, { expiresIn : '1d'});

    return res
    .status(200)
    .cookie("app_token", token, {
        httpOnly : true,
        secure: true,    // Ensures cookies are only sent over HTTPS
        sameSite: "None",
        maxAge : 24 * 60 * 60 * 1000 // 1 day
    }).json({
        success : true,
        message,
        user
    })
}
