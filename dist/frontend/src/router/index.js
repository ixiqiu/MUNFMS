"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const vue_router_1 = require("vue-router");
const router = (0, vue_router_1.createRouter)({
    history: (0, vue_router_1.createWebHistory)(),
    routes: [
        { path: '/login', name: 'login', component: () => Promise.resolve().then(() => __importStar(require('../views/LoginView.vue'))) },
        { path: '/register', name: 'register', component: () => Promise.resolve().then(() => __importStar(require('../views/RegisterView.vue'))) },
        {
            path: '/',
            component: () => Promise.resolve().then(() => __importStar(require('../layouts/MainLayout.vue'))),
            children: [
                { path: '', redirect: '/cabinet' },
                { path: 'cabinet', name: 'cabinet', component: () => Promise.resolve().then(() => __importStar(require('../views/CabinetSpace.vue'))) },
                { path: 'public', name: 'public', component: () => Promise.resolve().then(() => __importStar(require('../views/PublicSpace.vue'))) },
                { path: 'conference', name: 'conference', component: () => Promise.resolve().then(() => __importStar(require('../views/ConferenceSpace.vue'))) },
                { path: 'consult', name: 'consult', component: () => Promise.resolve().then(() => __importStar(require('../views/ConsultSpace.vue'))) },
            ],
        },
    ],
});
router.beforeEach((to) => {
    const token = localStorage.getItem('mun_token');
    if (!token && to.name !== 'login' && to.name !== 'register') {
        return { name: 'login' };
    }
    if (token && (to.name === 'login' || to.name === 'register')) {
        return { name: 'cabinet' };
    }
});
exports.default = router;
//# sourceMappingURL=index.js.map