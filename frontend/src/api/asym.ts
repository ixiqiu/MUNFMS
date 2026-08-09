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
import type { AsymMessage } from '../types'

export interface AsymChannel {
  cabinetId: string
  cabinetName: string
  lastMessageAt?: string | null
  unreadCount: number
}

export const asymApi = {
  channels() {
    return client
      .get<{ channels: AsymChannel[] }>('/asymmetric/channels')
      .then((r) => r.data)
  },
  messages(cabinetId?: string) {
    return client
      .get<{ messages: AsymMessage[] }>('/asymmetric/messages', {
        params: cabinetId ? { cabinetId } : {},
      })
      .then((r) => r.data)
  },
  send(formData: FormData) {
    return client
      .post<{ message: AsymMessage }>('/asymmetric/messages', formData)
      .then((r) => r.data)
  },
  download(id: string) {
    return client.get<Blob>(`/asymmetric/messages/${id}/download`, { responseType: 'blob' })
  },
}
