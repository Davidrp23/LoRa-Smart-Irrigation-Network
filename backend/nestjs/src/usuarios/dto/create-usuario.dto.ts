import { IsEmail, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateUsuarioDto {
  @IsEmail()
  email: string;

  @IsString()
  @IsNotEmpty()
  nombre: string;

  @IsString()
  @MinLength(8, { message: 'La contraseña es muy corta, minimo 8 caracteres. ' })
  password: string;

  @IsOptional()
  @IsString()
  foto?: string;
}