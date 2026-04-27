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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MotasController = void 0;
const common_1 = require("@nestjs/common");
const motas_service_1 = require("./motas.service");
const create_mota_dto_1 = require("./dto/create-mota.dto");
const update_mota_dto_1 = require("./dto/update-mota.dto");
const common_2 = require("@nestjs/common");
const passport_1 = require("@nestjs/passport");
const vincular_mota_dto_1 = require("./dto/vincular-mota.dto");
const update_motas_bulk_dto_1 = require("./dto/update-motas-bulk.dto");
const obtener_medicion_dto_1 = require("./dto/obtener-medicion.dto");
let MotasController = class MotasController {
    motasService;
    constructor(motasService) {
        this.motasService = motasService;
    }
    async create(createMotaDto) {
        return this.motasService.create(createMotaDto);
    }
    async vincularMota(req, vincularMotaDto) {
        return this.motasService.vincularMota(req.user.id, vincularMotaDto);
    }
    async desvincularMota(req, id) {
        return this.motasService.desvincularMota(req.user.id, id);
    }
    async findAll(req) {
        const miPropioId = req.user.id;
        return this.motasService.findAll(miPropioId);
    }
    async findOne(req, id) {
        const miPropioId = req.user.id;
        return this.motasService.findOne(miPropioId, id);
    }
    async update(req, id, updateMotaDto) {
        const miPropioId = req.user.id;
        return this.motasService.update(miPropioId, id, updateMotaDto);
    }
    async updateMotas(req, updateMotasBulkDto) {
        const miPropioId = req.user.id;
        return this.motasService.actualizarMotas(miPropioId, updateMotasBulkDto);
    }
    async getReportes(req, obtenerMedicionDto) {
        return this.motasService.getReportes(req.user.id, obtenerMedicionDto);
    }
};
exports.MotasController = MotasController;
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_mota_dto_1.CreateMotaDto]),
    __metadata("design:returntype", Promise)
], MotasController.prototype, "create", null);
__decorate([
    (0, common_1.Post)('vincular/'),
    __param(0, (0, common_2.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, vincular_mota_dto_1.vincularMotaDto]),
    __metadata("design:returntype", Promise)
], MotasController.prototype, "vincularMota", null);
__decorate([
    (0, common_1.Post)('desvincular/:id'),
    __param(0, (0, common_2.Request)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Number]),
    __metadata("design:returntype", Promise)
], MotasController.prototype, "desvincularMota", null);
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_2.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], MotasController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_2.Request)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Number]),
    __metadata("design:returntype", Promise)
], MotasController.prototype, "findOne", null);
__decorate([
    (0, common_1.Patch)(':id'),
    __param(0, (0, common_2.Request)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Number, update_mota_dto_1.UpdateMotaDto]),
    __metadata("design:returntype", Promise)
], MotasController.prototype, "update", null);
__decorate([
    (0, common_1.Patch)('update/all'),
    __param(0, (0, common_2.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, update_motas_bulk_dto_1.UpdateMotasBulkDto]),
    __metadata("design:returntype", Promise)
], MotasController.prototype, "updateMotas", null);
__decorate([
    (0, common_1.Post)('/reportes'),
    __param(0, (0, common_2.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, obtener_medicion_dto_1.ObtenerMedicionDto]),
    __metadata("design:returntype", Promise)
], MotasController.prototype, "getReportes", null);
exports.MotasController = MotasController = __decorate([
    (0, common_2.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, common_1.Controller)('motas'),
    __metadata("design:paramtypes", [motas_service_1.MotasService])
], MotasController);
//# sourceMappingURL=motas.controller.js.map