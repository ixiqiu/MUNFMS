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
import type { DelegateNotificationStatus, NotificationSettings } from '../types'

export const notificationsApi = {
  getSettings: () => client.get<NotificationSettings>('/notifications/settings').then((r) => r.data),
  setEnabled: (enabled: boolean) =>
    client.put<{ enabled: boolean }>('/notifications/settings', { enabled }).then((r) => r.data),
  setDnd: (sessionId: string, muted: boolean) =>
    client.put<{ muted: boolean }>(`/notifications/dnd/${sessionId}`, { muted }).then((r) => r.data),
  reportPermission: (state: string) =>
    client.post<{ ok: boolean }>('/notifications/permission-state', { state }).then((r) => r.data),
  reportConnectionMode: (mode: string) =>
    client.post<{ ok: boolean }>('/notifications/connection-state', { mode }).then((r) => r.data),
  getOverview: (q?: string) =>
    client
      .get<{ delegates: DelegateNotificationStatus[] }>('/notifications/overview', { params: q ? { q } : {} })
      .then((r) => r.data),
}
