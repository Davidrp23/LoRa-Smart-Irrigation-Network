import { PartialType } from '@nestjs/swagger';
import { CreateTurnoRiegoDto } from './create-turno-riego.dto';
import { Type } from 'class-transformer';
import { IsDate, IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class UpdateTurnoRiegoDto{
    @IsString()
    @IsOptional()
    horaConfigurada: string;
    
    @Type(() => Date)
    @IsDate()
    @IsOptional()
    proximaEjecucionUTC: Date;

    //No añadimos el campo de parcelaId porque no tiene sentido cambiar el turno de riego a otra parcela una vez creado.
    //Ademas esto añade un agujerto de seguridad si un usuario intenta poner en la parcelaId una parcela que no es suya, 
    //otro agricultor veria como su parcela empieza a regar en intervalos que el no ha configurado, se podria evitar añadiendo 
    //comprobaciones adicionales en el .service pero es inncesario igualmente, lo evitamos quitandolo de aqui. Si el usuario intenta meter
    //por fuerza el campo de parcelaId se ingnorara o dara error:

    /* POSTMAN EXAMPLE

    {
        "message": [
            "property parcelaId should not exist"
        ],
        "error": "Bad Request",
        "statusCode": 400
    }

    */
}
