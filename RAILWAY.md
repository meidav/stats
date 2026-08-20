# PlayTracker on Railway

Deploy the Flask API and web app to Railway with a persistent SQLite volume.

## 1. Create the Railway project

1. Go to [railway.app](https://railway.app) and create a new project.
2. Choose **Deploy from GitHub repo** and select this `stats` repository.
3. Railway will detect Python and use `railway.toml` / `Procfile`.

## 2. Add a persistent volume

SQLite needs disk that survives redeploys. Volumes are **not** in Settings - create them from the project canvas:

1. Go to your Railway **project canvas** (the diagram view with the stats service box).
2. **Right-click** empty space on the canvas, OR press **Cmd+K** (Mac) / **Ctrl+K** (Windows).
3. Choose **Create Volume** (or type "volume" in the command palette).
4. Select the **stats** service to attach it to.
5. Set mount path: `/data`
6. Add this variable on the **Variables** tab:

```
DATABASE_PATH=/data/stats.db
```

Railway also sets `RAILWAY_VOLUME_MOUNT_PATH` automatically at runtime.

**If you skip the volume for now:** leave `DATABASE_PATH` unset. The app will work but data resets on each redeploy.

Player photos are stored in the SQLite database and also cached under `/data/uploads/league-players` when the volume is mounted. Do not keep them only in `static/uploads/`; that folder is replaced on every deploy.

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

### Import legacy doubles VB into a PlayTracker league

Use `scripts/import_legacy_doubles_vb.py` to copy rows from the legacy `games` table into `league_games` for a beach volleyball 2's sport. Games keep their original dates so year filters work (`2023`, `2024`, etc.).

**On Railway** (after creating the target user and league in the app):

```bash
railway ssh
# copy the legacy backup onto the volume, then:
python3 scripts/import_legacy_doubles_vb.py \
  --email arbel@meidav.com \
  --league-slug arbels-beach-vb \
  --source-db /tmp/stats-2025.01.02-v3.db
```

**Locally against a production DB snapshot:**

```bash
DATABASE_PATH=./production-stats.db python3 scripts/import_legacy_doubles_vb.py \
  --email arbel@meidav.com \
  --source-db "./-db files/stats-2025.01.02-v3.db"
```

The script skips rows already imported (matched by `metadata.legacy_id`). Re-running is safe.

Default source backup: `-db files/stats-latest.db` (1589 games, Jul 2023 through Aug 2026).

### Fix duplicate empty leagues + import on a production DB snapshot

If the app shows two empty `Arbel's Beach VB` leagues, download the live DB from Railway first:

```bash
railway volume download /data/stats.db ./production-stats.db
```

Then run locally against that file (legacy games stay in `-db files/stats-latest.db`):

```bash
DATABASE_PATH=./production-stats.db python3 scripts/import_legacy_doubles_vb.py \
  --email arbel@meidav.com \
  --league-slug arbels-beach-vb \
  --source-db "./-db files/stats-latest.db" \
  --dedupe
```

Upload the updated DB back to the Railway volume, then refresh the app.

### One-shot import on Railway (after deploy)

1. Upload `-db files/stats-latest.db` to the volume as `/data/legacy-vb-source.db`
2. Set variable `LEGACY_VB_SOURCE_DB=/data/legacy-vb-source.db`
3. Call as league owner (replace token and slug):

```bash
curl -X POST https://playtracker.org/api/v1/leagues/arbels-beach-vb/import-legacy-vb \
  -H "Authorization: Bearer YOUR_JWT" \
  -H "Content-Type: application/json" \
  -d '{"dedupe": true}'
```

## Troubleshooting

### Healthcheck failure

Set **Healthcheck Path** in Settings -> Deploy:

```
/api/v1/health
```

Also add required **Variables**: `FLASK_ENV=production`, `SECRET_KEY`, `TIME_OFFSET=-8`.

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
