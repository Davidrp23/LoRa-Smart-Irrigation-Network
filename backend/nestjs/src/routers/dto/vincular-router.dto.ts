import {IsNumber, IsString } from "class-validator";

export class VincularRouterDto {

    @IsNumber()
    id:number; //Id del router

    @IsString()
    codigoVinculacion: string; //codigo de vinculacion
}

