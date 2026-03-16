import { TurnoRiegoService } from './turno-riego.service';
import { CreateTurnoRiegoDto } from './dto/create-turno-riego.dto';
import { UpdateTurnoRiegoDto } from './dto/update-turno-riego.dto';
export declare class TurnoRiegoController {
    private readonly turnoRiegoService;
    constructor(turnoRiegoService: TurnoRiegoService);
    create(req: any, createTurnoRiegoDto: CreateTurnoRiegoDto): Promise<{
        horaConfigurada: string;
        proximaEjecucionUTC: Date | null;
        id: number;
        proximoRiego: Date | null;
        tiempoRiegoMin: number | null;
        estadoRiego: string | null;
        parcelaId: number;
    }>;
    findAll(req: any, parcelaId: number): Promise<{
        horaConfigurada: string;
        proximaEjecucionUTC: Date | null;
        id: number;
        proximoRiego: Date | null;
        tiempoRiegoMin: number | null;
        estadoRiego: string | null;
        parcelaId: number;
    }[]>;
    findOne(req: any, id: number): Promise<{
        horaConfigurada: string;
        proximaEjecucionUTC: Date | null;
        id: number;
        proximoRiego: Date | null;
        tiempoRiegoMin: number | null;
        estadoRiego: string | null;
        parcelaId: number;
    } | null>;
    update(req: any, id: number, updateTurnoRiegoDto: UpdateTurnoRiegoDto): Promise<{
        horaConfigurada: string;
        proximaEjecucionUTC: Date | null;
        id: number;
        proximoRiego: Date | null;
        tiempoRiegoMin: number | null;
        estadoRiego: string | null;
        parcelaId: number;
    }>;
    remove(req: any, id: number): Promise<{
        horaConfigurada: string;
        proximaEjecucionUTC: Date | null;
        id: number;
        proximoRiego: Date | null;
        tiempoRiegoMin: number | null;
        estadoRiego: string | null;
        parcelaId: number;
    }>;
}
