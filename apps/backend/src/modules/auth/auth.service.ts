import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcrypt";
import { createHash, randomBytes } from "node:crypto";
import { PrismaService } from "../../prisma/prisma.service";
import { UsersService } from "../users/users.service";

const BCRYPT_ROUNDS = 12;

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersService,
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async register(email: string, password: string) {
    const existing = await this.users.findByEmail(email);
    if (existing) {
      throw new ConflictException("An account with this email already exists");
    }
    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const user = await this.users.create(email, passwordHash);
    return this.issueTokens(user.id, user.email);
  }

  async login(email: string, password: string) {
    const user = await this.users.findByEmail(email);
    if (!user) {
      throw new UnauthorizedException("Invalid email or password");
    }
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      throw new UnauthorizedException("Invalid email or password");
    }
    return this.issueTokens(user.id, user.email);
  }

  async refresh(refreshToken: string) {
    const tokenHash = this.hashRefreshToken(refreshToken);
    const row = await this.prisma.refreshToken.findFirst({
      where: { tokenHash, expiresAt: { gt: new Date() } },
    });
    if (!row) {
      throw new UnauthorizedException("Invalid or expired refresh token");
    }
    await this.prisma.refreshToken.delete({ where: { id: row.id } });
    const user = await this.users.findById(row.userId);
    if (!user) {
      throw new UnauthorizedException("User no longer exists");
    }
    return this.issueTokens(user.id, user.email);
  }

  async logout(refreshToken: string) {
    const tokenHash = this.hashRefreshToken(refreshToken);
    await this.prisma.refreshToken.deleteMany({ where: { tokenHash } });
  }

  private async issueTokens(userId: string, email: string) {
    const accessToken = await this.jwt.signAsync(
      { sub: userId, email },
      {
        expiresIn: this.config.get<string>("JWT_ACCESS_EXPIRES", "15m"),
      },
    );
    const rawRefresh = randomBytes(32).toString("hex");
    const tokenHash = this.hashRefreshToken(rawRefresh);
    const expiresDays = this.config.get<number>("JWT_REFRESH_EXPIRES_DAYS", 7);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresDays);

    await this.prisma.refreshToken.create({
      data: { userId, tokenHash, expiresAt },
    });

    return {
      accessToken,
      refreshToken: rawRefresh,
      user: { id: userId, email },
    };
  }

  private hashRefreshToken(token: string) {
    return createHash("sha256").update(token, "utf8").digest("hex");
  }
}
