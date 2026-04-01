"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateMotasBulkDto = void 0;
const class_validator_1 = require("class-validator");
class UpdateMotasBulkDto {
    motaIds;
    frecuencia;
    conexionPublica;
}
exports.UpdateMotasBulkDto = UpdateMotasBulkDto;
__decorate([
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ArrayNotEmpty)({ message: 'El array de motas no puede estar vacío' }),
    (0, class_validator_1.IsInt)({ each: true, message: 'Cada ID de mota debe ser un número entero' }),
    __metadata("design:type", Array)
], UpdateMotasBulkDto.prototype, "motaIds", void 0);
__decorate([
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(15, { message: 'La frecuencia mínima es de 15 minutos' }),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], UpdateMotasBulkDto.prototype, "frecuencia", void 0);
__decorate([
    (0, class_validator_1.IsBoolean)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Boolean)
], UpdateMotasBulkDto.prototype, "conexionPublica", void 0);
//# sourceMappingURL=update-motas-bulk.dto.js.map