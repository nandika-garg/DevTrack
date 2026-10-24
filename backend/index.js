import express from "express";
import cors from "cors";
import "dotenv/config";

import leetcodeRouter from "./routes/leetcode.js";
import codeforcesRouter from "./routes/codeforces.js";
import accountsRouter from "./routes/accounts.js";
import profileRouter from "./routes/profile.js";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// Platform routes
app.use("/api/leetcode", leetcodeRouter);
app.use("/api/codeforces", codeforcesRouter);

// User account routes
app.use("/api/accounts", accountsRouter);
app.use("/api/profile", profileRouter);

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});
