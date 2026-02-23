import { IsNotEmpty, IsNumber, IsString } from "class-validator";

export class CreateMotaDto {

    @IsString()
    @IsNotEmpty()
    modelo: string;
}
