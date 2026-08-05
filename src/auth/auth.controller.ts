import { Controller, Post, Body, UseGuards, Request } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthGuard } from '@nestjs/passport';
import { UserRole } from '../entities/user.entity';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  @UseGuards(AuthGuard('local'))
  async login(@Request() req) {
    return this.authService.login(req.user);
  }

  @Post('register')
  async register(
    @Body()
    body: {
      name: string;
      password: string;
      role: UserRole;
      cabinetId: string;
    },
  ) {
    const user = await this.authService.registerWithCabinet(
      body.name,
      body.password,
      body.role,
      body.cabinetId,
    );
    return { message: '注册成功', user };
  }
}
