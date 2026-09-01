import { PrismaClient } from "@prisma/client";
import { Pool, PoolConfig } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";

export * from "@prisma/client";
export * from "./jobinja-categories.js";

const globalForPrisma = global as unknown as { pgPool: Pool };

export class CustomPrismaClient extends PrismaClient {
  constructor(databaseUrl: string) {
    const poolConfig: PoolConfig = {
      connectionString: databaseUrl,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    };

    const pool = globalForPrisma.pgPool || new Pool(poolConfig);

    if (process.env.NODE_ENV !== "production") {
      globalForPrisma.pgPool = pool;
    }

    const adapter = new PrismaPg(pool);
    super({ adapter });
  }
}
