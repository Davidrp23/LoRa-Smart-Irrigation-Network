import { UsuariosService } from './usuarios.service';
import { CreateUsuarioDto } from './dto/create-usuario.dto';
import { UpdateUsuarioDto } from './dto/update-usuario.dto';
import { Usuario } from '@prisma/client';
export declare class UsuariosController {
    private readonly usuariosService;
    constructor(usuariosService: UsuariosService);
    create(createUsuarioDto: CreateUsuarioDto): Promise<Usuario>;
    findOne(req: any): Promise<Usuario | null>;
    updateById(req: any, updateUsuarioDto: UpdateUsuarioDto): Promise<Usuario>;
    removeById(req: any): Promise<Usuario>;
}
