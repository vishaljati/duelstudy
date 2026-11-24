import mongoose from "mongoose";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/users.model.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";
import { randomBytes } from "node:crypto";

const generateInviteCode = async () => {
    let inviteCode;
    let exists = true;

    while (exists) {
        inviteCode = `DUEL-${randomBytes(4)
            .toString("hex")
            .toUpperCase()}`;

        exists = await User.exists({ inviteCode });
    }

    return inviteCode;
};

const generateAccessAndRefreshTokens = async (userId) => {
    try {
        const user = await User.findById(userId)
        const AccessToken = user.generateAccessToken()
        const RefreshToken = user.generateRefreshToken()

        user.refreshToken = RefreshToken // save refresh token in db


        await user.save({ validateBeforeSave: false })

        return { AccessToken, RefreshToken }

    } catch (error) {
        console.log("ERROR :", error);
        throw new ApiError(500, "Something went wrong while generating Access and Refresh Token")
    }
}

const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
};

const registerUser = asyncHandler(async (req, res) => {

    const { name, email, password, goal } = req.body

    if (!name?.trim() || !email?.trim() || !password || !goal) {
        return res.status(400).json({
            success: false,
            message: "Name, email, password and goal are required",
        });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail)) {
        return res.status(400).json({
            success: false,
            message: "Please provide a valid email address",
        });
    }
    const normalizedGoal = goal.toUpperCase();

    if (!["NEET", "CSE"].includes(normalizedGoal)) {
        return res.status(400).json({
            success: false,
            message: "Goal must be either NEET or CSE",
        });
    }
    const existingUser = await User.findOne({
        email: normalizedEmail,
    });

    if (existingUser) {
        throw new ApiError(409, "Email already exists")
    }

    const inviteCode = await generateInviteCode();
    const user = await User.create({
        name: name.trim(),
        email: normalizedEmail,
        password,
        goal: normalizedGoal,
        inviteCode,
    });

    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )
    if (!createdUser) {
        throw new ApiError(500, "Something went wrong while registering user");

    }
    const { AccessToken, RefreshToken } = await generateAccessAndRefreshTokens(user._id)



    return res.status(200)
        .cookie("accessToken", AccessToken, cookieOptions)
        .cookie("refreshToken", RefreshToken, cookieOptions)
        .json(
            new ApiResponse(200,  { user: createdUser } , "User registered successfully")
        )


})

const loginUser = asyncHandler(async (req, res) => {

    const { email, password } = req.body

    if (!email) {
        throw new ApiError(400, "Email is required")
    }

    const user = await User.findOne({
        email: email.trim().toLowerCase(),
    }).select("+password");

    if (!user) {
        throw new ApiError(404, "User does not exist");

    }
    const isPasswordValid = await user.isPasswordCorrect(password)

    if (!isPasswordValid) {
        throw new ApiError(401, "Password incorrect");

    }
    const { AccessToken, RefreshToken } = await generateAccessAndRefreshTokens(user._id)

    const loggedInUser = await User.findById(user._id).select("-password -refreshTokens")



    return res.status(200)
        .cookie("accessToken", AccessToken, cookieOptions)
        .cookie("refreshToken", RefreshToken, cookieOptions)
        .json(new ApiResponse(200,
            {
                user: loggedInUser
            },
            "User Logged In Successfully"
        )
        )


})


const logOutUser = asyncHandler(async (req, res) => {

    await User.findByIdAndUpdate(


        req.user._id,
        {
            $set: {
                refreshToken: undefined
            }
        },
        {
            new: true   // return response will be new response
        }

    )



    return res.status(200)
        .clearCookie("accessToken", cookieOptions)
        .clearCookie("refreshToken", cookieOptions)
        .json(new ApiResponse(200,
            {},
            "User Logged out"
        ))

})


const refreshAccessToken = asyncHandler(async (req, res) => {

    const cookies = req.cookies || {}
    const body = req.body || {}


    const incomingRefreshToken =
        cookies.refreshToken || body.refreshToken;



    if (!incomingRefreshToken || typeof incomingRefreshToken !== "string" || !incomingRefreshToken.trim()) {
        throw new ApiError(401, "Unauthorized request: Refresh token missing or invalid");
    }

    try {
        const decodedToken = jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET
        )

        const user = await User.findById(decodedToken._id)

        if (!user) {
            throw new ApiError(401, "Invalid refresh token");
        }

        if (incomingRefreshToken !== user?.refreshToken) {
            throw new ApiError(401, "Refresh token is expired or used");
        }



        const { AccessToken, newRefreshToken } = await generateAccessAndRefreshTokens(user._id)


        return res.status(200)
            .cookie("accessToken", AccessToken, cookieOptions)
            .cookie("refreshToken", newRefreshToken, cookieOptions)
            .json(
                new ApiResponse(
                    200,
                    {
                        accessToken: AccessToken,
                        refreshToken: newRefreshToken
                    },
                    "Access Token Refreshed Successfully"
                )
            )
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid Refresh Token");

    }
})

// PROTECTED CONTROLLER
const changeCurrentPassword = asyncHandler(async (req, res) => {

    const { oldPassword, newPassword } = req.body
    if (!oldPassword || !newPassword) {
        throw new ApiError(401, "Old and New Passwords are required")
    }

    const user = await User.findById(req.user._id)


    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)
    if (!isPasswordCorrect) {
        throw new ApiError(400, "Given Password is incorrect");

    }
    if (oldPassword === newPassword) {
        throw new ApiError(400, "Old password and new password must not be same");

    }

    user.password = newPassword
    await user.save({ validateBeforeSave: false })

    return res.status(200).json(new ApiResponse(
        200,
        {},
        "Password Changed Successfully"
    ))


})

const getCurrentUser = asyncHandler(async (req, res) => {

    const user = req.user
    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                { user },
                "Current user fetched successfully"
            ))

})

const updateAccountDetails = asyncHandler(async (req, res) => {

    const { name } = req.body

    if (!name) {
        throw new ApiError(401, "Full Name is required");

    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                name

            }
        },
        {
            new: true
        }

    ).select("-password")

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                { user },
                "User details updated successfully"
            )
        )


})



export {
    registerUser,
    loginUser,
    logOutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
}