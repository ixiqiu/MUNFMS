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

import { Controller, Get, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

@Controller('license')
export class LicenseController {
  private readonly logger = new Logger(LicenseController.name);

  @Get()
  getLicense(): { text: string } {
    try {
      const licensePath = path.join(process.cwd(), 'LICENSE');
      return { text: fs.readFileSync(licensePath, 'utf-8') };
    } catch (err) {
      this.logger.error('Failed to read LICENSE file', err instanceof Error ? err.stack : String(err));
      return { text: '许可证文件缺失，请参见 https://www.gnu.org/licenses/gpl-3.0.html' };
    }
  }
}
