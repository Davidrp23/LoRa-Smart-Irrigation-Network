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
let MotasController = class MotasController {
    motasService;
    constructor(motasService) {
        this.motasService = motasService;
    }
    create(createMotaDto) {
        return this.motasService.create(createMotaDto);
    }
    findAll() {
        return this.motasService.findAll();
    }
    findOne(id) {
        return this.motasService.findOne(+id);
    }
    update(id, updateMotaDto) {
        return this.motasService.update(+id, updateMotaDto);
    }
    remove(id) {
        return this.motasService.remove(+id);
    }
};
exports.MotasController = MotasController;
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_mota_dto_1.CreateMotaDto]),
    __metadata("design:returntype", void 0)
], MotasController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], MotasController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], MotasController.prototype, "findOne", null);
__decorate([
    (0, common_1.Patch)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_mota_dto_1.UpdateMotaDto]),
    __metadata("design:returntype", void 0)
], MotasController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], MotasController.prototype, "remove", null);
exports.MotasController = MotasController = __decorate([
    (0, common_1.Controller)('motas'),
    __metadata("design:paramtypes", [motas_service_1.MotasService])
], MotasController);
//# sourceMappingURL=motas.controller.js.map