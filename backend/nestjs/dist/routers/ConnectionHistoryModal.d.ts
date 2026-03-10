interface DispositivoBase {
    id: number;
    tipo: 'router' | 'mota';
    canal?: number | null;
    nombre?: string | null;
    modelo?: string | null;
}
interface Router extends DispositivoBase {
    tipo: 'router';
    paquetesEnviados: number;
    paquetesRecibidos: number;
    erroresTx: number;
    erroresRx: number;
    erroresCrc: number;
}
interface Mota extends DispositivoBase {
    tipo: 'mota';
    rssi: number | null;
    snr: number | null;
    erroresRx: number;
}
type Dispositivo = Router | Mota;
export default function ConnectionHistoryModal({ device, onClose }: {
    device: Dispositivo;
    onClose: () => void;
}): any;
export {};
