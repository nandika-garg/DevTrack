import { Router } from 'express';
const router = Router();
const LEETCODE_GQL = 'https://leetcode.com/graphql';
const PROFILE_QUERY = `query userProblemsSolved($username: String!) {
  matchedUser(username: $username) {
    username
    profile { realName userAvatar }
    submitStatsGlobal { acSubmissionNum { difficulty count } }
  }
  recentAcSubmissionList(username: $username, limit: 50) { id title titleSlug timestamp }
}`;
const QUESTION_QUERY = `query questionData($titleSlug: String!) {
  question(titleSlug: $titleSlug) { title titleSlug difficulty topicTags { name slug } }
}`;
async function gql(query, variables) {
  const response = await fetch(LEETCODE_GQL, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Referer': 'https://leetcode.com/' }, body: JSON.stringify({ query, variables }), signal: AbortSignal.timeout(12000) });
  if (!response.ok) throw new Error(`LeetCode API request failed (${response.status})`);
  return response.json();
}
router.get('/:username', async (req, res) => {
  const username = String(req.params.username || '').trim();
  if (!username) return res.status(400).json({ error: 'Username is required' });
  try {
    const { data, errors } = await gql(PROFILE_QUERY, { username });
    if (errors?.length) console.warn('LeetCode optional/profile GraphQL errors:', errors.map((e) => e.message).join('; ').slice(0, 300));
    if (!data?.matchedUser) return res.status(404).json({ error: 'User not found on LeetCode' });
    const counts = Object.fromEntries((data.matchedUser.submitStatsGlobal?.acSubmissionNum || []).map((d) => [d.difficulty, d.count]));
    const submissions = data.recentAcSubmissionList || [];
    // Batch enrichment with a small concurrency cap; failures are optional and never erase profile stats.
    const enriched = new Map();
    for (let i = 0; i < Math.min(submissions.length, 20); i += 3) {
      await Promise.all(submissions.slice(i, i + 3).map(async (sub) => {
        try {
          const result = await gql(QUESTION_QUERY, { titleSlug: sub.titleSlug });
          const q = result.data?.question;
          if (q) enriched.set(sub.titleSlug, { difficulty: q.difficulty || null, tags: (q.topicTags || []).map((t) => t.name) });
          if (result.errors?.length) console.warn('LeetCode optional question query failed:', sub.titleSlug, result.errors.map((e) => e.message).join('; ').slice(0, 200));
        } catch (error) { console.warn('LeetCode optional question enrichment failed:', sub.titleSlug, error.message); }
      }));
    }
    const recentProblems = submissions.map((sub) => ({ platform: 'leetcode', problemId: sub.titleSlug, title: sub.title, difficulty: enriched.get(sub.titleSlug)?.difficulty || null, tags: enriched.get(sub.titleSlug)?.tags || [], timestamp: Number(sub.timestamp) * 1000, url: `https://leetcode.com/problems/${sub.titleSlug}/` }));
    res.json({ platform: 'leetcode', username: data.matchedUser.username, displayName: data.matchedUser.profile?.realName || data.matchedUser.username, avatar: data.matchedUser.profile?.userAvatar || null, profileUrl: `https://leetcode.com/${encodeURIComponent(data.matchedUser.username)}/`, totals: { all: counts.All ?? 0, easy: counts.Easy ?? 0, medium: counts.Medium ?? 0, hard: counts.Hard ?? 0 }, recentProblems, historyNote: 'The profile totals are platform-reported. The activity list contains only the 50 most recent accepted submissions exposed by this endpoint.', lastSyncedAt: new Date().toISOString() });
  } catch (error) {
    console.error('LeetCode fetch failed:', error.message);
    res.status(502).json({ error: 'Could not fetch LeetCode profile. Try again later.' });
  }
});
export default router;
