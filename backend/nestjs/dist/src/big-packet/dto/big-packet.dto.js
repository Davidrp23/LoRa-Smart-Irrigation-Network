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
exports.BigPacketDto = exports.MotaReportDto = exports.RouterTelemetryDto = exports.CreateBigPacketDto = void 0;
class CreateBigPacketDto {
}
exports.CreateBigPacketDto = CreateBigPacketDto;
const class_transformer_1 = require("class-transformer");
const class_validator_1 = require("class-validator");
class RouterTelemetryDto {
    bateria;
    latitud;
    longitud;
    paquetesEnviados;
    paquetesRecibidos;
    erroresTx;
    erroresRx;
    erroresCrc;
    versionAplicada;
}
exports.RouterTelemetryDto = RouterTelemetryDto;
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Expose)({ name: 'b' }),
    __metadata("design:type", Number)
], RouterTelemetryDto.prototype, "bateria", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Expose)({ name: 'lt' }),
    __metadata("design:type", Number)
], RouterTelemetryDto.prototype, "latitud", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Expose)({ name: 'lg' }),
    __metadata("design:type", Number)
], RouterTelemetryDto.prototype, "longitud", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Expose)({ name: 'tx' }),
    __metadata("design:type", Number)
], RouterTelemetryDto.prototype, "paquetesEnviados", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Expose)({ name: 'rx' }),
    __metadata("design:type", Number)
], RouterTelemetryDto.prototype, "paquetesRecibidos", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Expose)({ name: 'eT' }),
    __metadata("design:type", Number)
], RouterTelemetryDto.prototype, "erroresTx", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Expose)({ name: 'eR' }),
    __metadata("design:type", Number)
], RouterTelemetryDto.prototype, "erroresRx", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Expose)({ name: 'eC' }),
    __metadata("design:type", Number)
], RouterTelemetryDto.prototype, "erroresCrc", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_transformer_1.Expose)({ name: 'v' }),
    __metadata("design:type", Number)
], RouterTelemetryDto.prototype, "versionAplicada", void 0);
class MotaReportDto {
    motaId;
    timestamp;
    latitud;
    longitud;
    bateria;
    humedad;
    rssi;
    snr;
    erroresRxMota;
    versionAplicada;
}
exports.MotaReportDto = MotaReportDto;
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_transformer_1.Expose)({ name: 'id' }),
    __metadata("design:type", Number)
], MotaReportDto.prototype, "motaId", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Expose)({ name: 't' }),
    __metadata("design:type", Number)
], MotaReportDto.prototype, "timestamp", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Expose)({ name: 'lt' }),
    __metadata("design:type", Number)
], MotaReportDto.prototype, "latitud", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Expose)({ name: 'lg' }),
    __metadata("design:type", Number)
], MotaReportDto.prototype, "longitud", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_transformer_1.Expose)({ name: 'b' }),
    __metadata("design:type", Number)
], MotaReportDto.prototype, "bateria", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_transformer_1.Expose)({ name: 'h' }),
    __metadata("design:type", Number)
], MotaReportDto.prototype, "humedad", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_transformer_1.Expose)({ name: 'rs' }),
    __metadata("design:type", Number)
], MotaReportDto.prototype, "rssi", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_transformer_1.Expose)({ name: 'sn' }),
    __metadata("design:type", Number)
], MotaReportDto.prototype, "snr", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Expose)({ name: 'eR' }),
    __metadata("design:type", Number)
], MotaReportDto.prototype, "erroresRxMota", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_transformer_1.Expose)({ name: 'v' }),
    __metadata("design:type", Number)
], MotaReportDto.prototype, "versionAplicada", void 0);
class BigPacketDto {
    router;
    motas;
}
exports.BigPacketDto = BigPacketDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.ValidateNested)(),
    (0, class_transformer_1.Type)(() => RouterTelemetryDto),
    (0, class_transformer_1.Expose)({ name: 'rt' }),
    __metadata("design:type", RouterTelemetryDto)
], BigPacketDto.prototype, "router", void 0);
__decorate([
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => MotaReportDto),
    (0, class_transformer_1.Expose)({ name: 'ms' }),
    __metadata("design:type", Array)
], BigPacketDto.prototype, "motas", void 0);
//# sourceMappingURL=big-packet.dto.js.map