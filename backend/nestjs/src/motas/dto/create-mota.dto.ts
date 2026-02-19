import { IsNotEmpty, IsNumber, IsString } from "class-validator";

export class CreateMotaDto {

    @IsNumber()
    @IsNotEmpty()
    id: number;

    @IsString()
    @IsNotEmpty()
    codigoVinculacion: string;

    @IsString()
    @IsNotEmpty()
    modelo: string;
}
