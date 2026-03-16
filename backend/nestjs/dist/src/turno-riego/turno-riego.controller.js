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
exports.TurnoRiegoController = void 0;
const common_1 = require("@nestjs/common");
const turno_riego_service_1 = require("./turno-riego.service");
const create_turno_riego_dto_1 = require("./dto/create-turno-riego.dto");
const update_turno_riego_dto_1 = require("./dto/update-turno-riego.dto");
const common_2 = require("@nestjs/common");
const passport_1 = require("@nestjs/passport");
let TurnoRiegoController = class TurnoRiegoController {
    turnoRiegoService;
    constructor(turnoRiegoService) {
        this.turnoRiegoService = turnoRiegoService;
    }
    create(req, createTurnoRiegoDto) {
        return this.turnoRiegoService.create(req.user.id, createTurnoRiegoDto);
    }
    findAll(req, parcelaId) {
        return this.turnoRiegoService.findAll(req.user.id, parcelaId);
    }
    findOne(req, id) {
        return this.turnoRiegoService.findOne(req.user.id, id);
    }
    update(req, id, updateTurnoRiegoDto) {
        return this.turnoRiegoService.update(req.user.id, id, updateTurnoRiegoDto);
    }
    remove(req, id) {
        return this.turnoRiegoService.remove(req.user.id, id);
    }
};
exports.TurnoRiegoController = TurnoRiegoController;
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_2.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, create_turno_riego_dto_1.CreateTurnoRiegoDto]),
    __metadata("design:returntype", void 0)
], TurnoRiegoController.prototype, "create", null);
__decorate([
    (0, common_1.Get)('parcela/:parcelaId'),
    __param(0, (0, common_2.Request)()),
    __param(1, (0, common_1.Param)('parcelaId', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Number]),
    __metadata("design:returntype", void 0)
], TurnoRiegoController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_2.Request)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Number]),
    __metadata("design:returntype", void 0)
], TurnoRiegoController.prototype, "findOne", null);
__decorate([
    (0, common_1.Patch)(':id'),
    __param(0, (0, common_2.Request)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Number, update_turno_riego_dto_1.UpdateTurnoRiegoDto]),
    __metadata("design:returntype", void 0)
], TurnoRiegoController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    __param(0, (0, common_2.Request)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Number]),
    __metadata("design:returntype", void 0)
], TurnoRiegoController.prototype, "remove", null);
exports.TurnoRiegoController = TurnoRiegoController = __decorate([
    (0, common_2.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, common_1.Controller)('turno-riego'),
    __metadata("design:paramtypes", [turno_riego_service_1.TurnoRiegoService])
], TurnoRiegoController);
//# sourceMappingURL=turno-riego.controller.js.map