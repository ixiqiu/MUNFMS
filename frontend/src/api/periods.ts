/*
 * MUNFMS - A dedicated file management tool for organizing and sharing documents in MUN meetings.
 * Copyright (C) 2026 iXiQiu (@ixiqiu)
 * 
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * 
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 * 
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import client from './client'
import type { ConferencePeriod, PeriodClock } from '../types'

export const periodsApi = {
  list() {
    return client.get<{ periods: ConferencePeriod[] }>('/periods').then((r) => r.data)
  },
  getCurrent() {
    return client
      .get<{ period: ConferencePeriod | null; clock: PeriodClock | null }>('/periods/current')
      .then((r) => r.data)
  },
  create(body: { number: number; name?: string }) {
    return client.post<{ period: ConferencePeriod }>('/periods', body).then((r) => r.data)
  },
  setCurrent(periodId: string) {
    return client
      .put<{ period: ConferencePeriod }>('/periods/current', { periodId })
      .then((r) => r.data)
  },
  setTime(body: { simTime: string; flowRatio: number }) {
    return client.put<{ clock: PeriodClock }>('/periods/time', body).then((r) => r.data)
  },
  pauseTime() {
    return client.put<{ clock: PeriodClock }>('/periods/time/pause').then((r) => r.data)
  },
  resumeTime() {
    return client.put<{ clock: PeriodClock }>('/periods/time/resume').then((r) => r.data)
  },
}
