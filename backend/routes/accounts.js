import { Router } from "express";
import pool from "../db.js";

const router = Router();

const ALLOWED_PLATFORMS = [
  "leetcode",
  "codeforces",
  "codechef",
  "atcoder",
  "hackerrank",
  "gfg",
];

// GET all accounts belonging to a user
router.get("/:userId", async (req, res) => {
  const userId = Number(req.params.userId);

  if (!Number.isInteger(userId)) {
    return res.status(400).json({
      error: "Invalid user id",
    });
  }

  try {
    const result = await pool.query(
      `
      SELECT id, platform, handle
      FROM platform_accounts
      WHERE user_id = $1
      ORDER BY platform
      `,
      [userId]
    );

    res.json({
      userId,
      accounts: result.rows,
    });
  } catch (error) {
    console.error("Error fetching accounts:", error);

    res.status(500).json({
      error: "Failed to fetch connected accounts",
    });
  }
});

// POST a new account / update existing account
router.post("/:userId", async (req, res) => {
  const userId = Number(req.params.userId);
  const { platform, handle } = req.body;

  if (!Number.isInteger(userId)) {
    return res.status(400).json({
      error: "Invalid user id",
    });
  }

  if (!ALLOWED_PLATFORMS.includes(platform)) {
    return res.status(400).json({
      error: "Unsupported platform",
    });
  }

  if (!handle || !handle.trim()) {
    return res.status(400).json({
      error: "Handle is required",
    });
  }

  try {
    // Check that the user exists
    const userResult = await pool.query(
      `SELECT id FROM users WHERE id = $1`,
      [userId]
    );

    if (userResult.rowCount === 0) {
      return res.status(404).json({
        error: "User not found",
      });
    }

    // Insert account or update existing account
    const result = await pool.query(
      `
      INSERT INTO platform_accounts
        (user_id, platform, handle)
      VALUES
        ($1, $2, $3)
      ON CONFLICT (user_id, platform)
      DO UPDATE SET handle = EXCLUDED.handle
      RETURNING id, platform, handle
      `,
      [userId, platform, handle.trim()]
    );

    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error("Error saving account:", error);

    res.status(500).json({
      error: "Failed to save platform account",
    });
  }
});

export default router;