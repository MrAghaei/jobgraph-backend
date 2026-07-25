import { Module } from "@nestjs/common";
import { JobRepositoryService } from "./job-repository.service";
import { SkillExtractionService } from "./skill-extraction.service";

@Module({
  providers: [JobRepositoryService, SkillExtractionService],
  exports: [JobRepositoryService, SkillExtractionService],
})
export class JobsModule {}
