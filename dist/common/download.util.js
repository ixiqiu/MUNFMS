"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setContentDisposition = setContentDisposition;
exports.getMimeType = getMimeType;
const path_1 = require("path");
function setContentDisposition(res, fileName) {
    const asciiFallback = fileName.replace(/[^\x20-\x7E]/g, '_').replace(/"/g, '');
    res.setHeader('Content-Disposition', `attachment; filename="${asciiFallback}"; filename*=UTF-8''${encodeURIComponent(fileName)}`);
}
const mimeTypes = {
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.svg': 'image/svg+xml',
    '.bmp': 'image/bmp',
    '.pdf': 'application/pdf',
    '.doc': 'application/msword',
    '.docx': 'application/msword',
    '.xls': 'application/vnd.ms-excel',
    '.xlsx': 'application/vnd.ms-excel',
    '.ppt': 'application/vnd.ms-powerpoint',
    '.pptx': 'application/vnd.ms-powerpoint',
    '.txt': 'text/plain',
    '.zip': 'application/zip',
};
function getMimeType(fileName) {
    const ext = (0, path_1.extname)(fileName).toLowerCase();
    return mimeTypes[ext] ?? 'application/octet-stream';
}
//# sourceMappingURL=download.util.js.map