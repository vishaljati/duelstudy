
import cron from "node-cron";
import { finalizeDailyDuel } from "../utils/dailyDuel.service.js";

const TIME_ZONE = "Asia/Kolkata";
const DAILY_DUEL_START_DATE = process.env.DAILY_DUEL_START_DATE;

let isRunning = false;

// Returns today's date in YYYY-MM-DD format using IST.
const getTodayKey = () => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const values = Object.fromEntries(
    parts.map(({ type, value }) => [type, value])
  );

  return `${values.year}-${values.month}-${values.day}`;
};

// Subtracts one calendar day without relying on server timezone.
const getPreviousDateKey = (dateKey) => {
  const date = new Date(`${dateKey}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() - 1);

  return date.toISOString().slice(0, 10);
};

// Adds one calendar day without relying on server timezone.
const getNextDateKey = (dateKey) => {
  const date = new Date(`${dateKey}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + 1);

  return date.toISOString().slice(0, 10);
};

/**
 * Finalizes every date that should already be historical.
 *
 * Existing snapshots are protected by the service's
 * $setOnInsert upsert logic, so this is safe to rerun.
 */
export const recoverMissedDailyDuels = async () => {
  if (isRunning) {
    console.log("[Daily Duel] A finalization job is already running.");
    return;
  }

  isRunning = true;

  try {
    if (!DAILY_DUEL_START_DATE) {
      throw new Error("DAILY_DUEL_START_DATE is not configured.");
    }

    const yesterday = getPreviousDateKey(getTodayKey());

    if (DAILY_DUEL_START_DATE > yesterday) {
      console.log("[Daily Duel] No historical dates need finalization.");
      return;
    }

    console.log(
      `[Daily Duel] Recovering snapshots from ${DAILY_DUEL_START_DATE} to ${yesterday}`
    );

    let currentDate = DAILY_DUEL_START_DATE;
    let finalizedDates = 0;

    while (currentDate <= yesterday) {
      await finalizeDailyDuel(currentDate);

      console.log(`[Daily Duel] Finalized: ${currentDate}`);

      finalizedDates++;
      currentDate = getNextDateKey(currentDate);
    }

    console.log(
      `[Daily Duel] Recovery completed. Processed ${finalizedDates} dates.`
    );
  } catch (error) {
    console.error("[Daily Duel] Finalization failed:", error);
    throw error;
  } finally {
    isRunning = false;
  }
};

/**
 * Runs every day at 12:05 AM IST.
 * Five minutes after midnight gives the date boundary
 * time to settle before yesterday is finalized.
 */
export const startDailyDuelJob = () => {
  cron.schedule(
    "5 0 * * *",
    async () => {
      console.log("[Daily Duel] Scheduled finalization started.");

      try {
        await recoverMissedDailyDuels();
      } catch (error) {
        console.error(
          "[Daily Duel] Scheduled finalization failed:",
          error
        );
      }
    },
    {
      timezone: TIME_ZONE,
    }
  );

  console.log("[Daily Duel] Cron job scheduled for 12:05 AM IST.");
};
