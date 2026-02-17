import {IsNumber, IsString } from "class-validator";

export class CreateRouterDto {

    @IsNumber()
    id: number;

    @IsString()
    codigoVinculacion: string;
    
    @IsString()
    modelo: string;  // Ej: "Gateway Casa Norte"
}
