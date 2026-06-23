# PlayTracker on Railway

Deploy the Flask API and web app to Railway with a persistent SQLite volume.

## 1. Create the Railway project

1. Go to [railway.app](https://railway.app) and create a new project.
2. Choose **Deploy from GitHub repo** and select this `stats` repository.
3. Railway will detect Python and use `railway.toml` / `Procfile`.

## 2. Add a persistent volume

SQLite needs disk that survives redeploys.

1. In your Railway service, open **Volumes**.
2. Create a volume and mount it at `/data`.
3. Set this environment variable on the service:

```
DATABASE_PATH=/data/stats.db
```

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
