# RoadSense AI Backend — Railway Deployment Guide

This guide outlines how to deploy the RoadSense AI Node.js/Prisma backend to **Railway** using the provided `Dockerfile`.

## Prerequisites

1. A [Railway Account](https://railway.app)
2. Git repository containing your codebase
3. Railway CLI installed (optional, but recommended for local-to-cloud deployments)

## Architecture Overview

The backend service relies on three primary components:
- **PostgreSQL**: Relational database for trip metadata, users, and anomaly events.
- **Redis**: For BullMQ queue management and temporary caching.
- **Object Storage (MinIO or S3)**: For uploading raw high-frequency sensor streams (.bin/JSON telemetry files).

---

## Step-by-Step Deployment

### 1. Create a New Project on Railway
1. Go to the [Railway Dashboard](https://railway.app).
2. Click **New Project** -> **Deploy from GitHub repo**.
3. Select your repository and branch containing the project.
4. Set the **Root Directory** to `backend`.

### 2. Add PostgreSQL Database
1. Inside your Railway project space, click **New** -> **Database** -> **Add PostgreSQL**.
2. Railway will provision a PostgreSQL instance and automatically inject the `DATABASE_URL` variable into your project space.

### 3. Add Redis Database
1. Click **New** -> **Database** -> **Add Redis**.
2. Railway will provision a Redis instance.
3. Under the Redis service -> **Connect** tab, copy the **Redis Connection URL** (e.g. `redis://default:password@host:port`).

### 4. Setup Object Storage (MinIO or S3)
Since MinIO requires persistent volume storage, it's recommended to:
- Use **AWS S3** or **Cloudflare R2** for production, OR
- Add a **MinIO Docker Container** on Railway:
  1. Click **New** -> **Deploy from Image**.
  2. Search and select `minio/minio`.
  3. Under settings, add start command: `server /data --console-address :9001`.
  4. Mount a Railway volume to `/data` for persistence.
  5. Expose ports `9000` (API) and `9001` (Console).

### 5. Configure Environment Variables
In your Railway Node.js service, navigate to **Variables** and define the following environment configs:

| Variable Name | Description | Source / Value |
|---|---|---|
| `PORT` | Container Port | `8080` |
| `DATABASE_URL` | Prisma DB connection string | Reference to PG service (`${{Postgres.DATABASE_URL}}`) |
| `REDIS_URL` | Redis instance URL | Reference to Redis service (`redis://default:${{Redis.REDIS_PASSWORD}}@${{Redis.REDIS_HOST}}:${{Redis.REDIS_PORT}}`) |
| `MINIO_ENDPOINT` | MinIO Host/Endpoint | E.g. `minio-production.up.railway.app` or S3 endpoint |
| `MINIO_PORT` | MinIO Port | `9000` (or `443` for secure S3) |
| `MINIO_ACCESS_KEY` | MinIO Access Key ID | E.g. Admin username or AWS Access Key ID |
| `MINIO_SECRET_KEY` | MinIO Secret Access Key | E.g. Admin password or AWS Secret Access Key |
| `MINIO_BUCKET` | Destination S3 Bucket | E.g. `roadsense-sensor-data` |
| `JWT_SECRET` | Secret key for signing auth tokens | Any strong 256-bit random string |
| `JWT_EXPIRES_IN` | Access token duration | E.g. `24h` |
| `JWT_REFRESH_EXPIRES_IN` | Refresh token duration | E.g. `30d` |
| `OTP_MOCK_MODE` | Mock mode for development testing | `true` (if no real SMS gateway integrated) |

### 6. Deployment & Database Migrations
1. Railway will automatically detect the `Dockerfile` inside `backend/` and trigger the build.
2. The `Dockerfile` handles building the TypeScript code and generating Prisma client models.
3. Once the server container starts, run Prisma migrations to configure the tables. You can define a custom `start` command in `package.json` to execute migrations before starting, or add it to the deploy phase:
   ```json
   "start": "npx prisma migrate deploy && node dist/index.js"
   "build": "tsc"
   ```
4. Check Railway build logs and deploy logs to ensure the Express container starts cleanly on port `8080`.
