export class CreateBigPacketDto {}
import { Type, Expose } from 'class-transformer';
import { IsNumber, IsOptional, IsArray, ValidateNested } from 'class-validator';

// ==========================================
// 1. ESTADO DEL ROUTER ("rt")
// ==========================================
export class RouterTelemetryDto {
  @IsNumber() @IsOptional() @Expose({ name: 'b' })
  bateria?: number;

  @IsNumber() @IsOptional() @Expose({ name: 'lt' })
  latitud?: number;

  @IsNumber() @IsOptional() @Expose({ name: 'lg' })
  longitud?: number;

  // Contadores
  @IsNumber() @IsOptional() @Expose({ name: 'tx' })
  paquetesEnviados?: number;

  @IsNumber() @IsOptional() @Expose({ name: 'rx' })
  paquetesRecibidos?: number;

  @IsNumber() @IsOptional() @Expose({ name: 'eT' })
  erroresTx?: number;

  @IsNumber() @IsOptional() @Expose({ name: 'eR' })
  erroresRx?: number;

  @IsNumber() @IsOptional() @Expose({ name: 'eC' })
  erroresCrc?: number;
}

// ==========================================
// 2. REPORTE DE UNA MOTA ("ms" -> item)
// ==========================================
export class MotaReportDto {
  @IsNumber() @Expose({ name: 'id' })
  motaId: number;

  // Timestamp Unix (Segundos) - Opcional. Si no viene, usamos la hora actual del servidor.
  @IsNumber() @IsOptional() @Expose({ name: 't' })
  timestamp?: number; 

  // --- DATOS PARA ACTUALIZAR LA TABLA 'Mota' ---
  @IsNumber() @IsOptional() @Expose({ name: 'lt' })
  latitud?: number;

  @IsNumber() @IsOptional() @Expose({ name: 'lg' })
  longitud?: number;

  // --- DATOS PARA CREAR LA 'Medicion' (y actualizar bateriaUltima en 'Mota') ---
  @IsNumber() @Expose({ name: 'b' })
  bateria: number;

  @IsNumber() @Expose({ name: 'h' })
  humedad: number;

  @IsNumber() @Expose({ name: 'rs' })
  rssi: number;

  @IsNumber() @Expose({ name: 'sn' })
  snr: number;

  @IsNumber() @IsOptional() @Expose({ name: 'eR' })
  erroresRxMota?: number;
}

// ==========================================
// 3. EL SOBRE PRINCIPAL (Big Packet)
// ==========================================
export class BigPacketDto {
  
  @IsOptional()
  @ValidateNested()
  @Type(() => RouterTelemetryDto)
  @Expose({ name: 'rt' })
  router?: RouterTelemetryDto;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MotaReportDto)
  @Expose({ name: 'ms' })
  motas: MotaReportDto[];
}