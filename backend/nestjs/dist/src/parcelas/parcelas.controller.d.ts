import { ParcelasService } from './parcelas.service';
import { CreateParcelaDto } from './dto/create-parcela.dto';
import { UpdateParcelaDto } from './dto/update-parcela.dto';
import { ObtenerHistoricoDto } from './dto/obtener-historico.dto';
export declare class ParcelasController {
    private readonly parcelasService;
    constructor(parcelasService: ParcelasService);
    create(req: any, createParcelaDto: CreateParcelaDto): Promise<{
        id: number;
        nombre: string;
        humedadMedia: number | null;
        areaM2: number | null;
        caudalRiegoLh: number | null;
        sueloId: number | null;
        cultivoId: number | null;
        riegoId: number | null;
        latitudCentro: number;
        longitudCentro: number;
        puntos: import("@prisma/client/runtime/library").JsonValue | null;
        usuarioId: number;
    }>;
    findAll(req: any): Promise<{
        id: number;
        nombre: string;
        humedadMedia: number | null;
        areaM2: number | null;
        caudalRiegoLh: number | null;
        sueloId: number | null;
        cultivoId: number | null;
        riegoId: number | null;
        latitudCentro: number;
        longitudCentro: number;
        puntos: import("@prisma/client/runtime/library").JsonValue | null;
        usuarioId: number;
    }[]>;
    findOne(req: any, id: number): Promise<{
        id: number;
        nombre: string;
        humedadMedia: number | null;
        areaM2: number | null;
        caudalRiegoLh: number | null;
        sueloId: number | null;
        cultivoId: number | null;
        riegoId: number | null;
        latitudCentro: number;
        longitudCentro: number;
        puntos: import("@prisma/client/runtime/library").JsonValue | null;
        usuarioId: number;
    } | null>;
    update(req: any, id: number, updateParcelaDto: UpdateParcelaDto): Promise<{
        id: number;
        nombre: string;
        humedadMedia: number | null;
        areaM2: number | null;
        caudalRiegoLh: number | null;
        sueloId: number | null;
        cultivoId: number | null;
        riegoId: number | null;
        latitudCentro: number;
        longitudCentro: number;
        puntos: import("@prisma/client/runtime/library").JsonValue | null;
        usuarioId: number;
    }>;
    remove(req: any, id: number): Promise<{
        id: number;
        nombre: string;
        humedadMedia: number | null;
        areaM2: number | null;
        caudalRiegoLh: number | null;
        sueloId: number | null;
        cultivoId: number | null;
        riegoId: number | null;
        latitudCentro: number;
        longitudCentro: number;
        puntos: import("@prisma/client/runtime/library").JsonValue | null;
        usuarioId: number;
    }>;
    getHistorico(req: any, obtenerHistoricoDto: ObtenerHistoricoDto): Promise<{
        id: number;
        humedadMedia: number;
        parcelaId: number;
        fecha: Date;
    }[]>;
}
