export type UserRole = 'ADMIN' | 'DELEGATE' | 'ACADEMIC'
export type CabinetType = 'CABINET' | 'BUREAU' | 'CRISIS'
export type SpaceType = 'CABINET' | 'PUBLIC' | 'CONFERENCE'

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
  fileId: string
  isRead: boolean
  createdAt: string
  file?: FileEntity
}
