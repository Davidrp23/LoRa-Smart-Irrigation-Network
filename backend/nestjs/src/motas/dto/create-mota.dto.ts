export class CreateMotaDto {
  // En TS definimos el tipo de dato.
  // El '?' significa que es opcional (si quisieras).
  
  id_dispositivo: string; // El ID impreso en la carcasa
  alias: string;          // Ej: "Mota Tomates Norte"
  latitud: number;
  longitud: number;
}