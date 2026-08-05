"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useAuthStore = void 0;
const pinia_1 = require("pinia");
const vue_1 = require("vue");
const api_1 = require("../api");
exports.useAuthStore = (0, pinia_1.defineStore)('auth', () => {
    const token = (0, vue_1.ref)(localStorage.getItem('mun_token') || '');
    const user = (0, vue_1.ref)(JSON.parse(localStorage.getItem('mun_user') || 'null'));
    const isLoggedIn = (0, vue_1.computed)(() => !!token.value);
    const isAcademic = (0, vue_1.computed)(() => user.value?.role === 'ACADEMIC');
    function persist() {
        localStorage.setItem('mun_token', token.value);
        localStorage.setItem('mun_user', JSON.stringify(user.value));
    }
    async function login(username, password) {
        const res = await api_1.authApi.login(username, password);
        token.value = res.access_token;
        user.value = res.user;
        persist();
    }
    function logout() {
        token.value = '';
        user.value = null;
        localStorage.removeItem('mun_token');
        localStorage.removeItem('mun_user');
    }
    return { token, user, isLoggedIn, isAcademic, login, logout };
});
//# sourceMappingURL=auth.js.map