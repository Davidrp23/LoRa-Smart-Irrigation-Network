import {IsNumber, IsString } from "class-validator";

export class VincularRouterDto {
    @IsString()
    codigoVinculacion: string; //codigo de vinculacion
}

