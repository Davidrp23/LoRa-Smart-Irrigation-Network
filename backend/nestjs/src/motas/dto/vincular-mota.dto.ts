import { IsNotEmpty, IsNumber, IsString } from "class-validator";

export class vincularMotaDto{

    @IsString()
    @IsNotEmpty()
    codigoVinculacion: string; //codigo de vinculacion
}