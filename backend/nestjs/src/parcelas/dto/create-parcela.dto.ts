import { IsArray, IsNotEmpty, IsNumber, IsOptional, IsString } from "class-validator";

export class CreateParcelaDto {
    @IsString()
    @IsNotEmpty()
    nombre: string;  // Ej: "Sector Olivos A"

    @IsNumber()
    @IsNotEmpty()
    areaM2: number;

    @IsNumber()
    @IsNotEmpty()
    riegoId: number;

    @IsNumber()
    @IsNotEmpty()
    caudalRiegoLh: number;

    @IsNumber()
    @IsNotEmpty()
    sueloId: number;

    @IsNumber()
    @IsNotEmpty()
    cultivoId: number;
  
    // Centro aproximado de la parcela para el mapa
    @IsNumber()
    @IsNotEmpty()
    latitudCentro: number;

    @IsNumber()
    @IsNotEmpty()
    longitudCentro: number;

    @IsOptional() //Puntos del poligono que forma la parcela -> json
    @IsArray()
    puntos?: any;

    @IsString()
    @IsNotEmpty()
    zonaHoraria: string; //Ej. "Europe/Madrid"
    
}
