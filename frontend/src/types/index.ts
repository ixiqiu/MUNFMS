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

export type UserRole = 'ADMIN' | 'DELEGATE' | 'ACADEMIC'
export type CabinetType = 'CABINET' | 'BUREAU' | 'CRISIS'
export type SpaceType = 'CABINET' | 'PUBLIC' | 'CONFERENCE' | 'CONSULT'

export interface Cabinet {
  id: string
  name: string
  type: CabinetType
}

export interface AdminUser {
  id: string
  name: string
  role: UserRole
  cabinetId: string | null
  cabinet: Cabinet | null
  createdAt: string
}

export interface User {
  id: string
  name: string
  role: UserRole
  cabinetId?: string
  cabinet?: Cabinet
}

export interface LoginResponse {
  access_token: string
  user: User
}

export interface FileEntity {
  id: string
  fileName: string
  storagePath: string
  spaceType: SpaceType
  uploaderId: string
  uploaderName?: string
  uploaderCabinetName?: string
  targetId: string
  isFromConference: boolean
  createdAt: string
}

export interface Session {
  id: string
  name: string | null
  lastMessageTime: string | null
  members: Cabinet[]
  unreadCount?: number
}

export interface Message {
  id: string
  sessionId: string
  senderCabinetId: string | null
  senderType: 'CABINET' | 'ACADEMIC'
  senderName?: string | null
  senderUserId?: string | null
  uploaderName?: string | null
  uploaderCabinetName?: string | null
  content?: string | null
  fileId: string | null
  isRead: boolean
  createdAt: string
  file?: FileEntity | null
}

export type SseEventType = 'file.changed' | 'session.changed' | 'message.new' | 'cabinet.deleted'

export interface SseEvent {
  type: SseEventType
  spaceType?: SpaceType
  targetId?: string | null
  sessionId?: string
  actorId?: string
  ts: number
}
