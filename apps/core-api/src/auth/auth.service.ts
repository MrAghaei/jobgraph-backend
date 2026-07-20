import { Injectable } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async register(dto: any) {
    const user = await this.prisma.user.create({
      data: dto,
    });
    const token = this.jwtService.sign({ sub: user.id });
    return { user, token };
  }
}
