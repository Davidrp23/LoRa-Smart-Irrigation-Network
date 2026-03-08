import { IsArray, IsNotEmpty, IsNumber, IsOptional, IsString } from "class-validator";

export class CreateParcelaDto {
    @IsString()
    @IsNotEmpty()
    nombre: string;  // Ej: "Sector Olivos A"

    @IsString()
    @IsNotEmpty()
    cultivo: string;

    @IsOptional()
    @IsString()
    tipoSuelo?: string;
  
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
    
}
