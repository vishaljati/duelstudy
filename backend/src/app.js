import express from "express"
import cookieParser from "cookie-parser"
import cors from "cors"


const app = express ()

app.use(cors());

app.use(express.json({limit:"16kb"}))
app.use(express.urlencoded({extended:true , limit:"16kb"}))
app.use(express.static("public"))
app.use(cookieParser())


import userRouter from "./routes/user.routes.js"
import plannerRoutes from "./routes/planner.routes.js";
import questionLogRoutes from "./routes/questionLog.routes.js";
import timetableRoutes from "./routes/timetable.routes.js";



app.use("/api/users", userRouter)
app.use("/api/planner", plannerRoutes);
app.use("/api/questions", questionLogRoutes);
app.use("/api/timetable", timetableRoutes);

export { app }