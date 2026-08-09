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
export type SpaceType =
  | 'CABINET'
  | 'PUBLIC'
  | 'CONFERENCE'
  | 'CONSULT'
  | 'TIMELINE'
  | 'DIRECTIVE'
  | 'ASYMMETRIC'

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

export type SseEventType =
  | 'file.changed'
  | 'session.changed'
  | 'message.new'
  | 'cabinet.deleted'
  | 'period.changed'
  | 'timeline.changed'
  | 'directive.new'
  | 'directive.changed'
  | 'asym.message.new'

export interface SseEvent {
  type: SseEventType
  spaceType?: SpaceType
  targetId?: string | null
  sessionId?: string
  actorId?: string
  fileName?: string
  senderCabinetId?: string | null
  entryType?: 'SITUATION' | 'NEWS'
  status?: 'ACCEPTED' | 'REJECTED'
  senderType?: 'CABINET' | 'ACADEMIC'
  ts: number
}

export type NotificationPermissionState = 'granted' | 'denied' | 'default' | 'unsupported'
export type ConnectionStatus = 'online' | 'polling' | 'offline'

export interface NotificationSettings {
  enabled: boolean
  dndSessionIds: string[]
}

export interface DelegateNotificationStatus {
  userId: string
  name: string
  cabinetName: string
  enabled: boolean
  lastPermission: NotificationPermissionState | null
  lastPermissionAt: string | null
  connectionStatus: ConnectionStatus
}

export interface ConferencePeriod {
  id: string
  number: number
  name: string | null
  createdAt: string
}

export type TimelineEntryType = 'SITUATION' | 'NEWS'

export interface TimelineEntry {
  id: string
  periodId: string
  type: TimelineEntryType
  newsSource: string | null
  content: string | null
  fileId: string | null
  sequence: number
  createdAt: string
  period?: { number: number } | null
  file?: { id: string; fileName: string } | null
}

export interface DirectiveType {
  id: string
  name: string
  isPreset: boolean
  sortOrder: number
  createdAt: string
}

export type DirectiveStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED'

export interface Directive {
  id: string
  periodId: string
  typeId: string
  typeName: string
  cabinetId: string
  content: string
  fileId: string | null
  status: DirectiveStatus
  reply: string | null
  replyFileId: string | null
  sequence: number
  createdAt: string
  reviewedAt: string | null
  file?: { id: string; fileName: string } | null
  replyFile?: { id: string; fileName: string } | null
  cabinetName?: string
}

export interface AsymMessage {
  id: string
  cabinetId: string
  senderType: 'CABINET' | 'ACADEMIC'
  senderUserId: string
  content: string | null
  fileId: string | null
  isRead: boolean
  createdAt: string
  file?: { id: string; fileName: string } | null
  senderName?: string
  senderCabinetName?: string
}
