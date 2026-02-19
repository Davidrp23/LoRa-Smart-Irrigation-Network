import { IsNotEmpty, IsNumber } from "class-validator";


export class CreateMedicionDto {

    @IsNumber()
    @IsNotEmpty()
    humedad: number;

    // --- TELEMETRÍA DEL DISPOSITIVO ---
    @IsNumber()
    @IsNotEmpty()
    bateria: number;      // Historial de descarga

    // --- CALIDAD DEL ENLACE (UPLINK - Visto por el Router) ---
    @IsNumber()
    @IsNotEmpty()
    rssi: number;     // Potencia de señal recibida

    @IsNumber()
    @IsNotEmpty()
    snr: number;   // Relación Señal/Ruido

    // --- DIAGNÓSTICO (DOWNLINK - Reportado por la Mota) ---
    @IsNumber()
    @IsNotEmpty()
    erroresRxMota: number; // Paquetes corruptos que la mota detectó

    // Relaciones
    @IsNumber()
    @IsNotEmpty()
    motaId: number;
}
