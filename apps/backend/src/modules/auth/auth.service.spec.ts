import { Test } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { ConflictException, UnauthorizedException } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { PrismaService } from "../../prisma/prisma.service";
import { UsersService } from "../users/users.service";

describe("AuthService", () => {
  let service: AuthService;
  const prisma = {
    refreshToken: {
      findFirst: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
    },
  };
  const users = {
    findByEmail: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
  };
  const jwt = {
    signAsync: jest.fn().mockResolvedValue("signed.access.token"),
  };
  const config = {
    get: jest.fn((key: string, defaultValue?: unknown) => {
      if (key === "JWT_ACCESS_EXPIRES") return "15m";
      if (key === "JWT_REFRESH_EXPIRES_DAYS") return 7;
      return defaultValue;
    }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: users },
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: jwt },
        { provide: ConfigService, useValue: config },
      ],
    }).compile();

    service = moduleRef.get(AuthService);
  });

  it("register rejects duplicate email", async () => {
    users.findByEmail.mockResolvedValue({ id: "u1" });
    await expect(service.register("a@b.com", "password12")).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it("login rejects unknown user", async () => {
    users.findByEmail.mockResolvedValue(null);
    await expect(service.login("a@b.com", "password12")).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it("refresh rejects missing token row", async () => {
    prisma.refreshToken.findFirst.mockResolvedValue(null);
    await expect(service.refresh("a".repeat(32))).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});
