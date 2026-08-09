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

import { Response } from 'express';
import { extname } from 'path';

export function setContentDisposition(res: Response, fileName: string): void {
  const asciiFallback = fileName.replace(/[^\x20-\x7E]/g, '_').replace(/"/g, '');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="${asciiFallback}"; filename*=UTF-8''${encodeURIComponent(fileName)}`,
  );
}

const mimeTypes: Record<string, string> = {
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

export function getMimeType(fileName: string): string {
  const ext = extname(fileName).toLowerCase();
  return mimeTypes[ext] ?? 'application/octet-stream';
}
