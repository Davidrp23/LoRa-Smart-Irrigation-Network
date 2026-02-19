import { CreateUsuarioDto } from './dto/create-usuario.dto';
import { UpdateUsuarioDto } from './dto/update-usuario.dto';
import { Usuario } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
export declare class UsuariosService {
    private prisma;
    constructor(prisma: PrismaService);
    create(createUsuarioDto: CreateUsuarioDto): Promise<Usuario>;
    findAll(): Promise<Usuario[]>;
    findOne(id: number): Promise<Usuario | null>;
    findByEmail(email: string): Promise<Usuario | null>;
    updateById(id: number, updateUsuarioDto: UpdateUsuarioDto): Promise<Usuario>;
    updateByEmail(email: string, updateUsuarioDto: UpdateUsuarioDto): Promise<Usuario>;
    removeByID(id: number): Promise<Usuario>;
    removeByEmail(email: string): Promise<Usuario>;
    private hashString;
}
