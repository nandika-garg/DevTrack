import test from 'node:test';
import assert from 'node:assert/strict';
import buildStats from '../buildStats.js';

test('deduplicates native IDs, weights XP and groups topics', () => {
  const input = { leetcode: { platform: 'leetcode', totals: { all: 10 }, recentProblems: [
    { platform: 'leetcode', problemId: 'two-sum', title: 'Two Sum', difficulty: 'Easy', tags: ['Array'], timestamp: Date.parse('2026-10-20T12:00:00Z') },
    { platform: 'leetcode', problemId: 'two-sum', title: 'Two Sum', difficulty: 'Easy', tags: ['Array'], timestamp: Date.parse('2026-10-20T13:00:00Z') },
    { platform: 'leetcode', problemId: 'hard-one', difficulty: 'Hard', tags: ['Graph'], timestamp: Date.parse('2026-10-21T12:00:00Z') },
  ] } };
  const result = buildStats(input, new Date('2026-10-21T14:00:00Z'));
  assert.equal(result.individuallyImported, 2);
  assert.equal(result.xp, 7);
  assert.equal(result.difficulty.Easy, 1);
  assert.equal(result.difficulty.Hard, 1);
  assert.equal(result.currentStreak, 2);
  assert.equal(result.longestStreak, 2);
  assert.equal(result.topics[0].topic, 'Array');
  assert.equal(input.leetcode.recentProblems.length, 3, 'input is not mutated');
});

test('does not claim cross-platform unique totals or streaks from missing timestamps', () => {
  const result = buildStats({ codeforces: { platform: 'codeforces', stats: { distinctSolvedInFetchedSubmissions: 4 }, recentProblems: [{ problemId: '1-A', title: 'A' }] } }, new Date('2026-10-21T00:00:00Z'));
  assert.equal(result.platformReportedTotal, 4);
  assert.equal(result.uniqueAcrossPlatforms, null);
  assert.equal(result.activeDays, 0);
  assert.equal(result.currentStreak, 0);
});
