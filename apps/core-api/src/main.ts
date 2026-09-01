import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import cookieParser from "cookie-parser";
import { AppModule } from "./app.module";
import { setupSwagger } from "./swagger/setup-swagger";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const http = app.getHttpAdapter().getInstance() as { set?: (k: string, v: boolean) => void };
  http.set?.("etag", false);

  app.use(cookieParser());

  const corsOrigin = process.env.CORS_ORIGIN;
  if (corsOrigin) {
    app.enableCors({
      origin: corsOrigin,
      credentials: true,
    });
  }

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  setupSwagger(app);

  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
