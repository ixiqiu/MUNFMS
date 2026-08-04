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
      request['user'] = payload;
      
      // 从 JWT 中解析 cabinetId 和 role
      const { cabinetId, role } = payload;
      
      // 获取请求参数
      const spaceType = request.query.space as string;
      const fileId = request.params.id as string;
      
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
