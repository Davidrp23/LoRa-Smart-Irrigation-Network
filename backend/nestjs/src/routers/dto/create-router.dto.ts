import {IsNumber, IsString } from "class-validator";

export class CreateRouterDto {
    
    @IsString()
    modelo: string;  // Ej: "Gateway Casa Norte"
}
