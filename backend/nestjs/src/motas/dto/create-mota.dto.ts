import { IsDate, IsInt, IsNotEmpty, IsString } from "class-validator";

export class CreateMotaDto {

    @IsString()
    @IsNotEmpty()
    modelo: string;
}
