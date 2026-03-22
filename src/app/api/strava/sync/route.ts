import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { getAthleteRunCount, getActivities } from '@/lib/strava'

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
            await prisma.activity.upsert({
              where: { stravaActivityId: BigInt(run.id) },
              create: {
                stravaActivityId: BigInt(run.id),
                userId: dbUser.id,
                name: run.name,
                distance: run.distance,
                movingTime: run.moving_time,
                elapsedTime: run.elapsed_time,
                startDate: new Date(run.start_date),
                averageSpeed: run.average_speed,
                maxSpeed: run.max_speed,
                averageHeartrate: run.average_heartrate ?? null,
                maxHeartrate: run.max_heartrate ?? null,
                totalElevationGain: run.total_elevation_gain,
                elevHigh: run.elev_high ?? null,
                elevLow: run.elev_low ?? null,
                startLatlng:
                  run.start_latlng?.length === 2
                    ? run.start_latlng
                    : undefined,
                endLatlng:
                  run.end_latlng?.length === 2 ? run.end_latlng : undefined,
              },
              update: {
                name: run.name,
                distance: run.distance,
                movingTime: run.moving_time,
                elapsedTime: run.elapsed_time,
                averageSpeed: run.average_speed,
                maxSpeed: run.max_speed,
                averageHeartrate: run.average_heartrate ?? null,
                maxHeartrate: run.max_heartrate ?? null,
                totalElevationGain: run.total_elevation_gain,
                elevHigh: run.elev_high ?? null,
                elevLow: run.elev_low ?? null,
              },
            })
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
