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
import type { TimelineEntry } from '../types'

export const timelineApi = {
  list(params?: { periodId?: string; type?: string }) {
    return client
      .get<{ entries: TimelineEntry[] }>('/timeline', { params })
      .then((r) => r.data)
  },
  create(formData: FormData) {
    return client.post<{ entry: TimelineEntry }>('/timeline', formData).then((r) => r.data)
  },
  remove(id: string) {
    return client.delete<{ message: string }>(`/timeline/${id}`).then((r) => r.data)
  },
  download(id: string) {
    return client.get<Blob>(`/timeline/${id}/download`, { responseType: 'blob' })
  },
}
