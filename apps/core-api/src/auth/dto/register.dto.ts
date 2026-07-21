import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsString, MinLength } from "class-validator";

export class RegisterDto {
  @ApiProperty({ format: "email", example: "user@example.com" })
  @IsEmail()
  email!: string;

  @ApiProperty({ format: "password", minLength: 8, example: "password123" })
  @IsString()
  @MinLength(8)
  password!: string;
}
