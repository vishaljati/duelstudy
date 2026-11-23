
import mongoose from "mongoose";

const timetableSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    title: {
      type: String,
      required: [true, "Activity title is required"],
      trim: true,
      minlength: 2,
      maxlength: 100,
    },

    subject: {
      type: String,
      trim: true,
      default: "",
      maxlength: 50,
    },

    day: {
      type: String,
      required: true,
      enum: [
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
        "Sunday",
      ],
    },

    startTime: {
      type: String,
      required: true,
      match: /^([01]\d|2[0-3]):[0-5]\d$/,
    },

    endTime: {
      type: String,
      required: true,
      match: /^([01]\d|2[0-3]):[0-5]\d$/,
    },

    description: {
      type: String,
      trim: true,
      default: "",
      maxlength: 300,
    },
  },
  { timestamps: true }
);

// Efficiently retrieve a user's weekly timetable.
timetableSchema.index({
  userId: 1,
  day: 1,
  startTime: 1,
});

export const Timetable = mongoose.model("Timetable", timetableSchema);


