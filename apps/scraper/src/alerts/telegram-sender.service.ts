import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import axios from "axios";

@Injectable()
export class TelegramSenderService {
  private readonly logger = new Logger(TelegramSenderService.name);

  constructor(private readonly config: ConfigService) {}

  async sendMessage(chatId: string, text: string): Promise<void> {
    const token = this.config.get<string>("TELEGRAM_BOT_TOKEN");
    if (!token) {
      this.logger.warn("TELEGRAM_BOT_TOKEN missing; skip send");
      return;
    }

    const url = `https://api.telegram.org/bot${token}/sendMessage`;
    try {
      await axios.post(url, {
        chat_id: chatId,
        text,
        disable_web_page_preview: false,
      });
    } catch (error) {
      this.logger.error(
        `Telegram send failed for chat ${chatId}: ${error instanceof Error ? error.message : error}`,
      );
    }
  }
}
