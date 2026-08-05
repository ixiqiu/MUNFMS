"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sessionsApi = exports.filesApi = exports.authApi = void 0;
const client_1 = __importDefault(require("./client"));
exports.authApi = {
    login(username, password) {
        return client_1.default.post('/auth/login', { username, password }).then((r) => r.data);
    },
    register(payload) {
        return client_1.default.post('/auth/register', payload).then((r) => r.data);
    },
};
exports.filesApi = {
    list(space, type) {
        return client_1.default
            .get('/files', { params: { space, type } })
            .then((r) => r.data.files);
    },
    upload(space, file) {
        const form = new FormData();
        form.append('file', file);
        return client_1.default
            .post(`/files/upload?space=${space}`, form)
            .then((r) => r.data.file);
    },
    download(id) {
        return client_1.default.get(`/files/${id}/download`, { responseType: 'blob' });
    },
    publish(id) {
        return client_1.default.post(`/files/${id}/publish`).then((r) => r.data.file);
    },
    remove(id) {
        return client_1.default.delete(`/files/${id}`).then((r) => r.data);
    },
};
exports.sessionsApi = {
    list() {
        return client_1.default.get('/sessions').then((r) => r.data.sessions);
    },
    create(targetCabinetId) {
        return client_1.default
            .post('/sessions/create', null, { params: { targetCabinetId } })
            .then((r) => r.data.session);
    },
    messages(sessionId) {
        return client_1.default.get(`/sessions/${sessionId}/messages`).then((r) => r.data.messages);
    },
    sendMessage(sessionId, file) {
        const form = new FormData();
        form.append('file', file);
        return client_1.default
            .post(`/sessions/${sessionId}/messages`, form)
            .then((r) => r.data.message);
    },
    downloadMessage(messageId) {
        return client_1.default.get(`/sessions/messages/${messageId}/download`, { responseType: 'blob' });
    },
};
//# sourceMappingURL=index.js.map