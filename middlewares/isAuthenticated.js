import jwt from "jsonwebtoken";

const isAuthenticated =async  (req,res, next) => {
    try{
        const token = req.cookies.app_token;
        if(!token){
            return res.status(401).json({
                message: "Not Authenticated",
                success: false,
            })
        }
        const decode = jwt.verify(token, process.env.SECRET_KEY);
        if(!decode){
            return res.status(401).json({
                message: "Invalid Token",
                success: false,
            })
        }
        req.id  = decode.userId;
        next();
    }catch(err){
        console.log(err)
    }
}

export default isAuthenticated;