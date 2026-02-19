import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class LoginDto {
  @IsEmail({}, { message: 'Debe ser un email válido' })
  email: string;

  @IsString()
  @IsNotEmpty({ message: 'La contraseña no puede estar vacía' })
  password: string;
}