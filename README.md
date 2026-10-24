# DevTrack

**Track your coding practice across platforms.** DevTrack is a dark-first DSA dashboard that brings LeetCode and Codeforces practice data into one place, with platform profiles, problem statistics, activity tracking, and a lightweight XP system.

## Features

- **Unified DSA dashboard** with linked platform handles, manual sync, platform status, and separate contest-rating displays.
- **LeetCode integration** using its public GraphQL interface for platform-reported totals and a recent accepted-submission window. Optional problem metadata enrichment may provide topics and difficulty when available.
- **Codeforces integration** using the public API for profile/rating information and accepted problems found in the latest 10,000 submissions.
- **Practice analytics** for imported problems, activity days, streaks, topics, languages, difficulty, and XP, calculated by the backend aggregation module.
- **Transparent data availability** for CodeChef, AtCoder, and GeeksforGeeks. These platforms can be linked, but public profile/history adapters are not enabled until a reliable source is verified.
- **XP system:** Easy = 1 XP, Medium = 3 XP, Hard = 6 XP; every 100 XP advances one level. XP is a practice indicator, not a standardized skill rating, and only includes imported records with known difficulty.

## Tech stack

- **Frontend:** React, Vite, Tailwind CSS, Recharts
- **Backend:** Node.js, Express
- **Database:** PostgreSQL (local or Neon)
- **Testing:** Node.js built-in test runner

## Data notes and limitations

- LeetCode totals are platform-reported. The public submission feed available to this project exposes only a recent accepted-submission window; it is not a complete lifetime activity history. Topic/difficulty metadata can be absent if the public GraphQL endpoint changes or rate-limits requests.
- The activity heatmap and streak calculations are based on imported accepted-problem records with valid timestamps. Until a complete daily submission calendar is integrated, these values may differ from LeetCode's own heatmap and streak. Missing history is not fabricated.
- Codeforces rating is shown separately from LeetCode and is not merged into a single rating. Its accepted-problem count is based on accepted submissions found in the latest 10,000 submission records and is not guaranteed to be a lifetime total.
- `platformReportedTotal` combines available platform-reported/fetched totals; it is not a unique cross-platform count. `uniqueAcrossPlatforms` is intentionally `null` because equivalent problems cannot be inferred reliably from native IDs. Imported problem counts deduplicate the same native problem ID only within the same platform.
- The demo frontend currently uses `USER_ID = 2`. Connect this to authenticated user identity before deploying DevTrack as a multi-user production application.

## Getting started

### 1. Configure the database

Create a PostgreSQL database (or configure a Neon connection), then apply `database/schema.sql` if the schema has not already been created.

For a local PostgreSQL database named `dsa_dashboard`, the backend environment file can contain:

```env
PORT=4000
DATABASE_URL=postgresql://localhost:5432/dsa_dashboard
```

Create `backend/.env` from the example file if needed. Keep `.env` private and do not commit it.

### 2. Start the backend

```bash
cd backend
npm install
npm run dev
```

The API listens on `http://localhost:4000` by default. `GET /health` provides a simple health check.

### 3. Start the frontend

In a separate terminal:

```bash
cd frontend
npm install
npm run dev
```

Vite serves the dashboard at `http://localhost:5173` and proxies `/api` requests to the backend on port 4000.

### 4. Run backend tests

```bash
cd backend
npm test
```

## API routes

- `GET /api/profile/:userId`
- `GET /api/accounts/:userId`
- `POST /api/accounts/:userId`
- `GET /api/leetcode/:username`
- `GET /api/codeforces/:handle`

## Security

- Only public platform usernames/handles are needed; never request platform passwords or session cookies.
- Keep `backend/.env` out of version control. Environment files are excluded by `.gitignore`.
- Review authentication, authorization, validation, and deployment configuration before making the app publicly accessible.
