import { PartialType } from '@nestjs/swagger';
import { CreateMedicioneDto } from './create-medicione.dto';

export class UpdateMedicioneDto extends PartialType(CreateMedicioneDto) {}
