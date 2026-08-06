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

import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import * as express from 'express';
import * as path from 'path';
import * as fs from 'fs';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // 启用全局验证管道
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }));
  
  // 启用 CORS
  app.enableCors({
    origin: true,
    credentials: true,
  });
  
  // 设置全局前缀
  app.setGlobalPrefix('api');

  const frontendDist = path.join(process.cwd(), 'frontend', 'dist');
  if (fs.existsSync(frontendDist)) {
    app.use(express.static(frontendDist));
    app.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
      if (req.path.startsWith('/api')) {
        return next();
      }
      res.sendFile(path.join(frontendDist, 'index.html'));
    });
  }
  
  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`常中模联文件管理系统运行在 http://localhost:${port}/api`);
}

bootstrap();
