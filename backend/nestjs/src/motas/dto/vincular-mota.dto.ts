import { IsNotEmpty, IsNumber, IsString } from "class-validator";

export class vincularMotaDto{

    @IsNumber()
    @IsNotEmpty()
    id:number; //Id de la mota

    @IsString()
    @IsNotEmpty()
    codigoVinculacion: string; //codigo de vinculacion
}