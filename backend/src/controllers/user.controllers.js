import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/users.model.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";
import { randomBytes } from "node:crypto";

/* -------------------------------------------------------------------------- */
/*  Cookie configuration                                                      */
/* -------------------------------------------------------------------------- */

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

// Converts values such as "10d", "12h" or "30m" into milliseconds.
// Falls back to the given number of days if the value is missing or invalid.
const durationToMs = (value, fallbackDays) => {
    const match = /^(\d+)\s*([smhd])$/.exec(String(value ?? "").trim());

    if (!match) {
        return fallbackDays * DAY;
    }

    const units = { s: SECOND, m: MINUTE, h: HOUR, d: DAY };

    return Number(match[1]) * units[match[2]];
};

// Read env lazily so values are always available, even if dotenv loads late.
// The cookie lifetime follows the JWT expiry, so both always expire together.
// Without maxAge the cookies would be session cookies and disappear when the
// browser closes, which forces the user to log in again.
const getCookieOptions = () => {
    const base = {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
    };

    return {
        base,
        access: {
            ...base,
            maxAge: durationToMs(process.env.ACCESS_TOKEN_EXPIRY, 10),
        },
        refresh: {
            ...base,
            maxAge: durationToMs(process.env.REFRESH_TOKEN_EXPIRY, 30),
        },
    };
};

const setAuthCookies = (res, accessToken, refreshToken) => {
    const options = getCookieOptions();

    return res
        .cookie("accessToken", accessToken, options.access)
        .cookie("refreshToken", refreshToken, options.refresh);
};

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                   */
/* -------------------------------------------------------------------------- */

const generateInviteCode = async () => {
    let inviteCode;
    let exists = true;

    while (exists) {
        inviteCode = `DUEL-${randomBytes(4).toString("hex").toUpperCase()}`;

        exists = await User.exists({ inviteCode });
    }

    return inviteCode;
};

const generateAccessAndRefreshTokens = async (userId) => {
    try {
        const user = await User.findById(userId);

        if (!user) {
            throw new Error("User not found while generating tokens");
        }

        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();

        // Store the refresh token in the database for rotation checks.
        user.refreshToken = refreshToken;
        await user.save({ validateBeforeSave: false });

        return { accessToken, refreshToken };
    } catch (error) {
        console.log("ERROR :", error);
        throw new ApiError(
            500,
            "Something went wrong while generating Access and Refresh Token"
        );
    }
};

/* -------------------------------------------------------------------------- */
/*  Controllers                                                               */
/* -------------------------------------------------------------------------- */

const registerUser = asyncHandler(async (req, res) => {
    const { name, email, password, goal } = req.body;

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

    const existingUser = await User.findOne({ email: normalizedEmail });

    if (existingUser) {
        throw new ApiError(409, "Email already exists");
    }

    const inviteCode = await generateInviteCode();

    const user = await User.create({
        name: name.trim(),
        email: normalizedEmail,
        password,
        goal: normalizedGoal,
        inviteCode,
    });

    const { accessToken, refreshToken } =
        await generateAccessAndRefreshTokens(user._id);

    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    );

    if (!createdUser) {
        throw new ApiError(500, "Something went wrong while registering user");
    }

    return setAuthCookies(res.status(200), accessToken, refreshToken).json(
        new ApiResponse(200, { user: createdUser }, "User registered successfully")
    );
});

const loginUser = asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    if (!email) {
        throw new ApiError(400, "Email is required");
    }

    if (!password) {
        throw new ApiError(400, "Password is required");
    }

    const user = await User.findOne({
        email: email.trim().toLowerCase(),
    }).select("+password");

    if (!user) {
        throw new ApiError(404, "User does not exist");
    }

    const isPasswordValid = await user.isPasswordCorrect(password);

    if (!isPasswordValid) {
        throw new ApiError(401, "Password incorrect");
    }

    const { accessToken, refreshToken } =
        await generateAccessAndRefreshTokens(user._id);

    // Never send the password hash or refresh token in the JSON body.
    const loggedInUser = await User.findById(user._id).select(
        "-password -refreshToken"
    );

    return setAuthCookies(res.status(200), accessToken, refreshToken).json(
        new ApiResponse(200, { user: loggedInUser }, "User Logged In Successfully")
    );
});

const logOutUser = asyncHandler(async (req, res) => {
    // $unset truly removes the field. $set with undefined is ignored by Mongoose.
    await User.findByIdAndUpdate(req.user._id, {
        $unset: { refreshToken: 1 },
    });

    const { base } = getCookieOptions();

    return res
        .status(200)
        .clearCookie("accessToken", base)
        .clearCookie("refreshToken", base)
        .json(new ApiResponse(200, {}, "User Logged out"));
});

const refreshAccessToken = asyncHandler(async (req, res) => {
    const cookies = req.cookies || {};
    const body = req.body || {};

    const incomingRefreshToken = cookies.refreshToken || body.refreshToken;

    if (
        !incomingRefreshToken ||
        typeof incomingRefreshToken !== "string" ||
        !incomingRefreshToken.trim()
    ) {
        throw new ApiError(
            401,
            "Unauthorized request: Refresh token missing or invalid"
        );
    }

    let decodedToken;

    try {
        decodedToken = jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET
        );
    } catch {
        throw new ApiError(401, "Invalid or expired refresh token");
    }

    const user = await User.findById(decodedToken._id);

    if (!user) {
        throw new ApiError(401, "Invalid refresh token");
    }

    if (incomingRefreshToken !== user.refreshToken) {
        throw new ApiError(401, "Refresh token is expired or used");
    }

    // The function returns { accessToken, refreshToken }. Rename the second
    // value instead of destructuring a name that does not exist, otherwise the
    // refresh cookie is overwritten with "undefined" and the next refresh fails.
    const { accessToken, refreshToken: newRefreshToken } =
        await generateAccessAndRefreshTokens(user._id);

    return setAuthCookies(res.status(200), accessToken, newRefreshToken).json(
        new ApiResponse(
            200,
            {},
            "Access Token Refreshed Successfully"
        )
    );
});

// PROTECTED CONTROLLERS
const changeCurrentPassword = asyncHandler(async (req, res) => {
    const { oldPassword, newPassword } = req.body;

    // 400, not 401: the frontend treats 401 as "session expired" and tries a refresh.
    if (!oldPassword || !newPassword) {
        throw new ApiError(400, "Old and New Passwords are required");
    }

    const user = await User.findById(req.user._id).select("+password");

    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);

    if (!isPasswordCorrect) {
        throw new ApiError(400, "Given Password is incorrect");
    }

    if (oldPassword === newPassword) {
        throw new ApiError(
            400,
            "Old password and new password must not be same"
        );
    }

    user.password = newPassword;
    await user.save({ validateBeforeSave: false });

    return res
        .status(200)
        .json(new ApiResponse(200, {}, "Password Changed Successfully"));
});

const getCurrentUser = asyncHandler(async (req, res) => {
    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                { user: req.user },
                "Current user fetched successfully"
            )
        );
});

const updateAccountDetails = asyncHandler(async (req, res) => {
    const { name } = req.body;

    if (!name?.trim()) {
        throw new ApiError(400, "Full Name is required");
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        { $set: { name: name.trim() } },
        { new: true, runValidators: true }
    ).select("-password -refreshToken");

    return res
        .status(200)
        .json(
            new ApiResponse(200, { user }, "User details updated successfully")
        );
});

export {
    registerUser,
    loginUser,
    logOutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
};