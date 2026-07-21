import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsString } from "class-validator";

export class LoginDto {
  @ApiProperty({ format: "email", example: "user@example.com" })
  @IsEmail()
  email!: string;

  @ApiProperty({ format: "password", example: "password123" })
  @IsString()
  password!: string;
}
