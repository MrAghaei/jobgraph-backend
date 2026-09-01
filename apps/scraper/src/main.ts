import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableShutdownHooks();
  const port = Number(process.env.SCRAPER_PORT ?? process.env.PORT ?? 4001);
  try {
    await app.listen(port);
  } catch (error) {
    const code =
      error && typeof error === "object" && "code" in error
        ? String((error as { code?: string }).code)
        : "";
    if (code === "EADDRINUSE") {
      console.error(
        `Port ${port} is already in use. Another scraper is running — stop it first (fuser -k ${port}/tcp) instead of starting a second process.`,
      );
      process.exit(1);
    }
    throw error;
  }
}
void bootstrap();
