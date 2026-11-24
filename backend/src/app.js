import express from "express"
import cookieParser from "cookie-parser"
import cors from "cors"


const app = express ()

app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json({limit:"16kb"}))
app.use(express.urlencoded({extended:true , limit:"16kb"}))
app.use(express.static("public"))
app.use(cookieParser())


import userRouter from "./routes/user.routes.js"
import plannerRoutes from "./routes/planner.routes.js";
import questionLogRoutes from "./routes/questionLog.routes.js";
import timetableRoutes from "./routes/timetable.routes.js";
import activityRoutes from "./routes/activity.routes.js";
import friendRoutes from "./routes/friend.routes.js";
import competitionRoutes from "./routes/competition.routes.js";
import rewardRouter from "./routes/reward.routes.js";
import { errorHandler } from "./middlewares/error.middleware.js";



app.use("/api/users", userRouter)
app.use("/api/planner", plannerRoutes);
app.use("/api/questions", questionLogRoutes);
app.use("/api/timetable", timetableRoutes);
app.use("/api/activity", activityRoutes);
app.use("/api/friends", friendRoutes);
app.use("/api/competition", competitionRoutes);
app.use("/api/rewards", rewardRouter);

app.use(errorHandler);

export { app }
