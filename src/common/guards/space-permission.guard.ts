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

import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';

@Injectable()
export class SpacePermissionGuard implements CanActivate {
  constructor(
    private jwtService: JwtService,
    private reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractTokenFromHeader(request);
    
    if (!token) {
      throw new ForbiddenException('未提供认证令牌');
    }

    try {
      const payload = await this.jwtService.verifyAsync(token);
      request['user'] = { ...payload, id: payload.sub };
      if (payload.role === 'ADMIN') {
        throw new ForbiddenException('管理员无文件空间权限');
      }
      
      // 从 JWT 中解析 cabinetId 和 role
      const { cabinetId, role } = payload;
      
      // 获取请求参数
      const spaceType = request.query.space as string;
      
      // 根据空间类型进行权限校验
      if (spaceType === 'CABINET') {
        // 内阁空间：只有该内阁的代表可以访问
        // targetId 必须从 JWT 获取，不能信任前端传递
        return true; // 具体过滤在 Service 层进行
      }
      
      if (spaceType === 'PUBLIC') {
        // 公共空间：所有人可读，学术组可写
        if (request.method === 'GET') {
          return true;
        }
        // 写操作需要学术组权限
        if (role !== 'ACADEMIC') {
          throw new ForbiddenException('只有学术组成员可以操作公共空间');
        }
        return true;
      }
      
      if (spaceType === 'CONFERENCE') {
        // 会议空间：代表只能提交和查看自己的提交，学术组有完全权限
        if (request.method === 'GET') {
          const type = request.query.type as string;
          if (type === 'MY' && role === 'DELEGATE') {
            return true;
          }
          if (role === 'ACADEMIC') {
            return true;
          }
          throw new ForbiddenException('无权访问会议空间文件');
        }
        if (request.method === 'POST') {
          // 代表可以提交，学术组也可以上传
          return true;
        }
        return true;
      }
      
      return true;
    } catch (e) {
      throw new ForbiddenException('无效的认证令牌');
    }
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
