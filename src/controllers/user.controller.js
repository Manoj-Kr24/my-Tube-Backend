import { asyncHandler } from "../utils/asyncHandler.js";
import {ApiError} from "../utils/ApiError.js"
import { User } from "../models/user.model.js";
import {uploadOnCloudianry} from  "../utils/cloudinary.js"
import {ApiResponse} from "../utils/ApiResponse.js"


const registerUser= asyncHandler( async(req,res)=>{
    



    const {fullName,email, username,password} =req.body

    if([fullName,email,username,password].some(field=> field?.trim() ==="")){
        throw new ApiError(400,"All fields are required")
    }

    const existedUser=await User.findOne({ //await added
        $or:[{email},{username}]
    })
    if(existedUser){
        throw new Error(409,"User with email or username already existed")
    }

    const avatarLocalPath = req.files?.avatar[0]?.path
    const coverImageLocalPath = req.files?.coverImage[0]?.path


    if(!avatar){
        throw new ApiError(400,"Avatar file is required ")
    }

    const avatar=await uploadOnCloudianry(avatarLocalPath)
    const coverImage =await uploadOnCloudianry(coverImageLocalPath)

    if(!avatar){
        throw new ApiError(400,"Avatar file is required ")

    }

    const user = await User.create({
        fullName,
        avatar:coverImage?.url || "",
        email,
        password,
        username:username.toLowerCase(),

    })

    const createdUser= await User.findById(user._id).select("-password -refreshToken")

    if(!createdUser){
        throw new ApiError(500,"Something went wrong while registering the user")
    }

    return res.status(201).json(
        new ApiResponse(200, createdUser, "User Registered Successfully")
    )


    console.log(req.files)
    // console.log(email,password)



 

    // res.status(200).json({
    //     message:'ok'
    // })
    
})

export {registerUser}