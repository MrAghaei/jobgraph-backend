import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { AlertCadence, AlertChannel, WorkType } from "@repo/database";
import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
} from "class-validator";

export class CreateSavedSearchDto {
  @ApiProperty({ example: "ری‌اکت تهران" })
  @IsString()
  @MaxLength(80)
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  keyword?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  category?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;

  @ApiPropertyOptional({ enum: WorkType })
  @IsOptional()
  @IsEnum(WorkType)
  workType?: WorkType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  experience?: string;
}

export class UpsertAlertDto {
  @ApiProperty({ enum: AlertChannel })
  @IsEnum(AlertChannel)
  channel!: AlertChannel;

  @ApiProperty({ enum: AlertCadence })
  @IsEnum(AlertCadence)
  cadence!: AlertCadence;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}
