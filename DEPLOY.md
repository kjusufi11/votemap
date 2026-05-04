# VoteMatch — Deployment Guide
## GitHub → Railway, from zero

---

## Step 1 — Create a GitHub account (if you don't have one)

Go to https://github.com and sign up. Free.

---

## Step 2 — Create a new GitHub repository

1. Click the **+** in the top-right corner → **New repository**
2. Name it `votemap`
3. Set it to **Private** (your API keys will never be in it, but still safer)
4. Leave everything else unchecked — no README, no .gitignore
5. Click **Create repository**
6. GitHub will show you a page with setup commands — keep this tab open

---

## Step 3 — Push the code from your computer

Open a terminal in the `votemap` folder and run these commands one at a time:

```bash
git init
git add .
git commit -m "Initial commit — VoteMatch"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/votemap.git
git push -u origin main
```

Replace `YOUR_USERNAME` with your actual GitHub username.

After this, refresh your GitHub tab — you should see all the files there.

---

## Step 4 — Get your API keys

You need four keys. All are free (or near-free):

### Congress.gov API (free)
1. Go to https://api.data.gov/signup/
2. Fill in the form — they email you a key within minutes
3. Save it — looks like: `abc123def456...`

### FEC API (free — same key registration as above)
1. Use the same api.data.gov key from the step above
2. Both `CONGRESS_API_KEY` and `FEC_API_KEY` can use the same key value

### Google Civic Information API (free)
1. Go to https://console.cloud.google.com
2. Create a new project (call it `votemap`)
3. Go to **APIs & Services → Library**
4. Search for "Civic Information API" → Enable it
5. Go to **APIs & Services → Credentials → Create Credentials → API Key**
6. Copy the key — looks like: `AIzaSy...`

### Anthropic API (pay-per-use, ~$0.01 per analysis)
1. Go to https://console.anthropic.com
2. Sign up, go to **API Keys → Create Key**
3. Copy it — looks like: `sk-ant-...`
4. Add ~$10 in credits to start (will last hundreds of analyses)

---

## Step 5 — Create a Railway account

1. Go to https://railway.app
2. Click **Login with GitHub** — use the same GitHub account
3. Authorize Railway

---

## Step 6 — Create a new Railway project

1. Click **New Project**
2. Click **Deploy from GitHub repo**
3. Select your `votemap` repository
4. Railway will detect the repo — click **Add service** when prompted

---

## Step 7 — Set up the Backend service

1. In your Railway project, click **New Service → GitHub Repo → votemap**
2. Click the service → **Settings** tab
3. Set **Root Directory** to `/backend`
4. Railway will auto-detect it as a Node app

Now add environment variables — click the **Variables** tab and add each one:

```
DATABASE_URL         → (Railway fills this automatically — see Step 9)
CONGRESS_API_KEY     → your api.data.gov key
FEC_API_KEY          → your api.data.gov key (same value as above)
GOOGLE_CIVIC_API_KEY → your Google key
ANTHROPIC_API_KEY    → your Anthropic key
FRONTEND_URL         → https://votematch.app
NODE_ENV             → production
PORT                 → 3001
MOCK_MODE            → false
CACHE_TTL_VOTES      → 3600
CACHE_TTL_MEMBERS    → 86400
```

---

## Step 8 — Set up the Frontend service

1. In your Railway project, click **New Service → GitHub Repo → votemap** again
2. Click the service → **Settings** tab
3. Set **Root Directory** to `/frontend`

Add environment variables:

```
VITE_API_URL → https://YOUR-BACKEND-URL.up.railway.app/api
```

(You'll get the backend URL after Step 9 — come back and fill this in)

---

## Step 9 — Add a PostgreSQL database

1. In your Railway project, click **New Service → Database → PostgreSQL**
2. Railway creates a Postgres instance automatically
3. Click the database service → **Variables** tab
4. Copy the `DATABASE_URL` value
5. Go back to your **Backend** service → **Variables**
6. Paste it as the value for `DATABASE_URL`

---

## Step 10 — Run the database migration

Your database needs its tables created once. Do this in Railway:

1. Click your **Backend** service
2. Go to **Settings → Deploy → Start Command**
3. Temporarily change it to: `npm run db:migrate && npm start`
4. Redeploy (Railway does this automatically when you save)
5. Wait for it to deploy — check **Logs** to confirm you see "All migrations complete"
6. Change the start command back to just: `npm start`
7. Redeploy again

---

## Step 11 — Set up the nightly cron job

1. In your Railway project, click **New Service → Empty Service**
2. Name it `votematch-cron`
3. Connect it to your `votemap` GitHub repo
4. Set **Root Directory** to `/backend`
5. Under **Settings → Deploy**:
   - Start Command: `node src/cron.js`
   - Cron Schedule: `0 2 * * *`
6. Add the same environment variables as the backend service

---

## Step 12 — Get your live URLs

1. Click your **Backend** service → **Settings → Networking → Generate Domain**
   - Copy this URL (e.g. `votematch-api.up.railway.app`)
2. Click your **Frontend** service → **Settings → Networking → Generate Domain**
   - This is your live app URL

3. Go back to the **Frontend** service → **Variables**
4. Set `VITE_API_URL` to `https://api.votematch.app/api`
5. Redeploy the frontend

---

## Step 13 — You're live

Visit your frontend Railway URL. Try a ZIP code. It should work.

---

## Ongoing workflow (how to ship changes)

Every time you want to update the app:

```bash
git add .
git commit -m "describe what you changed"
git push
```

Railway detects the push and automatically redeploys both services. Usually takes 2-3 minutes.

---

## Costs

| Service | Cost |
|---------|------|
| Backend (Railway) | ~$5/month |
| Frontend (Railway) | ~$5/month |
| PostgreSQL (Railway) | ~$5/month |
| Cron job | ~$0 (minimal CPU) |
| Congress.gov API | Free |
| FEC API | Free |
| Google Civic API | Free |
| Anthropic API | ~$0.01 per analysis |
| **Total** | **~$15/month + usage** |

---

## If something goes wrong

- **Check Railway logs**: click any service → **Logs** tab
- **Backend health check**: visit `https://your-backend-url/health` — should return `{"status":"ok"}`
- **CORS errors in browser**: make sure `VITE_API_URL` in frontend matches your backend URL exactly
- **Database errors**: make sure `DATABASE_URL` is set and migration ran successfully
