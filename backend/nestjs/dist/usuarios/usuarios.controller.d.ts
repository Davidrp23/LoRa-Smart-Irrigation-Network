import { UsuariosService } from './usuarios.service';
import { CreateUsuarioDto } from './dto/create-usuario.dto';
import { UpdateUsuarioDto } from './dto/update-usuario.dto';
import { Usuario } from '@prisma/client';
export declare class UsuariosController {
    private readonly usuariosService;
    constructor(usuariosService: UsuariosService);
    create(createUsuarioDto: CreateUsuarioDto): Promise<Usuario>;
    findAll(): Promise<Usuario[]>;
    findOne(id: number): Promise<Usuario | null>;
    updateById(id: number, updateUsuarioDto: UpdateUsuarioDto): Promise<Usuario>;
    updateByEmail(email: string, updateUsuarioDto: UpdateUsuarioDto): Promise<Usuario>;
    removeById(id: number): Promise<Usuario>;
    removeByEmail(email: string): Promise<Usuario>;
}
