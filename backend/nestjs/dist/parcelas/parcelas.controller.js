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
exports.ParcelasController = void 0;
const common_1 = require("@nestjs/common");
const parcelas_service_1 = require("./parcelas.service");
const create_parcela_dto_1 = require("./dto/create-parcela.dto");
const update_parcela_dto_1 = require("./dto/update-parcela.dto");
const common_2 = require("@nestjs/common");
const passport_1 = require("@nestjs/passport");
const obtener_historico_dto_1 = require("./dto/obtener-historico.dto");
let ParcelasController = class ParcelasController {
    parcelasService;
    constructor(parcelasService) {
        this.parcelasService = parcelasService;
    }
    create(req, createParcelaDto) {
        return this.parcelasService.create(req.user.id, createParcelaDto);
    }
    findAll(req) {
        const miPropioId = req.user.id;
        return this.parcelasService.findAll(miPropioId);
    }
    findOne(req, id) {
        const miPropioId = req.user.id;
        return this.parcelasService.findOne(miPropioId, id);
    }
    update(req, id, updateParcelaDto) {
        const miPropioId = req.user.id;
        return this.parcelasService.update(miPropioId, id, updateParcelaDto);
    }
    remove(req, id) {
        const miPropioId = req.user.id;
        return this.parcelasService.remove(miPropioId, id);
    }
    getHistorico(req, obtenerHistoricoDto) {
        const miPropioId = req.user.id;
        return this.parcelasService.getHistorico(miPropioId, obtenerHistoricoDto);
    }
};
exports.ParcelasController = ParcelasController;
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_2.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, create_parcela_dto_1.CreateParcelaDto]),
    __metadata("design:returntype", void 0)
], ParcelasController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_2.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], ParcelasController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_2.Request)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Number]),
    __metadata("design:returntype", void 0)
], ParcelasController.prototype, "findOne", null);
__decorate([
    (0, common_1.Patch)(':id'),
    __param(0, (0, common_2.Request)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Number, update_parcela_dto_1.UpdateParcelaDto]),
    __metadata("design:returntype", void 0)
], ParcelasController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    __param(0, (0, common_2.Request)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Number]),
    __metadata("design:returntype", void 0)
], ParcelasController.prototype, "remove", null);
__decorate([
    (0, common_1.Post)('/historico'),
    __param(0, (0, common_2.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, obtener_historico_dto_1.ObtenerHistoricoDto]),
    __metadata("design:returntype", void 0)
], ParcelasController.prototype, "getHistorico", null);
exports.ParcelasController = ParcelasController = __decorate([
    (0, common_2.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, common_1.Controller)('parcelas'),
    __metadata("design:paramtypes", [parcelas_service_1.ParcelasService])
], ParcelasController);
//# sourceMappingURL=parcelas.controller.js.map