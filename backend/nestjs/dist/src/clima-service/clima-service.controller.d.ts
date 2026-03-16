import { ClimaServiceService } from './clima-service.service';
import { CreateClimaServiceDto } from './dto/create-clima-service.dto';
import { UpdateClimaServiceDto } from './dto/update-clima-service.dto';
export declare class ClimaServiceController {
    private readonly climaServiceService;
    constructor(climaServiceService: ClimaServiceService);
    create(createClimaServiceDto: CreateClimaServiceDto): string;
    findAll(): string;
    findOne(id: string): string;
    update(id: string, updateClimaServiceDto: UpdateClimaServiceDto): string;
    remove(id: string): string;
}
