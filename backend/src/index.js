
import dotenv from "dotenv";

dotenv.config({
  path: "./.env",
});

import { connectDB } from "./db/index.js";
import { app } from "./app.js";

import {
  recoverMissedDailyDuels,
  startDailyDuelJob,
} from "./jobs/dailyDuel.job.js";

// Demo response
app.get("/", (req, res) => {
  res.send(
    `<h1>Server is running successfully on ${process.env.PORT}</h1>`
  );
});

// Server configuration
const PORT = process.env.PORT || 5000;

// Connect database and start server
const startServer = async () => {
  try {
    // 1. Connect to MongoDB
    await connectDB();

    console.log("MongoDB connected successfully.");

    // 2. Recover any missed Daily Duel snapshots
    await recoverMissedDailyDuels();

    // 3. Start automatic Daily Duel finalization
    startDailyDuelJob();

    // 4. Start Express server
    app.listen(PORT, (err) => {
      if (err) {
        console.error("Error starting server:", err);
        process.exit(1);
      }

      console.log(`Server started at http://127.0.0.1:${PORT}`);
    });
  } catch (error) {
    console.error("Server startup failed:", error);
    process.exit(1);
  }
};

startServer();
