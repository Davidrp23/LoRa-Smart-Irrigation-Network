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
exports.ClimaServiceController = void 0;
const common_1 = require("@nestjs/common");
const clima_service_service_1 = require("./clima-service.service");
const create_clima_service_dto_1 = require("./dto/create-clima-service.dto");
const update_clima_service_dto_1 = require("./dto/update-clima-service.dto");
let ClimaServiceController = class ClimaServiceController {
    climaServiceService;
    constructor(climaServiceService) {
        this.climaServiceService = climaServiceService;
    }
    create(createClimaServiceDto) {
        return this.climaServiceService.create(createClimaServiceDto);
    }
    findAll() {
        return this.climaServiceService.findAll();
    }
    findOne(id) {
        return this.climaServiceService.findOne(+id);
    }
    update(id, updateClimaServiceDto) {
        return this.climaServiceService.update(+id, updateClimaServiceDto);
    }
    remove(id) {
        return this.climaServiceService.remove(+id);
    }
};
exports.ClimaServiceController = ClimaServiceController;
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_clima_service_dto_1.CreateClimaServiceDto]),
    __metadata("design:returntype", void 0)
], ClimaServiceController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], ClimaServiceController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], ClimaServiceController.prototype, "findOne", null);
__decorate([
    (0, common_1.Patch)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_clima_service_dto_1.UpdateClimaServiceDto]),
    __metadata("design:returntype", void 0)
], ClimaServiceController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], ClimaServiceController.prototype, "remove", null);
exports.ClimaServiceController = ClimaServiceController = __decorate([
    (0, common_1.Controller)('clima-service'),
    __metadata("design:paramtypes", [clima_service_service_1.ClimaServiceService])
], ClimaServiceController);
//# sourceMappingURL=clima-service.controller.js.map