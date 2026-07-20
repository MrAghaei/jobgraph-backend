import { Module } from "@nestjs/common";
import { ProController } from "./pro.controller";

@Module({
  controllers: [ProController],
})
export class ProModule {}
