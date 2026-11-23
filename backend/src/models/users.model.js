import mongoose, { Schema } from "mongoose";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt"


const userSchema = new mongoose.Schema(
    {
        
        name: {
            type: String,
            required: [true, "Name is required"],
            trim: true,
            minlength: 2,
            maxlength: 50,
        },

        email: {
            type: String,
            required: [true, "Email is required"],
            unique: true,
            lowercase: true,
            trim: true,
        },

        
        goal: {
            type: String,
            required: [true, "Academic goal is required"],
            enum: ["NEET", "CSE"],
            immutable: true,
        },

       
        password: {
            type: String,
            required: [true, "Password hash is required"],
            select: false,
        },

       
        inviteCode: {
            type: String,
            required: true,
            unique: true,
            uppercase: true,
            trim: true,
        },

        weeklyTargetHours: {
            type: Number,
            default: 42,
            min: 1,
            max: 168,
        },

        // Account status
        isActive: {
            type: Boolean,
            default: true,
        },
        refreshToken: {
            type: String
        }
    },
    {
        timestamps: true,
    }
);

// Encrypting password when user modify the password
userSchema.pre("save", async function (next) {

    if (!this.isModified("password")) {
        return next();
    }
    this.password = await bcrypt.hash(this.password, 10);
    next();

})

// Checking encrypted password with user inputted pass?

userSchema.methods.isPasswordCorrect = async function (password) {
    return await bcrypt.compare(password, this.password)
}

userSchema.methods.generateAccessToken = function () {
    return jwt.sign(
        {
            _id: this._id,
            name: this.username,
            email: this.email,
            
        },
        process.env.ACCESS_TOKEN_SECRET,
        {
            expiresIn: process.env.ACCESS_TOKEN_EXPIRY
        }
    )
}
userSchema.methods.generateRefreshToken = function () {
    return jwt.sign(
        {
            _id: this._id,

        },
        process.env.REFRESH_TOKEN_SECRET,
        {
            expiresIn: process.env.REFRESH_TOKEN_EXPIRY
        }
    )
}


export const User = mongoose.model("User", userSchema)