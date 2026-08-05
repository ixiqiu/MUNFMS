import client from './client'
import type {
  LoginResponse,
  User,
  FileEntity,
  Session,
  Message,
  SpaceType,
  UserRole,
  CabinetType,
  Cabinet,
  AdminUser,
} from '../types'

export const authApi = {
  login(username: string, password: string) {
    return client.post<LoginResponse>('/auth/login', { username, password }).then((r) => r.data)
  },
  register(payload: {
    name: string
    password: string
    role: Exclude<UserRole, 'ADMIN'>
    cabinetId: string
  }) {
    return client.post<{ message: string; user: User }>('/auth/register', payload).then((r) => r.data)
  },
}

export const filesApi = {
  list(space: SpaceType, type?: string) {
    return client
      .get<{ files: FileEntity[] }>('/files', { params: { space, type } })
      .then((r) => r.data.files)
  },
  upload(space: SpaceType, file: File) {
    const form = new FormData()
    form.append('file', file)
    return client
      .post<{ message: string; file: FileEntity }>(`/files/upload?space=${space}`, form)
      .then((r) => r.data.file)
  },
  download(id: string) {
    return client.get<Blob>(`/files/${id}/download`, { responseType: 'blob' })
  },
  publish(id: string) {
    return client.post<{ message: string; file: FileEntity }>(`/files/${id}/publish`).then((r) => r.data.file)
  },
  remove(id: string) {
    return client.delete<{ message: string }>(`/files/${id}`).then((r) => r.data)
  },
}

export const sessionsApi = {
  list() {
    return client.get<{ sessions: Session[] }>('/sessions').then((r) => r.data.sessions)
  },
  create(cabinetIds: string[], name?: string) {
    return client
      .post<{ session: Session }>('/sessions', { cabinetIds, name })
      .then((r) => r.data.session)
  },
  rename(sessionId: string, name: string) {
    return client
      .patch<{ session: Session }>(`/sessions/${sessionId}`, { name })
      .then((r) => r.data.session)
  },
  messages(sessionId: string) {
    return client.get<{ messages: Message[] }>(`/sessions/${sessionId}/messages`).then((r) => r.data.messages)
  },
  sendMessage(sessionId: string, file: File) {
    const form = new FormData()
    form.append('file', file)
    return client
      .post<{ message: Message }>(`/sessions/${sessionId}/messages`, form)
      .then((r) => r.data.message)
  },
  downloadMessage(messageId: string) {
    return client.get<Blob>(`/sessions/messages/${messageId}/download`, { responseType: 'blob' })
  },
}

export const cabinetsApi = {
  list() {
    return client.get<{ cabinets: Cabinet[] }>('/cabinets').then((r) => r.data.cabinets)
  },
}

export const adminApi = {
  users() {
    return client.get<AdminUser[]>('/admin/users').then((r) => r.data)
  },
  createUser(payload: {
    name: string
    password: string
    role: Exclude<UserRole, 'ADMIN'>
    cabinetId?: string
  }) {
    return client.post('/admin/users', payload).then((r) => r.data)
  },
  changePassword(userId: string, newPassword: string) {
    return client.patch(`/admin/users/${userId}/password`, { newPassword }).then((r) => r.data)
  },
  deleteUser(userId: string) {
    return client.delete(`/admin/users/${userId}`).then((r) => r.data)
  },
  createCabinet(payload: { name: string; type: CabinetType }) {
    return client.post('/admin/cabinets', payload).then((r) => r.data)
  },
  deleteCabinet(cabinetId: string) {
    return client.delete(`/admin/cabinets/${cabinetId}`).then((r) => r.data)
  },
}
