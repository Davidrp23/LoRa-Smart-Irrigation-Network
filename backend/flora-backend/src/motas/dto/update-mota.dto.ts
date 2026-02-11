import { PartialType } from '@nestjs/mapped-types';
import { CreateMotaDto } from './create-mota.dto';

export class UpdateMotaDto extends PartialType(CreateMotaDto) {}
