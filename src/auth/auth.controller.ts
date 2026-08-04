import { Controller, Post, Body, UseGuards, Request } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthGuard } from '@nestjs/passport';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  @UseGuards(AuthGuard('local'))
  async login(@Body() body: { username: string; password: string }) {
    const user = await this.authService.validateUser(
      body.username,
      body.password,
    );
    return this.authService.login(user);
  }

  @Post('register')
  async register(
    @Body()
    body: {
      name: string;
      password: string;
      role: string;
      cabinetName: string;
      cabinetType: string;
    },
  ) {
    const user = await this.authService.registerWithCabinet(
      body.name,
      body.password,
      body.role,
      body.cabinetName,
      body.cabinetType,
    );
    return { message: '注册成功', user };
  }
}
