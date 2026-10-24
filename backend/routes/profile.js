import { Router } from "express";
import pool from "../db.js";

const router = Router();

// Get a user's universal profile and all connected platform accounts
router.get("/:userId", async (req, res) => {
  const userId = Number(req.params.userId);

  if (!Number.isInteger(userId)) {
    return res.status(400).json({
      error: "Invalid user id",
    });
  }

  try {
    const userResult = await pool.query(
      `
      SELECT id, display_name, created_at
      FROM users
      WHERE id = $1
      `,
      [userId]
    );

    if (userResult.rowCount === 0) {
      return res.status(404).json({
        error: "User not found",
      });
    }

    const accountsResult = await pool.query(
      `
      SELECT id, platform, handle
      FROM platform_accounts
      WHERE user_id = $1
      ORDER BY platform
      `,
      [userId]
    );

    res.json({
      user: userResult.rows[0],
      accounts: accountsResult.rows,
    });
  } catch (error) {
    console.error("Error fetching profile:", error);

    res.status(500).json({
      error: "Failed to fetch profile",
    });
  }
});

export default router;