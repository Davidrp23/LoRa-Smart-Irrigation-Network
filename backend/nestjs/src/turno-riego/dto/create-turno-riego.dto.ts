import { IsDate, IsInt, IsNotEmpty, IsString } from "class-validator";
import { Type } from "class-transformer";

export class CreateTurnoRiegoDto {

    @IsString()
    @IsNotEmpty()
    horaConfigurada: string;

    @IsInt()
    @IsNotEmpty()
    parcelaId: number;
}
