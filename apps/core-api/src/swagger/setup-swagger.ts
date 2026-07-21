import { INestApplication } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { apiReference } from "@scalar/nestjs-api-reference";
import {
  OPENAPI_JSON_PATH,
  SCALAR_DOCS_PATH,
  SWAGGER_ACCESS_TOKEN_SCHEME,
  SWAGGER_REFRESH_COOKIE_SCHEME,
} from "./swagger.constants";

export function setupSwagger(app: INestApplication): void {
  const configService = app.get(ConfigService);
  const nodeEnv = configService.get<string>("NODE_ENV", "development");
  const swaggerEnabled = configService.get<string>("SWAGGER_ENABLED");

  const enabled =
    swaggerEnabled !== undefined
      ? swaggerEnabled === "true"
      : nodeEnv !== "production";

  if (!enabled) {
    return;
  }

  const port = configService.get<string>("PORT", "3000");
  const serverUrl =
    configService.get<string>("SWAGGER_SERVER_URL") ??
    `http://localhost:${port}`;

  const config = new DocumentBuilder()
    .setTitle("JobGraph API")
    .setDescription(
      "Core API for JobGraph — authentication, job browsing, analytics, and pro features.",
    )
    .setVersion("1.0")
    .addServer(serverUrl)
    .addBearerAuth(
      {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        description:
          "JWT access token returned by login, register, or refresh endpoints",
      },
      SWAGGER_ACCESS_TOKEN_SCHEME,
    )
    .addCookieAuth(SWAGGER_REFRESH_COOKIE_SCHEME, {
      type: "apiKey",
      in: "cookie",
      name: SWAGGER_REFRESH_COOKIE_SCHEME,
      description:
        "HttpOnly refresh token cookie set on login/register (path: /auth)",
    })
    .addTag("health", "Health and status")
    .addTag("auth", "Authentication and session management")
    .addTag("auth-google", "Google OAuth sign-in")
    .addTag("jobs", "Public job browsing")
    .addTag("analytics", "Job market analytics")
    .addTag("pro", "Pro subscription features")
    .build();

  const document = SwaggerModule.createDocument(app, config, {
    operationIdFactory: (controllerKey, methodKey) =>
      `${controllerKey}_${methodKey}`,
  });

  SwaggerModule.setup(OPENAPI_JSON_PATH, app, document, {
    jsonDocumentUrl: `${OPENAPI_JSON_PATH}-json`,
    swaggerUiEnabled: false,
  });

  app.use(
    `/${SCALAR_DOCS_PATH}`,
    apiReference({
      content: document,
      pageTitle: "JobGraph API Reference",
    }),
  );
}
