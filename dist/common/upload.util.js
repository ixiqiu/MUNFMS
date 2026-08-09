"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createUploadOptions = createUploadOptions;
const multer_1 = require("multer");
const path_1 = require("path");
function createUploadOptions(dest, maxSize) {
    return {
        defParamCharset: 'utf8',
        storage: (0, multer_1.diskStorage)({
            destination: dest,
            filename: (_req, file, cb) => {
                const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
                cb(null, `${uniqueSuffix}${(0, path_1.extname)(file.originalname)}`);
            },
        }),
        ...(maxSize ? { limits: { fileSize: maxSize } } : {}),
    };
}
//# sourceMappingURL=upload.util.js.map