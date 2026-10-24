import { Router } from "express";

const router = Router();

const API = "https://codeforces.com/api";

async function cfRequest(path) {
  const response = await fetch(`${API}/${path}`);

  if (!response.ok) {
    throw new Error("Codeforces API request failed");
  }

  const data = await response.json();

  if (data.status !== "OK") {
    throw new Error(data.comment || "Codeforces API returned an error");
  }

  return data.result;
}

// GET /api/codeforces/:handle
router.get("/:handle", async (req, res) => {
  const { handle } = req.params;

  try {
    const encodedHandle = encodeURIComponent(handle);

    const [users, submissions, contests] = await Promise.all([
      cfRequest(`user.info?handles=${encodedHandle}`),
      cfRequest(
        `user.status?handle=${encodedHandle}&from=1&count=10000`
      ),
      cfRequest(`user.rating?handle=${encodedHandle}`),
    ]);

    const user = users?.[0];

    if (!user) {
      return res.status(404).json({
        error: "Codeforces user not found",
      });
    }

    // Store distinct accepted problems
    const solved = new Map();

    for (const submission of submissions) {
      if (submission.verdict !== "OK") continue;

      const problem = submission.problem;

      if (!problem) continue;

      const problemId =
        problem.contestId != null
          ? `${problem.contestId}-${problem.index}`
          : problem.name;

      if (!solved.has(problemId)) {
        solved.set(problemId, {
          platform: "codeforces",
          problemId,
          title: problem.name,
          difficulty: null, // Codeforces numeric ratings are not equivalent to Easy/Medium/Hard.
          rating: problem.rating ?? null,
          tags: problem.tags || [],
          language: submission.programmingLanguage || null,
          timestamp:
            Number(submission.creationTimeSeconds) * 1000,
          url:
            problem.contestId != null
              ? `https://codeforces.com/problemset/problem/${problem.contestId}/${problem.index}`
              : null,
        });
      }
    }

    const recentProblems = [...solved.values()]
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 50);

    res.json({
      platform: "codeforces",

      username: user.handle,

      profileUrl:
        `https://codeforces.com/profile/${encodeURIComponent(
          user.handle
        )}`,

      stats: {
        rating: user.rating ?? null,
        maxRating: user.maxRating ?? null,
        rank: user.rank ?? null,
        maxRank: user.maxRank ?? null,
        contestsParticipated: contests.length,
        distinctSolvedInFetchedSubmissions: solved.size,
      },

      recentProblems,
      historyLimit: 10000,
      historyNote: "Solved count covers accepted problems found in the latest 10,000 submissions, not a guaranteed lifetime total.",

      supportedStats: [
        "rating",
        "maxRating",
        "rank",
        "maxRank",
        "contestsParticipated",
        "distinctSolvedInFetchedSubmissions",
      ],
    });
  } catch (error) {
    console.error(error);

    res.status(502).json({
      error:
        error.message ||
        "Could not fetch Codeforces profile",
    });
  }
});

export default router;