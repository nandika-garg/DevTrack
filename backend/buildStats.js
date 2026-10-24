const XP = { Easy: 1, Medium: 3, Hard: 6 };
const canonicalDifficulty = (value) => {
  if (!value) return null;
  const v = String(value).toLowerCase();
  if (v === 'easy') return 'Easy';
  if (v === 'medium') return 'Medium';
  if (v === 'hard') return 'Hard';
  return null;
};

/** Pure aggregation of normalized platform snapshots. Does not mutate inputs. */
export default function buildStats(platformData = {}, now = new Date()) {
  const platforms = Object.values(platformData).filter((p) => p && !p.error);
  const allProblems = platforms.flatMap((p) => (p.recentProblems || []).map((problem) => ({
    ...problem,
    platform: problem.platform || p.platform,
    difficulty: canonicalDifficulty(problem.difficulty),
    tags: Array.isArray(problem.tags) ? problem.tags : [],
  })));
  const byNativeId = new Map();
  for (const problem of allProblems) {
    if (!problem.problemId) continue;
    const key = `${problem.platform}:${problem.problemId}`;
    const previous = byNativeId.get(key);
    if (!previous || (problem.timestamp || 0) > (previous.timestamp || 0)) byNativeId.set(key, problem);
  }
  const problems = [...byNativeId.values()];
  const activity = new Map();
  for (const problem of problems) {
    if (!Number.isFinite(Number(problem.timestamp)) || Number(problem.timestamp) <= 0) continue;
    const day = new Date(Number(problem.timestamp)).toISOString().slice(0, 10);
    activity.set(day, (activity.get(day) || 0) + 1);
  }
  const dates = [...activity.keys()].sort();
  let streak = 0;

const today = new Date(now);
const todayKey = today.toISOString().slice(0, 10);

const yesterday = new Date(today);
yesterday.setUTCDate(yesterday.getUTCDate() - 1);
const yesterdayKey = yesterday.toISOString().slice(0, 10);

let cursorKey = activity.has(todayKey)
  ? todayKey
  : activity.has(yesterdayKey)
    ? yesterdayKey
    : null;

while (cursorKey && activity.has(cursorKey)) {
  streak++;

  const cursor = new Date(`${cursorKey}T00:00:00.000Z`);
  cursor.setUTCDate(cursor.getUTCDate() - 1);
  cursorKey = cursor.toISOString().slice(0, 10);
}
  let longestStreak = 0, run = 0, prior = null;
  for (const day of dates) {
    const current = new Date(`${day}T00:00:00`);
    if (prior) {
      const diff = Math.round((current - prior) / 86400000);
      run = diff === 1 ? run + 1 : 1;
    } else run = 1;
    longestStreak = Math.max(longestStreak, run); prior = current;
  }
  const difficulty = { Easy: 0, Medium: 0, Hard: 0, Unknown: 0 };
  const topics = new Map();
  const languages = new Map();
  for (const p of problems) {
    difficulty[p.difficulty || 'Unknown']++;
    for (const tag of p.tags) {
      const label = String(tag).trim(); if (label) topics.set(label, (topics.get(label) || 0) + 1);
    }
    if (p.language) languages.set(p.language, (languages.get(p.language) || 0) + 1);
  }
  const xp = problems.reduce((sum, p) => sum + (XP[p.difficulty] || 0), 0);
  const level = Math.floor(xp / 100) + 1;
  const xpInLevel = xp % 100;
  const monthly = new Map();
  for (const [day, count] of activity) { const month = day.slice(0, 7); monthly.set(month, (monthly.get(month) || 0) + count); }
  const platformTotals = platforms.map((p) => ({
    platform: p.platform,
    total: p.platform === 'leetcode' ? (p.totals?.all ?? null) : p.platform === 'codeforces' ? (p.stats?.distinctSolvedInFetchedSubmissions ?? null) : (p.stats?.totalSolved ?? null),
  }));
  const reportedTotals = platformTotals.reduce((sum, p) => sum + (Number.isFinite(Number(p.total)) ? Number(p.total) : 0), 0);
  return {
    platformCount: platforms.length,
    platformReportedTotal: reportedTotals,
    individuallyImported: problems.length,
    uniqueAcrossPlatforms: null,
    uniqueEstimateNote: 'Cross-platform equivalence is not inferred; native IDs are only deduplicated within each platform.',
    difficulty,
    xp, level, xpInLevel, xpToNextLevel: 100 - xpInLevel,
    currentStreak: streak, longestStreak, activeDays: activity.size,
    activity: [...activity].map(([date, count]) => ({ date, count })).sort((a, b) => a.date.localeCompare(b.date)),
    monthly: [...monthly].map(([month, count]) => ({ month, count })).sort((a, b) => a.month.localeCompare(b.month)).slice(-12),
    topics: [...topics].map(([topic, solved]) => ({ topic, solved })).sort((a, b) => b.solved - a.solved),
    languages: [...languages].map(([language, solved]) => ({ language, solved })).sort((a, b) => b.solved - a.solved),
    recentProblems: problems.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0)).slice(0, 12),
    platformTotals,
  };
}
export { canonicalDifficulty };
