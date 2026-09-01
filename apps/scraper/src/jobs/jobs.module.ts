import { Module } from "@nestjs/common";
import { AlertsModule } from "../alerts/alerts.module";
import { JobLifecycleService } from "./job-lifecycle.service";
import { JobRepositoryService } from "./job-repository.service";
import { SkillExtractionService } from "./skill-extraction.service";

@Module({
  imports: [AlertsModule],
  providers: [
    JobRepositoryService,
    SkillExtractionService,
    JobLifecycleService,
  ],
  exports: [
    JobRepositoryService,
    SkillExtractionService,
    JobLifecycleService,
  ],
})
export class JobsModule {}

