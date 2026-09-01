import { Module } from "@nestjs/common";
import { BillingModule } from "../billing/billing.module";
import { ProController } from "./pro.controller";

@Module({
  imports: [BillingModule],
  controllers: [ProController],
})
export class ProModule {}
