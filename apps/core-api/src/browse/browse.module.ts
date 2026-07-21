import { Module } from "@nestjs/common";
import { BrowseController } from "./browse.controller";

@Module({
  controllers: [BrowseController],
})
export class BrowseModule {}
