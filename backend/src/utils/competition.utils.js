
const TIME_ZONE = "Asia/Kolkata";

export const getTodayKey = () => {
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

export const addDays = (dateKey, amount) => {
  const date = new Date(`${dateKey}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
};

export const getWeekRange = () => {
  const today = getTodayKey();
  const weekday = new Date(`${today}T00:00:00.000Z`).getUTCDay();

  // Monday = 0, Tuesday = 1, ... Sunday = 6.
  const daysSinceMonday = (weekday + 6) % 7;

  const startDate = addDays(today, -daysSinceMonday);

  return {
    startDate,
    endDate: addDays(startDate, 6),
  };
};

export const calculateCompetitionStats = (activities) => {
  const sortedActivities = [...activities].sort((a, b) =>
    a.dateKey.localeCompare(b.dateKey)
  );

  const activeDates = sortedActivities
    .filter((activity) => activity.studyMinutes > 0)
    .map((activity) => activity.dateKey);

  const activeSet = new Set(activeDates);

  let currentStreak = 0;
  let longestStreak = 0;
  let runningStreak = 0;
  let previousDate = null;

  for (const date of activeDates) {
    if (previousDate && addDays(previousDate, 1) === date) {
      runningStreak++;
    } else {
      runningStreak = 1;
    }

    longestStreak = Math.max(longestStreak, runningStreak);
    previousDate = date;
  }

  const today = getTodayKey();
  let streakDate = activeSet.has(today) ? today : addDays(today, -1);

  while (activeSet.has(streakDate)) {
    currentStreak++;
    streakDate = addDays(streakDate, -1);
  }

  const dailyStats = sortedActivities.map((activity) => {
    const minutes = activity.studyMinutes || 0;

    // Maximum 4 hours of time-based points per day.
    const timePoints = Math.min(Math.floor(minutes / 30), 8) * 10;

    const activeDayPoints = minutes > 0 ? 5 : 0;

    // Calculate the streak ending on this activity date.
    let streak = 0;
    let date = activity.dateKey;

    while (activeSet.has(date)) {
      streak++;
      date = addDays(date, -1);
    }

    const streakBonus =
      streak === 30 ? 100 :
      streak === 7 ? 20 : 0;

    return {
      dateKey: activity.dateKey,
      studyMinutes: minutes,
      points: timePoints + activeDayPoints + streakBonus,
      streakBonus,
    };
  });

  return {
    totalStudyMinutes: sortedActivities.reduce(
      (sum, item) => sum + (item.studyMinutes || 0),
      0
    ),
    activeDays: activeDates.length,
    currentStreak,
    longestStreak,
    totalPoints: dailyStats.reduce(
      (sum, item) => sum + item.points,
      0
    ),
    dailyStats,
  };
};
