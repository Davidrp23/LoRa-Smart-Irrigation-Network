import { PartialType } from '@nestjs/swagger';
import { CreateClimaServiceDto } from './create-clima-service.dto';

export class UpdateClimaServiceDto extends PartialType(CreateClimaServiceDto) {}
