import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createTransport, Transporter } from "nodemailer";

@Injectable()
export class EmailSenderService {
  private readonly logger = new Logger(EmailSenderService.name);
  private readonly transport: Transporter | null;

  constructor(private readonly config: ConfigService) {
    const host = this.config.get<string>("SMTP_HOST");
    const user = this.config.get<string>("SMTP_USER");
    const pass = this.config.get<string>("SMTP_PASS");
    if (!host || !user || !pass) {
      this.transport = null;
    } else {
      this.transport = createTransport({
        host,
        port: Number(this.config.get("SMTP_PORT") ?? 587),
        secure: this.config.get("SMTP_SECURE") === "true",
        auth: { user, pass },
      });
    }
  }

  async sendHtml(to: string, subject: string, html: string): Promise<void> {
    if (!this.transport) {
      this.logger.warn("SMTP is not configured; skip email");
      return;
    }
    const from =
      this.config.get<string>("SMTP_FROM") ?? "JobGraph <noreply@jobgraph.dev>";
    try {
      await this.transport.sendMail({ from, to, subject, html });
    } catch (error) {
      this.logger.error(
        `Email send failed to ${to}: ${error instanceof Error ? error.message : error}`,
      );
    }
  }
}
