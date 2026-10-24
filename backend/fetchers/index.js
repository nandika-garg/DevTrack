import leetcodeRouter from '../routes/leetcode.js';
import codeforcesRouter from '../routes/codeforces.js';

// Common normalized snapshot contract used by the statistics engine.
// Platform-specific HTTP behavior stays in each adapter; unsupported sources are explicit.
export const PLATFORM_CAPABILITIES = Object.freeze({
  leetcode: { name: 'LeetCode', reliablePublicProfile: true, history: 'recent accepted submissions only' },
  codeforces: { name: 'Codeforces', reliablePublicProfile: true, history: 'recent API submission window' },
  codechef: { name: 'CodeChef', reliablePublicProfile: false, history: 'not integrated: no stable public history endpoint verified' },
  atcoder: { name: 'AtCoder', reliablePublicProfile: false, history: 'not integrated: no stable public profile API verified' },
  gfg: { name: 'GeeksforGeeks', reliablePublicProfile: false, history: 'not integrated: no stable public profile API verified' },
});
export { leetcodeRouter, codeforcesRouter };
