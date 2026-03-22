import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@/generated/prisma/client'
import { getAthleteRunCount, getActivities, getActivityDetail } from '@/lib/strava'

type SyncEvent =
  | { type: 'start'; total: number }
  | { type: 'progress'; synced: number }
  | { type: 'done'; synced: number }
  | { type: 'error'; error: string }

export async function POST(_request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return new Response(JSON.stringify({ error: 'UNAUTHORIZED' }), {
      status: 401,
    })
  }

  const dbUser = await prisma.user.findUnique({ where: { supabaseId: user.id } })
  if (!dbUser) {
    return new Response(JSON.stringify({ error: 'USER_NOT_FOUND' }), { status: 404 })
  }

  if (!dbUser.stravaAthleteId) {
    return new Response(JSON.stringify({ error: 'STRAVA_NOT_CONNECTED' }), { status: 400 })
  }

  const stravaAthleteId = dbUser.stravaAthleteId

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      function send(event: SyncEvent) {
        controller.enqueue(encoder.encode(JSON.stringify(event) + '\n'))
      }

      try {
        const totalRuns = await getAthleteRunCount(
          dbUser.id,
          stravaAthleteId
        )
        send({ type: 'start', total: totalRuns })

        const after = dbUser.lastSyncedAt
          ? Math.floor(dbUser.lastSyncedAt.getTime() / 1000)
          : undefined

        let page = 1
        let syncedCount = 0
        const syncStartedAt = new Date()

        while (true) {
          const { activities } = await getActivities(dbUser.id, {
            after,
            page,
            perPage: 200,
          })

          if (activities.length === 0) break

          const runs = activities.filter((a) => a.type === 'Run')

          for (const run of runs) {
            const { detail } = await getActivityDetail(dbUser.id, run.id)

            const sharedFields = {
              name: detail.name,
              distance: detail.distance,
              movingTime: detail.moving_time,
              elapsedTime: detail.elapsed_time,
              averageSpeed: detail.average_speed,
              maxSpeed: detail.max_speed,
              averageHeartrate: detail.average_heartrate ?? null,
              maxHeartrate: detail.max_heartrate ?? null,
              totalElevationGain: detail.total_elevation_gain,
              elevHigh: detail.elev_high ?? null,
              elevLow: detail.elev_low ?? null,
              description: detail.description ?? null,
              calories: detail.calories ?? null,
              sufferScore: detail.suffer_score ?? null,
              averageCadence: detail.average_cadence ?? null,
              splitsMetric: detail.splits_metric
                ? (detail.splits_metric as unknown as Prisma.InputJsonValue)
                : undefined,
            }

            const activity = await prisma.activity.upsert({
              where: { stravaActivityId: BigInt(run.id) },
              create: {
                stravaActivityId: BigInt(run.id),
                userId: dbUser.id,
                startDate: new Date(detail.start_date),
                startLatlng:
                  detail.start_latlng?.length === 2
                    ? detail.start_latlng
                    : undefined,
                endLatlng:
                  detail.end_latlng?.length === 2
                    ? detail.end_latlng
                    : undefined,
                ...sharedFields,
              },
              update: sharedFields,
            })

            if (detail.laps?.length) {
              await prisma.$transaction(
                detail.laps.map((lap) =>
                  prisma.lap.upsert({
                    where: { stravaLapId: BigInt(lap.id) },
                    create: {
                      stravaLapId: BigInt(lap.id),
                      activityId: activity.id,
                      lapIndex: lap.lap_index,
                      name: lap.name,
                      elapsedTime: lap.elapsed_time,
                      movingTime: lap.moving_time,
                      distance: lap.distance,
                      startDate: new Date(lap.start_date),
                      averageSpeed: lap.average_speed,
                      maxSpeed: lap.max_speed,
                      totalElevationGain: lap.total_elevation_gain,
                      averageCadence: lap.average_cadence ?? null,
                      averageHeartrate: lap.average_heartrate ?? null,
                      maxHeartrate: lap.max_heartrate ?? null,
                      startIndex: lap.start_index,
                      endIndex: lap.end_index,
                      paceZone: lap.pace_zone ?? null,
                    },
                    update: {
                      lapIndex: lap.lap_index,
                      name: lap.name,
                      elapsedTime: lap.elapsed_time,
                      movingTime: lap.moving_time,
                      distance: lap.distance,
                      averageSpeed: lap.average_speed,
                      maxSpeed: lap.max_speed,
                      totalElevationGain: lap.total_elevation_gain,
                      averageCadence: lap.average_cadence ?? null,
                      averageHeartrate: lap.average_heartrate ?? null,
                      maxHeartrate: lap.max_heartrate ?? null,
                      startIndex: lap.start_index,
                      endIndex: lap.end_index,
                      paceZone: lap.pace_zone ?? null,
                    },
                  })
                )
              )
            }

            syncedCount++
          }

          send({ type: 'progress', synced: syncedCount })
          page++
        }

        await prisma.user.update({
          where: { id: dbUser.id },
          data: { lastSyncedAt: syncStartedAt },
        })

        send({ type: 'done', synced: syncedCount })
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'UNKNOWN_ERROR'
        send({ type: 'error', error: message })
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'application/x-ndjson',
      'Cache-Control': 'no-cache',
    },
  })
}
