import { IsEmail, IsNumber, IsString } from "class-validator";

export class VincularRouterDto {

    @IsNumber()
    id:number; //Id del router

    @IsString()
    codigoVinculacion: string; //Id del codigo de vinculacion

    @IsEmail()
    email: string;

}

