import { asyncHandler } from "../utils/asyncHandler.js";
import {ApiError} from "../utils/ApiError.js"
import { User } from "../models/user.model.js";
import {uploadOnCloudinary} from  "../utils/cloudinary.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import jwt from "jsonwebtoken"



const generateAccessAndRefreshToken = async(userId)=>{
    try {

        const user= await User.findById(userId)
        const accessToken=user.generateAccessToken();
        const refreshToken=user.generateRefreshToken();

        user.refreshToken=refreshToken;
        await user.save({validateBeforeSave:false});   //Why?

        return {accessToken,refreshToken}


        
    } catch (error) {
        throw new ApiError(500,error.message ||"Somenthing went wrong while generating access and refresh token")
        
    }
}


const registerUser= asyncHandler( async(req,res)=>{
    

    const {fullName,email, username,password} =req.body

    if([fullName,email,username,password].some(field=> field?.trim() ==="")){
        throw new ApiError(400,"All fields are required")
    }

    const existedUser=await User.findOne({ //await added
        $or:[{email},{username}]
    })
    if(existedUser){
        throw new ApiError(409,"User with email or username already existed")
    }

    const avatarLocalPath = req.files?.avatar?.[0]?.path
    const coverImageLocalPath = req.files?.coverImage?.[0]?.path


    console.log(req.files)

    // const avatarLocalPath = req.files?.avatar[0]?.path;
    // //const coverImageLocalPath = req.files?.coverImage[0]?.path;

    // let coverImageLocalPath;
    // if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
    //     coverImageLocalPath = req.files.coverImage[0].path
    // }


    if(!avatarLocalPath){
        throw new ApiError(400,"Avatar file is required ")
    }

    const avatar=await uploadOnCloudinary(avatarLocalPath)
    const coverImage =await uploadOnCloudinary(coverImageLocalPath)

    if(!avatar){
        throw new ApiError(400,"Avatar file is required ")

    }

    const user = await User.create({
        fullName,
        avatar:avatar?.url,
        coverImage:coverImage?.url || "",
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

    // console.log(email,password)

    // res.status(200).json({
    //     message:'ok'
    // })
    
})

const loginUser= asyncHandler(async(req,res)=>{


    // data frmo req.body
    // username or email
    // find the user
    // validate password
    // access and refresh roken

    // send cookie
    // send response


    const {username,email, password}= req.body;
    if(!(username || password)){
        throw new ApiError(400,"username or email required");
    }

    const user=await User.findOne({
        $or: [{username},{email}]
    });

    if(!user){
        throw new ApiError(404,"User doesn't exist");

    }

    const isPasswordValid =await user.isPasswordCorrect(password);

    if(!isPasswordValid){
        throw new ApiError(401,"Invalid Useer credentials");

    }

    const {accessToken,refreshToken}=await generateAccessAndRefreshToken(user._id)

    const loggedInUser= await User.findById(user._id).select("-password -refreshToken")

    const options={
        httpOnly:true,
        secure:true,
    }

    return res.status(200)
              .cookie("accessToken",accessToken,options)
              .cookie("refreshToken",refreshToken,options)
              .json(new ApiResponse(200,{user:loggedInUser,accessToken,refreshToken},"User LoggedIn successfully!"))

     





})

const logoutUser= asyncHandler( async(req,res)=>{

    

    await User.findByIdAndUpdate(req.user._id,{

        $set:{
            refreshToken: undefined
        }

    },{
        new:true
    })


    const options={
        httpOnly:true,
        secure:true,
    }

    return res.status(200)
              .clearCookie("accessToken",options)
              .clearCookie("refreshToken",options)
              .json(new ApiResponse(200,{}, "User logged Out"))

})

const  refreshAccessToken =asyncHandler(async(req,res)=>{

    const incomingRefreshToken= req.cookies.refreshToken || req.body.refreshToken

    if(!incomingRefreshToken){
        throw new ApiError(401,"Unauthorized request");
    }

    try {
        const decodedToken=jwt.verify(incomingRefreshToken,process.env.REFRESH_TOKEN_SECRET);
    
        const user =User.findById(decodedToken?._id);
    
        if(!user){
            throw new ApiError(401,"Invalid Refresh Token");
        }
    
        if(incomingRefreshToken !== user?.refreshToken){
            throw new ApiError(401,"Refresh Tokn is Expired or used")
        }
    
        const options={
            httpOnly:true,
            secure:true
        }
    
        const {accessToken, newRefreshToken}=await generateAccessAndRefreshToken(user._id)
    
        return res.status(200).cookie("accessToekn",accessToken,options)
                  .cookie("refreshToken",newRefreshToken,options)
                  .json(new ApiResponse(200,{accessToken,newRefreshToken},"Access Token refreshed Successfully"))
    } catch (error) {
        throw new ApiError(401,error?.message || "Invalid refresh Token")
        
    }



})

export {registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
}