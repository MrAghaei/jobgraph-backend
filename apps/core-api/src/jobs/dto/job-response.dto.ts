import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { JobStatus, WorkType } from "@repo/database";

export class JobCompanyDto {
  @ApiProperty({ format: "uuid" })
  id!: string;

  @ApiProperty({ example: "Acme Co" })
  name!: string;

  @ApiPropertyOptional({ nullable: true, example: "https://acme.example" })
  website!: string | null;

  @ApiPropertyOptional({
    nullable: true,
    example: "https://cdn.example/logo.png",
  })
  logoUrl!: string | null;
}

export class JobTagDto {
  @ApiProperty({ format: "uuid" })
  id!: string;

  @ApiProperty({ example: "NestJS" })
  name!: string;

  @ApiProperty({ example: "nestjs" })
  slug!: string;
}

export class JobListItemDto {
  @ApiProperty({ format: "uuid" })
  id!: string;

  @ApiProperty({ example: "برنامه‌نویس ارشد NestJS" })
  title!: string;

  @ApiProperty({ type: JobCompanyDto })
  company!: JobCompanyDto;

  @ApiPropertyOptional({ nullable: true, example: "تهران، تهران" })
  location!: string | null;

  @ApiPropertyOptional({ nullable: true, example: "تهران" })
  city!: string | null;

  @ApiPropertyOptional({ nullable: true, example: "توافقی" })
  salaryRange!: string | null;

  @ApiPropertyOptional({ nullable: true, example: "سه تا شش سال" })
  experienceLevel!: string | null;

  @ApiPropertyOptional({ enum: WorkType, nullable: true })
  workType!: WorkType | null;

  @ApiPropertyOptional({ nullable: true, example: "programming" })
  category!: string | null;

  @ApiPropertyOptional({ nullable: true, example: "jobinja" })
  source!: string | null;

  @ApiPropertyOptional({
    nullable: true,
    example: "https://jobinja.ir/companies/acme/jobs/abc",
  })
  sourceUrl!: string | null;

  @ApiProperty({ type: String, format: "date-time" })
  postedAt!: Date;

  @ApiProperty({ enum: JobStatus })
  status!: JobStatus;

  @ApiProperty({ type: [JobTagDto] })
  tags!: JobTagDto[];
}

export class JobDetailDto extends JobListItemDto {
  @ApiProperty({ example: "شرح کامل آگهی..." })
  description!: string;

  @ApiProperty({ type: String, format: "date" })
  datePosted!: Date;

  @ApiPropertyOptional({ type: String, format: "date-time", nullable: true })
  expiredAt!: Date | null;

  @ApiProperty({ type: String, format: "date-time" })
  createdAt!: Date;

  @ApiProperty({ type: String, format: "date-time" })
  updatedAt!: Date;
}

export class PaginationMetaDto {
  @ApiProperty({ example: 42 })
  total!: number;

  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 20 })
  limit!: number;

  @ApiProperty({ example: 3 })
  totalPages!: number;
}

export class PaginatedJobsDto {
  @ApiProperty({ type: [JobListItemDto] })
  data!: JobListItemDto[];

  @ApiProperty({ type: PaginationMetaDto })
  meta!: PaginationMetaDto;
}

export class JobCategoryFilterDto {
  @ApiProperty({ example: "programming" })
  key!: string;

  @ApiProperty({ example: "وب، برنامه‌نویسی و نرم‌افزار" })
  label!: string;
}

export class JobFiltersDto {
  @ApiProperty({ type: [JobCategoryFilterDto] })
  categories!: JobCategoryFilterDto[];

  @ApiProperty({ type: [String], example: ["تهران", "اصفهان"] })
  cities!: string[];

  @ApiProperty({ enum: WorkType, isArray: true })
  workTypes!: WorkType[];
}
