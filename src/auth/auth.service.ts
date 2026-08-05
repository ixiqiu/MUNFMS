import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { User, UserRole } from '../entities/user.entity';
import { Cabinet } from '../entities/cabinet.entity';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Cabinet)
    private cabinetRepository: Repository<Cabinet>,
    private jwtService: JwtService,
  ) {}

  async validateUser(username: string, password: string): Promise<any> {
    const user = await this.userRepository.findOne({
      where: { name: username },
      relations: ['cabinet'],
    });

    if (!user) {
      throw new UnauthorizedException('用户不存在');
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('密码错误');
    }

    const { passwordHash, ...result } = user;
    return result;
  }

  async login(user: User) {
    const payload = {
      sub: user.id,
      name: user.name,
      role: user.role,
      cabinetId: user.cabinetId,
    };

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        name: user.name,
        role: user.role,
        cabinet: user.cabinet,
      },
    };
  }

  async registerWithCabinet(
    name: string,
    password: string,
    role: UserRole,
    cabinetId: string,
  ) {
    if (role === UserRole.ADMIN) {
      throw new BadRequestException('不允许注册管理员账号');
    }

    if (!Object.values(UserRole).includes(role)) {
      throw new BadRequestException('无效的用户角色');
    }

    const cabinet = await this.cabinetRepository.findOne({
      where: { id: cabinetId },
    });

    if (!cabinet) {
      throw new BadRequestException('所选内阁不存在');
    }

    // 检查用户是否已存在
    const existingUser = await this.userRepository.findOne({
      where: { name },
    });

    if (existingUser) {
      throw new UnauthorizedException('用户名已存在');
    }

    // 创建用户
    const passwordHash = await bcrypt.hash(password, 10);
    const user = this.userRepository.create({
      name,
      passwordHash,
      role,
      cabinet,
      cabinetId: cabinet.id,
    });

    const saved = await this.userRepository.save(user);
    const { passwordHash: _passwordHash, ...safeUser } = saved;
    return safeUser;
  }
}
