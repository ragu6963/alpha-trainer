/*
  Warnings:

  - Changed the type of `goalType` on the `UserGoal` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "GoalType" AS ENUM ('race_completion', 'pace_improvement', 'distance_increase', 'frequency');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "birthYear" INTEGER,
ADD COLUMN     "measuredMaxHR" INTEGER;

-- AlterTable
ALTER TABLE "UserGoal" ADD COLUMN     "targetDistanceKm" DOUBLE PRECISION,
ADD COLUMN     "targetPacePerKm" TEXT,
ADD COLUMN     "weeklyRunCountGoal" INTEGER,
DROP COLUMN "goalType",
ADD COLUMN     "goalType" "GoalType" NOT NULL;
