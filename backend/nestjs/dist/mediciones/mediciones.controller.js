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
exports.MedicionesController = void 0;
const common_1 = require("@nestjs/common");
const mediciones_service_1 = require("./mediciones.service");
const create_medicione_dto_1 = require("./dto/create-medicione.dto");
const update_medicione_dto_1 = require("./dto/update-medicione.dto");
let MedicionesController = class MedicionesController {
    medicionesService;
    constructor(medicionesService) {
        this.medicionesService = medicionesService;
    }
    create(createMedicioneDto) {
        return this.medicionesService.create(createMedicioneDto);
    }
    findAll() {
        return this.medicionesService.findAll();
    }
    findOne(id) {
        return this.medicionesService.findOne(+id);
    }
    update(id, updateMedicioneDto) {
        return this.medicionesService.update(+id, updateMedicioneDto);
    }
    remove(id) {
        return this.medicionesService.remove(+id);
    }
};
exports.MedicionesController = MedicionesController;
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_medicione_dto_1.CreateMedicioneDto]),
    __metadata("design:returntype", void 0)
], MedicionesController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], MedicionesController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], MedicionesController.prototype, "findOne", null);
__decorate([
    (0, common_1.Patch)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_medicione_dto_1.UpdateMedicioneDto]),
    __metadata("design:returntype", void 0)
], MedicionesController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], MedicionesController.prototype, "remove", null);
exports.MedicionesController = MedicionesController = __decorate([
    (0, common_1.Controller)('mediciones'),
    __metadata("design:paramtypes", [mediciones_service_1.MedicionesService])
], MedicionesController);
//# sourceMappingURL=mediciones.controller.js.map