import { ApiProperty } from "@nestjs/swagger";
import { Role } from "@prisma/client";

export class SubscriptionResponseDto {
  @ApiProperty({ format: "uuid" })
  userId!: string;

  @ApiProperty({ enum: Role })
  role!: Role;

  @ApiProperty({ example: "active" })
  status!: string;

  @ApiProperty({
    type: [String],
    example: ["advanced-analytics", "saved-searches", "alerts"],
  })
  features!: string[];
}
