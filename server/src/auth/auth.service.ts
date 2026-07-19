import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import type { Response } from 'express';
import { UsersService } from '../users/users.service';
import {
  ACCESS_TOKEN_COOKIE,
  type JwtPayload,
} from './auth.constants';
import { toAuthUser } from './auth.types';
import type { LoginDto } from './dto/login.dto';
import type { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.usersService.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException('Email is already registered');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = await this.usersService.create({
      email: dto.email.toLowerCase(),
      passwordHash,
      name: dto.name ?? null,
    });

    return toAuthUser(user);
  }

  async validateUser(email: string, password: string) {
    const user = await this.usersService.findByEmail(email.toLowerCase());
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    return user;
  }

  async login(dto: LoginDto, res: Response) {
    const user = await this.validateUser(dto.email, dto.password);
    this.setAuthCookie(res, { sub: user.id, email: user.email });
    return toAuthUser(user);
  }

  logout(res: Response) {
    res.clearCookie(ACCESS_TOKEN_COOKIE, this.getCookieOptions());
    return { success: true };
  }

  async me(userId: string) {
    const user = await this.usersService.findByIdOrFail(userId);
    return toAuthUser(user);
  }

  private setAuthCookie(res: Response, payload: JwtPayload) {
    const token = this.jwtService.sign(payload);
    const maxAgeMs = this.getCookieMaxAgeMs();

    res.cookie(ACCESS_TOKEN_COOKIE, token, {
      ...this.getCookieOptions(),
      maxAge: maxAgeMs,
    });
  }

  private getCookieOptions() {
    const isProduction =
      this.configService.get<string>('NODE_ENV') === 'production';

    return {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax' as const,
      path: '/',
    };
  }

  private getCookieMaxAgeMs() {
    const expiresIn = this.configService.get<string>('JWT_EXPIRES_IN') ?? '7d';
    const match = /^(\d+)([smhd])$/.exec(expiresIn);

    if (!match) {
      return 7 * 24 * 60 * 60 * 1000;
    }

    const value = Number(match[1]);
    const unit = match[2];
    const multipliers: Record<string, number> = {
      s: 1000,
      m: 60 * 1000,
      h: 60 * 60 * 1000,
      d: 24 * 60 * 60 * 1000,
    };

    return value * multipliers[unit];
  }
}
