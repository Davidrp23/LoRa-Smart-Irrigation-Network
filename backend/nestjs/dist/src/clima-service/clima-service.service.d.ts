import { CreateClimaServiceDto } from './dto/create-clima-service.dto';
import { UpdateClimaServiceDto } from './dto/update-clima-service.dto';
export declare class ClimaServiceService {
    create(createClimaServiceDto: CreateClimaServiceDto): string;
    findAll(): string;
    findOne(id: number): string;
    update(id: number, updateClimaServiceDto: UpdateClimaServiceDto): string;
    remove(id: number): string;
}
