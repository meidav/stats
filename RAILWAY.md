# PlayTracker on Railway

Deploy the Flask API and web app to Railway with a persistent SQLite volume.

## 1. Create the Railway project

1. Go to [railway.app](https://railway.app) and create a new project.
2. Choose **Deploy from GitHub repo** and select this `stats` repository.
3. Railway will detect Python and use `railway.toml` / `Procfile`.

## 2. Add a persistent volume

SQLite needs disk that survives redeploys.

1. In your Railway project canvas, click the **stats** service card.
2. Open the **Settings** tab (top of the right panel).
3. Scroll down to the **Volumes** section (below Networking / Scale).
4. Click **Add Volume** and set mount path: `/data`
5. Set this environment variable on the service (**Variables** tab):

```
DATABASE_PATH=/data/stats.db
```

**If you do not see Volumes:** it may require a paid Hobby plan on Railway. For a first test deploy you can skip the volume (data resets on redeploy). Leave `DATABASE_PATH` unset and the app will use a local `stats.db`.

## 3. Required environment variables

| Variable | Value | Notes |
|----------|-------|-------|
| `FLASK_ENV` | `production` | Uses production config |
| `SECRET_KEY` | (random string) | Generate with `openssl rand -hex 32` |
| `DATABASE_PATH` | `/data/stats.db` | Must match volume mount |
| `TIME_OFFSET` | `-8` | Your timezone offset from UTC |

Optional:

| Variable | Value |
|----------|-------|
| `WEB_CONCURRENCY` | `2` |
| `CORS_ORIGINS` | `https://playtracker.org` |

## 4. Custom domain (playtracker.org)

1. In Railway service **Settings** -> **Networking** -> **Custom Domain**.
2. Add `playtracker.org` and `www.playtracker.org`.
3. At your domain registrar, add the CNAME records Railway provides.
4. Wait for DNS + SSL (usually a few minutes).

## 5. Verify deployment

```bash
curl https://playtracker.org/api/v1/health
```

Expected response:

```json
{
  "status": "ok",
  "app": "PlayTracker",
  "domain": "playtracker.org",
  "version": "v1"
}
```

## 6. Migrate existing KT stats data (optional)

If you have an existing `stats.db` from PythonAnywhere or local dev:

```bash
# Install Railway CLI: npm i -g @railway/cli
railway login
railway link

# Copy local database to the volume
railway ssh
# inside the container:
ls -la /data/
exit

railway volume upload /data/stats.db ./stats.db
```

Or use Railway dashboard file upload if available.

## Troubleshooting

### "No start command detected" (Railpack build failure)

Railway uses Railpack and cannot auto-detect Flask when the entry file is `stats.py`. This repo includes:

- `Dockerfile` (preferred - Railway builds from this)
- `railpack.json` with explicit `startCommand`
- `railway.toml` with `startCommand`

If it still fails, set **Start Command** manually in Railway:

```
bash scripts/railway_start.sh
```

Settings -> Deploy -> Custom Start Command.

## 7. Mobile app

The Expo app in `mobile/` already points production API calls to:

```
https://playtracker.org/api/v1
```

After deploy, test login and league creation from your phone.

## Architecture

```
playtracker.org
    |
    v
Railway (gunicorn + Flask)
    |
    +-- /api/v1/*     PlayTracker mobile API
    +-- /*            Existing KT web stats (optional)
    |
    v
/data/stats.db (Railway volume)
```

## PythonAnywhere

Keep PythonAnywhere running until you confirm Railway works, then point DNS or retire the old deployment.
