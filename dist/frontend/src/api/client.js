"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = __importDefault(require("axios"));
const element_plus_1 = require("element-plus");
const client = axios_1.default.create({
    baseURL: '/api',
    timeout: 30000,
});
client.interceptors.request.use((config) => {
    const token = localStorage.getItem('mun_token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});
client.interceptors.response.use((response) => response, (error) => {
    const status = error.response?.status;
    const message = error.response?.data?.message || '请求失败';
    if (status === 401) {
        localStorage.removeItem('mun_token');
        localStorage.removeItem('mun_user');
        if (window.location.pathname !== '/login') {
            window.location.href = '/login';
        }
    }
    else {
        element_plus_1.ElMessage.error(Array.isArray(message) ? message.join('；') : message);
    }
    return Promise.reject(error);
});
exports.default = client;
//# sourceMappingURL=client.js.map