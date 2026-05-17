-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "postgis";

-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "phone" VARCHAR(20) NOT NULL,
    "name" VARCHAR(100),
    "role" VARCHAR(20) NOT NULL DEFAULT 'user',
    "vehicle_type" VARCHAR(30),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trips" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "user_id" UUID NOT NULL,
    "vehicle_type" VARCHAR(30),
    "phone_placement" VARCHAR(30),
    "status" VARCHAR(20) NOT NULL DEFAULT 'pending',
    "raw_data_path" TEXT,
    "started_at" TIMESTAMP(3),
    "ended_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "trips_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "poc_candidates" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "trip_id" UUID NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "z_value" DOUBLE PRECISION NOT NULL,
    "z_next" DOUBLE PRECISION,
    "z_prev" DOUBLE PRECISION,
    "tp" DOUBLE PRECISION,
    "speed_kmh" DOUBLE PRECISION,
    "threshold_used" DOUBLE PRECISION,
    "recorded_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "poc_candidates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "road_events" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "trip_id" UUID NOT NULL,
    "poc_candidate_id" UUID,
    "event_type" VARCHAR(30) NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "severity" VARCHAR(20),
    "confidence_score" DOUBLE PRECISION,
    "is_confirmed" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "road_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "confirmed_events" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "event_type" VARCHAR(30) NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "trail_count" INTEGER NOT NULL DEFAULT 1,
    "confidence_score" DOUBLE PRECISION,
    "first_seen" TIMESTAMP(3),
    "last_seen" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "resolved_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "confirmed_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_cluster_members" (
    "confirmed_event_id" UUID NOT NULL,
    "road_event_id" UUID NOT NULL,

    CONSTRAINT "event_cluster_members_pkey" PRIMARY KEY ("confirmed_event_id","road_event_id")
);

-- CreateTable
CREATE TABLE "sensor_sessions" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "trip_id" UUID NOT NULL,
    "file_path" TEXT,
    "file_size_bytes" BIGINT,
    "sample_count" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sensor_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "road_quality_index" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "lat1" DOUBLE PRECISION NOT NULL,
    "lng1" DOUBLE PRECISION NOT NULL,
    "lat2" DOUBLE PRECISION NOT NULL,
    "lng2" DOUBLE PRECISION NOT NULL,
    "rqi_score" DOUBLE PRECISION NOT NULL,
    "segment_length_m" DOUBLE PRECISION,
    "computed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "road_quality_index_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_phone_key" ON "users"("phone");

-- CreateIndex
CREATE INDEX "users_phone_idx" ON "users"("phone");

-- CreateIndex
CREATE INDEX "trips_user_id_idx" ON "trips"("user_id");

-- CreateIndex
CREATE INDEX "trips_status_idx" ON "trips"("status");

-- CreateIndex
CREATE INDEX "poc_candidates_trip_id_idx" ON "poc_candidates"("trip_id");

-- CreateIndex
CREATE INDEX "road_events_trip_id_idx" ON "road_events"("trip_id");

-- CreateIndex
CREATE INDEX "road_events_event_type_idx" ON "road_events"("event_type");

-- CreateIndex
CREATE INDEX "confirmed_events_event_type_idx" ON "confirmed_events"("event_type");

-- CreateIndex
CREATE INDEX "confirmed_events_is_active_idx" ON "confirmed_events"("is_active");

-- CreateIndex
CREATE INDEX "sensor_sessions_trip_id_idx" ON "sensor_sessions"("trip_id");

-- AddForeignKey
ALTER TABLE "trips" ADD CONSTRAINT "trips_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "poc_candidates" ADD CONSTRAINT "poc_candidates_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "trips"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "road_events" ADD CONSTRAINT "road_events_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "trips"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "road_events" ADD CONSTRAINT "road_events_poc_candidate_id_fkey" FOREIGN KEY ("poc_candidate_id") REFERENCES "poc_candidates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_cluster_members" ADD CONSTRAINT "event_cluster_members_confirmed_event_id_fkey" FOREIGN KEY ("confirmed_event_id") REFERENCES "confirmed_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_cluster_members" ADD CONSTRAINT "event_cluster_members_road_event_id_fkey" FOREIGN KEY ("road_event_id") REFERENCES "road_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sensor_sessions" ADD CONSTRAINT "sensor_sessions_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "trips"("id") ON DELETE CASCADE ON UPDATE CASCADE;
