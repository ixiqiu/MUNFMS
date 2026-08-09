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
import type { Directive, DirectiveType } from '../types'

export const directivesApi = {
  list(params?: { periodId?: string; typeId?: string; cabinetId?: string }) {
    return client
      .get<{ directives: Directive[] }>('/directives', { params })
      .then((r) => r.data)
  },
  create(formData: FormData) {
    return client.post<{ directive: Directive }>('/directives', formData).then((r) => r.data)
  },
  remove(id: string) {
    return client.delete<{ message: string }>(`/directives/${id}`).then((r) => r.data)
  },
  review(id: string, formData: FormData) {
    return client
      .put<{ directive: Directive }>(`/directives/${id}/review`, formData)
      .then((r) => r.data)
  },
  download(id: string) {
    return client.get<Blob>(`/directives/${id}/download`, { responseType: 'blob' })
  },
  downloadReply(id: string) {
    return client.get<Blob>(`/directives/${id}/download-reply`, { responseType: 'blob' })
  },
  listTypes() {
    return client.get<{ types: DirectiveType[] }>('/directives/types').then((r) => r.data)
  },
  createType(name: string) {
    return client.post<{ type: DirectiveType }>('/directives/types', { name }).then((r) => r.data)
  },
  deleteType(id: string) {
    return client.delete<{ message: string }>(`/directives/types/${id}`).then((r) => r.data)
  },
}
