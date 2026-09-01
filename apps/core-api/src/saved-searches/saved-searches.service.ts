import {
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { randomBytes } from "crypto";
import { Role } from "@repo/database";
import { PrismaService } from "../prisma/prisma.service";
import { CreateSavedSearchDto, UpsertAlertDto } from "./dto/saved-search.dto";

@Injectable()
export class SavedSearchesService {
  constructor(private readonly prisma: PrismaService) {}

  list(userId: string) {
    return this.prisma.savedSearch.findMany({
      where: { userId },
      include: { alerts: true },
      orderBy: { createdAt: "desc" },
    });
  }

  create(userId: string, dto: CreateSavedSearchDto) {
    return this.prisma.savedSearch.create({
      data: { userId, ...dto },
      include: { alerts: true },
    });
  }

  async remove(userId: string, id: string) {
    const existing = await this.prisma.savedSearch.findFirst({
      where: { id, userId },
    });
    if (!existing) throw new NotFoundException("Saved search not found");
    await this.prisma.savedSearch.delete({ where: { id } });
  }

  async upsertAlert(userId: string, savedSearchId: string, dto: UpsertAlertDto) {
    const search = await this.prisma.savedSearch.findFirst({
      where: { id: savedSearchId, userId },
    });
    if (!search) throw new NotFoundException("Saved search not found");

    return this.prisma.alert.upsert({
      where: {
        savedSearchId_channel_cadence: {
          savedSearchId,
          channel: dto.channel,
          cadence: dto.cadence,
        },
      },
      create: {
        savedSearchId,
        channel: dto.channel,
        cadence: dto.cadence,
        enabled: dto.enabled ?? true,
      },
      update: { enabled: dto.enabled ?? true },
    });
  }

  async getTelegramLink(userId: string, botUsername?: string) {
    let link = await this.prisma.telegramLink.findUnique({ where: { userId } });
    if (!link) {
      link = await this.prisma.telegramLink.create({
        data: {
          userId,
          verifyToken: randomBytes(16).toString("hex"),
        },
      });
    }
    const username = botUsername?.replace(/^@/, "");
    return {
      connected: Boolean(link.chatId && link.verifiedAt),
      deepLink: username
        ? `https://t.me/${username}?start=${link.verifyToken}`
        : null,
    };
  }

  async bindTelegram(token: string, chatId: string) {
    const link = await this.prisma.telegramLink.findUnique({
      where: { verifyToken: token },
      include: { user: true },
    });
    if (!link) return false;
    if (link.user.role !== Role.PRO && link.user.role !== Role.ADMIN) {
      return false;
    }
    await this.prisma.telegramLink.update({
      where: { id: link.id },
      data: { chatId, verifiedAt: new Date() },
    });
    return true;
  }
}
