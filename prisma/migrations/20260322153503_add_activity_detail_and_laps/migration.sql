-- AlterTable
ALTER TABLE "Activity" ADD COLUMN     "averageCadence" DOUBLE PRECISION,
ADD COLUMN     "calories" DOUBLE PRECISION,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "splitsMetric" JSONB,
ADD COLUMN     "sufferScore" DOUBLE PRECISION;

-- CreateTable
CREATE TABLE "Lap" (
    "id" TEXT NOT NULL,
    "stravaLapId" BIGINT NOT NULL,
    "activityId" TEXT NOT NULL,
    "lapIndex" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "elapsedTime" INTEGER NOT NULL,
    "movingTime" INTEGER NOT NULL,
    "distance" DOUBLE PRECISION NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "averageSpeed" DOUBLE PRECISION NOT NULL,
    "maxSpeed" DOUBLE PRECISION NOT NULL,
    "totalElevationGain" DOUBLE PRECISION NOT NULL,
    "averageCadence" DOUBLE PRECISION,
    "averageHeartrate" DOUBLE PRECISION,
    "maxHeartrate" DOUBLE PRECISION,
    "startIndex" INTEGER NOT NULL,
    "endIndex" INTEGER NOT NULL,
    "paceZone" INTEGER,

    CONSTRAINT "Lap_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Lap_stravaLapId_key" ON "Lap"("stravaLapId");

-- AddForeignKey
ALTER TABLE "Lap" ADD CONSTRAINT "Lap_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "Activity"("id") ON DELETE CASCADE ON UPDATE CASCADE;
