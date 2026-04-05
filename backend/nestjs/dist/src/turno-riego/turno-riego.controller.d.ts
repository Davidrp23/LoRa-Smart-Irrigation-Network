import { TurnoRiegoService } from './turno-riego.service';
import { CreateTurnoRiegoDto } from './dto/create-turno-riego.dto';
import { UpdateTurnoRiegoDto } from './dto/update-turno-riego.dto';
export declare class TurnoRiegoController {
    private readonly turnoRiegoService;
    constructor(turnoRiegoService: TurnoRiegoService);
    create(req: any, createTurnoRiegoDto: CreateTurnoRiegoDto): Promise<{
        id: number;
        parcelaId: number;
        horaConfigurada: string;
        proximaEjecucionUTC: Date | null;
        proximoRiego: Date | null;
        tiempoRiegoMin: number | null;
        estadoRiego: string | null;
    }>;
    findAll(req: any, parcelaId: number): Promise<{
        id: number;
        parcelaId: number;
        horaConfigurada: string;
        proximaEjecucionUTC: Date | null;
        proximoRiego: Date | null;
        tiempoRiegoMin: number | null;
        estadoRiego: string | null;
    }[]>;
    findOne(req: any, id: number): Promise<{
        id: number;
        parcelaId: number;
        horaConfigurada: string;
        proximaEjecucionUTC: Date | null;
        proximoRiego: Date | null;
        tiempoRiegoMin: number | null;
        estadoRiego: string | null;
    } | null>;
    update(req: any, id: number, updateTurnoRiegoDto: UpdateTurnoRiegoDto): Promise<{
        id: number;
        parcelaId: number;
        horaConfigurada: string;
        proximaEjecucionUTC: Date | null;
        proximoRiego: Date | null;
        tiempoRiegoMin: number | null;
        estadoRiego: string | null;
    }>;
    remove(req: any, id: number): Promise<{
        id: number;
        parcelaId: number;
        horaConfigurada: string;
        proximaEjecucionUTC: Date | null;
        proximoRiego: Date | null;
        tiempoRiegoMin: number | null;
        estadoRiego: string | null;
    }>;
}
