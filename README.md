# 🗺️ RoadSense AI — Crowdsourced Road Intelligence Platform

[![License: MIT](https://img.shields.io/badge/License-MIT-purple.svg)](https://opensource.org/licenses/MIT)
[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688?style=flat&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React Native](https://img.shields.io/badge/Mobile-React_Native_/_Expo-61DAFB?style=flat&logo=react&logoColor=black)](https://reactnative.dev)
[![Next.js 14](https://img.shields.io/badge/Dashboard-Next.js_14-000000?style=flat&logo=nextdotjs&logoColor=white)](https://nextjs.org)
[![PostgreSQL 16](https://img.shields.io/badge/Database-PostgreSQL_/_PostGIS-336791?style=flat&logo=postgresql&logoColor=white)](https://www.postgresql.org)
[![Docker](https://img.shields.io/badge/Orchestration-Docker_Compose-2496ED?style=flat&logo=docker&logoColor=white)](https://www.docker.com)

> **Scientific Foundation:** Built upon the research paper: *"Crowdsourcing from the True Crowd: Device, Vehicle, Road-Surface and Driving Independent Road Profiling from Smartphone Sensors"* — Alam et al., *Pervasive and Mobile Computing (2020)*.

RoadSense AI is a cutting-edge, smartphone-powered crowdsourced road intelligence system. It runs passively in the background of everyday commutes to detect, classify, and geo-locate **potholes**, **speed-breakers**, and **broken road patches** in real time—completely independent of vehicle class (2-wheeler, 3-wheeler, 4-wheeler), device model, placement (pocket, dashboard, handlebar), or individual driving styles. 

It generates a living, geo-tagged road quality map designed for commuters, logistics fleet managers, and civic/municipal engineers to prioritize road repairs and navigate safely.

---

## 📖 Table of Contents
1. [Core Capabilities](#-core-capabilities)
2. [System Architecture](#%EF%B8%8F-system-architecture)
3. [Algorithmic & ML Core](#-algorithmic--ml-core)
4. [Repository Structure](#-repository-structure)
5. [Getting Started & Installation](#-getting-started--ml-core)
   - [Backend Setup (FastAPI + Celery + PostGIS + Redis + MinIO)](#1-backend--data-layer-setup)
   - [Web Dashboard Setup (Next.js 14)](#2-web-dashboard-setup-nextjs-14)
   - [Mobile Client Setup (React Native + Expo)](#3-mobile-client-setup-react-native-expo)
6. [API Cheat Sheet](#-api-cheat-sheet)
7. [Developer Guidelines & Guidelines](#-developer-guidelines--conventions)
8. [Documentation Index](#-documentation-index)

---

## ✨ Core Capabilities

*   **📱 Passive Background Sensing:** Runs silently during commutes utilizing `expo-task-manager` and `expo-background-fetch` without requiring active screen time or manual tagging. Extremely battery efficient (<5% drain/hour).
*   **📐 Auto-Orientation Engine:** Normalizes three-axis accelerometer and gyroscope coordinates into a standard vehicle reference frame using real-time Euler angle translations.
*   **⚡ Speed-Adaptive Dynamic Thresholds:** Evaluates road surface irregularities against thresholds that automatically adapt to vehicle speed, eliminating static threshold calibration errors.
*   **🤖 Server-Side ML Classification (J48 Decision Tree):** Evaluates candidate anomalies through a trained machine learning model utilizing context features (`Zt`, `Z_prev`, `Z_next`, speed, and time delta) to filter false positives and catalog event types.
*   **📍 Robust k-Medoids Clustering:** Geo-localizes events by clustering nearby detections across multiple distinct trips. Discards isolated anomalies and locks true coordinates once a consensus threshold ($\lceil N_T / 3 \rceil + 1$) is achieved.
*   **🔊 Real-Time Driver Alerts:** Generates instant haptic pulses and Text-To-Speech (TTS) audio alerts (e.g., *"Pothole ahead in 80 meters"*) to warn active drivers before they hit hazards.
*   **📊 Civic Authority Dashboard:** Standardizes road damage data into a cohesive Web Interface with **Road Quality Index (RQI)** scoring, heatmaps, interactive repair prioritization, and downloadable reports.

---

## 🏗️ System Architecture

RoadSense AI is structured as a premium microservice architecture. Mobile applications gather high-frequency sensor readings, API servers process lightweight requests, and asynchronous worker queues handle machine learning calculations.

```mermaid
graph TD
    classDef client fill:#7c3aed,stroke:#fff,stroke-width:2px,color:#fff;
    classDef gateway fill:#009688,stroke:#fff,stroke-width:2px,color:#fff;
    classDef worker fill:#f97316,stroke:#fff,stroke-width:2px,color:#fff;
    classDef database fill:#336791,stroke:#fff,stroke-width:2px,color:#fff;

    %% Client Layer
    subgraph Client Layer [Clients]
        RN[React Native Mobile App<br/>Android / Expo]:::client
        WEB[Next.js 14 Web Portal<br/>Civic Dashboard & Public Map]:::client
    end

    %% Gateway
    API[FastAPI Gateway<br/>REST Endpoints]:::gateway

    %% Workers
    subgraph Background Workers [Asynchronous Tasks]
        CEL[Celery Worker Pipeline]:::worker
        RED_Q[Redis Task Broker]:::worker
    end

    %% Storage & Database
    subgraph Data Layer [Databases & Storage]
        DB[(PostgreSQL 16<br/>PostGIS GeoDB)]:::database
        RED_C[(Redis Cache<br/>& Session State)]:::database
        MINIO[(MinIO Object Store<br/>Raw 150Hz Sensor Logs)]:::database
    end

    %% Connections
    RN -- "REST API (Auth, Trips, PoCs)" --> API
    WEB -- "REST API (RQI, Priorities, Map)" --> API
    
    API -- "1. Mark Complete / Save Meta" --> DB
    API -- "2. Stream raw sensor logs" --> MINIO
    API -- "3. Enqueue trip analysis" --> RED_Q
    
    RED_Q --> CEL
    CEL -- "a. Fetch PoCs & Meta" --> DB
    CEL -- "b. Fetch Raw Logs (Optional)" --> MINIO
    CEL -- "c. Run Euler-Orientation & DT ML" --> CEL
    CEL -- "d. Run k-Medoids Clustering" --> CEL
    CEL -- "e. Upsert Road & Confirmed Events" --> DB
    
    API -- "Query Events / Auth Cached" --> RED_C
```

---

## 🧮 Algorithmic & ML Core

The project implements the exact algorithms laid out in the **RoadSurP** scientific paper.

### 1. Auto-Orientation Formula
To translate raw accelerometer data ($a_x$, $a_y$, $a_z$) from the device's variable reference frame to the vehicle's frame ($a_{x\_v}$, $a_{y\_v}$, $a_{z\_v}$), Euler pitch ($\theta$) and roll ($\beta$) angles are calculated continuously:

$$\theta = \arctan2(a_y, a_z)$$

$$\beta = \arctan2(-a_x, \sqrt{a_y^2 + a_z^2})$$

Using these, the vertical component (the $Z$-axis of the vehicle frame, representing road surface displacement) is isolated:

$$a_{z\_v} = -a_x \sin(\beta) + a_y \cos(\beta) \sin(\theta) + a_z \cos(\beta) \cos(\theta)$$

### 2. Speed-Adaptive Thresholds
Static acceleration thresholds are inaccurate because high speed intensifies impact forces. RoadSense updates the vertical acceleration event threshold ($T_t$) dynamically based on average vehicle speed ($V$):

$$T_t = T_0 + (V - L) \times S \quad \text{if } V > B$$

$$T_t = T_0 \quad \text{otherwise}$$

*   **$T_0$**: Base acceleration threshold depending on vehicle class (e.g., $1.08g$ for speed-breakers in 4-wheelers; $0.714g$ for potholes in 2-wheelers).
*   **$B$**: Base speed point ($20.0 \text{ km/h}$).
*   **$L$**: Lower adaptation limit ($20.0 \text{ km/h}$).
*   **$S$**: Scaling factor ($0.3$ for speed-breakers; $-0.3$ for potholes, which require lower thresholds at higher speeds as gravity limits vertical falling speed).

### 3. ML Feature Extraction
Once a Point of Candidate (PoC) passes the dynamic threshold, a $5$-dimensional feature vector is sent to the **J48 Decision Tree Classifier**:

$$\vec{x} = \begin{bmatrix} Z_t & Z_{\text{next}} & Z_{\text{prev}} & T_p & S_p \end{bmatrix}$$

*   **$Z_t$**: Maximum acceleration amplitude at the detection timestamp.
*   **$Z_{\text{next}}$ / $Z_{\text{prev}}$**: Local peak amplitudes in the vertical direction within a time window $\Delta$ immediately after/before the event.
*   **$T_p$**: Time elapsed since the immediate prior event (highly dense spikes point to *broken road patches*).
*   **$S_p$**: Exact GPS-recorded vehicle speed at detection time.

---

## 📁 Repository Structure

```
roadsense/
├── mobile/                     # React Native Client (Expo SDK 51+)
│   ├── app/                    # Expo Router Screens (Home Map, Trip Logging, History)
│   │   ├── (tabs)/             # Main bottom tab views (home, trip, history)
│   │   ├── onboarding/         # Onboarding vehicle & placement wizard
│   │   └── auth/               # OTP-based authentication views
│   ├── components/             # Reusable UI & Core Logic Components
│   │   ├── SensorEngine.tsx    # 150Hz accelerometer/gyro sampling loop
│   │   ├── AutoOrient.ts       # Euler angle rotation algorithm
│   │   ├── AlertSystem.tsx     # Audio-haptic proximity warnings
│   │   └── ui/                 # Custom Glassmorphic visual components
│   ├── constants/              # Styling theme and typography
│   └── package.json            
│
├── backend/                    # FastAPI Server & Python ML Pipeline
│   ├── app/
│   │   ├── main.py             # ASGI application entrypoint
│   │   ├── api/                # API Endpoints (Auth, Trips, Events, Civic)
│   │   ├── models/             # SQLAlchemy async relational models
│   │   ├── schemas/            # Pydantic v2 schemas
│   │   ├── services/           # Business logic (Euler orientation, k-Medoids)
│   │   └── tasks/              # Celery worker async pipelines (trip analysis)
│   ├── ml/                     # Training suite & scikit-learn notebooks
│   ├── alembic/                # PostGIS database migrations
│   └── Dockerfile              
│
├── web/                        # Next.js 14 Civic Portal
│   ├── app/                    # Next.js App Router (Dashboard, Public Heatmaps)
│   ├── components/             # Recharts visualizations & interactive map canvases
│   └── package.json
│
├── Docs/                       # Engineering Specifications & Guidelines
│   ├── PRD.md                  # Product Requirements Document
│   ├── TRD.md                  # Technical Requirements Document
│   ├── UIUX.md                 # UI/UX Specifications & Styling Tokens
│   └── AI_INSTRUCTIONS.md      # Context & Rules for Coding Assistants
│
├── docker-compose.yml          # Local orchestration for services & data engines
└── README.md                   # Main Project Entrypoint Document
```

---

## 🚀 Getting Started & Installation

### Prerequisites
Make sure you have the following installed:
*   [Docker & Docker Compose](https://www.docker.com/products/docker-desktop)
*   [Node.js v18+](https://nodejs.org)
*   [Python 3.11+](https://www.python.org/downloads/)
*   [Expo Go app](https://expo.dev/expo-go) on your physical Android test device

---

### 1. Backend & Data Layer Setup

#### Environment Variables
Create a `.env` file in the `backend/` directory:
```bash
# backend/.env
DATABASE_URL=postgresql+asyncpg://roadsense:roadsense123@localhost:5432/roadsense
REDIS_URL=redis://localhost:6379/0
MINIO_ENDPOINT=localhost:9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET=roadsense-sensor-data
JWT_SECRET_KEY=generate-a-strong-256-bit-key-here
JWT_ALGORITHM=HS256
JWT_EXPIRE_HOURS=24
CELERY_BROKER_URL=redis://localhost:6379/0
CELERY_RESULT_BACKEND=redis://localhost:6379/1
ML_MODEL_PATH=ml/models/decision_tree_v1.pkl
PORT=8000
```

#### Run Services using Docker Compose
Orchestrate the entire platform database, queuing infrastructure, and storage buckets using the root config:
```bash
# Spin up PostgreSQL/PostGIS, Redis, MinIO, and roadsense-backend
docker compose up --build -d
```

#### Run Backend Locally (Alternative)
If you prefer running the Python server and worker tasks locally:
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows use: venv\Scripts\activate
pip install -r requirements.txt

# Run migrations
alembic upgrade head

# Start FastAPI server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# In a separate terminal, launch the Celery task queue:
celery -A app.tasks.pipeline.celery_app worker --loglevel=info
```

---

### 2. Web Dashboard Setup (Next.js 14)

#### Environment Variables
Create a `.env.local` file in the `web/` directory:
```bash
# web/.env.local
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
NEXT_PUBLIC_MAPBOX_TOKEN=your-mapbox-public-token-here
NEXTAUTH_SECRET=generate-a-random-uuid-secret
```

#### Install and Run
```bash
cd web
npm install
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to view the public heatmaps and municipal admin interface.

---

### 3. Mobile Client Setup (React Native Expo)

#### Environment Variables
Create a `.env` file in the `mobile/` directory. For physical device testing, use your machine's **local Wi-Fi IP address** instead of `localhost`:
```bash
# mobile/.env
EXPO_PUBLIC_API_URL=http://<YOUR_LOCAL_NETWORK_IP>:8000/api/v1
```

#### Install and Run
```bash
cd mobile
npm install
npx expo start
```
*   Scan the QR code printed in the terminal using the **Expo Go** application on your Android phone.
*   *Note: Ensure your phone and development computer are connected to the exact same Wi-Fi network.*

---

## ⚡ API Cheat Sheet

All requests should be prefixed with `/api/v1`. Bearer JWT tokens are required for authenticated routes.

| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| **POST** | `/auth/register` | Register commuter/civic accounts via phone | No |
| **POST** | `/auth/login` | Validate verification OTP and return tokens | No |
| **POST** | `/trips/start` | Start recording a trip and assign a trip ID | Yes |
| **POST** | `/trips/{id}/end` | Complete trip; triggers ingestion pipeline | Yes |
| **POST** | `/trips/{id}/poc` | Upload batches of detected PoC candidates | Yes |
| **GET** | `/events` | Get confirmed events with bounding box query | Yes |
| **GET** | `/events/heatmap` | Retrieve density coordinates for heatmap overlay | No |
| **GET** | `/civic/summary` | Retrieve key summary stats for municipal zones | Yes (Civic/Admin) |
| **GET** | `/civic/priority-list` | Retrieve road list ranked by repair priority score | Yes (Civic/Admin) |
| **POST** | `/civic/events/{id}/resolve`| Mark road hazard as repaired | Yes (Civic/Admin) |

---

## 🛠️ Developer Guidelines & Conventions

If you are contributing or modifying code, please stick to the strict rules outlined in our [AI Instructions](file:///Users/soumyachakraborty/Documents/D/RE%20Project/Docs/AI_INSTRUCTIONS.md):

*   **📐 Orientation Priority:** Never analyze accelerometer signals without executing `auto_orient()` first. Raw signals are heavily skewed by how the mobile device is positioned.
*   **🔋 Battery Conservation:** Avoid running complex machine learning calculations on the phone. Gather filtered PoCs at high frequencies on-device, and defer complex Decision Tree classifications and spatial clustering to the Celery-backed backend server.
*   **🚀 Spatial Performance:** When executing range queries (e.g., retrieving nearby hazards), use PostGIS's spatial indexing methods (`ST_DWithin` and bounding boxes via `bbox`), rather than computing flat geometric distance queries.
*   **📁 Storage Rules:** Never store raw 150Hz accelerometer sensor logs inside PostgreSQL. Save them as compressed objects in MinIO, and store only the metadata in Postgres.
*   **💡 Dynamic Adaptive Logic:** Do not deploy hardcoded threshold values. All event alerts and recordings must calculate dynamic thresholds using vehicle speed variables.

---

## 🗂️ Documentation Index

To dive deeper into specific layers of RoadSense AI, explore our dedicated document collection:
*   [Product Requirements Document (PRD)](file:///Users/soumyachakraborty/Documents/D/RE%20Project/Docs/PRD.md) - Deep dive into target users, success metrics, product vision, and functional scopes.
*   [Technical Requirements Document (TRD)](file:///Users/soumyachakraborty/Documents/D/RE%20Project/Docs/TRD.md) - Complete system specifications, PostGIS SQL schemas, REST API specs, and Celery pipelines.
*   [UI/UX Design Specifications](file:///Users/soumyachakraborty/Documents/D/RE%20Project/Docs/UIUX.md) - Design patterns, typography rules, color schemes, wireframe representations, and accessibility standards.
*   [AI Development Manual](file:///Users/soumyachakraborty/Documents/D/RE%20Project/Docs/AI_INSTRUCTIONS.md) - Code style rules, common development pitfalls, test checklists, and execution guides.

---
*Created by **Soumya Chakraborty** (`soumyachk101`) & **Antigravity**.*
