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
const common_2 = require("@nestjs/common");
const passport_1 = require("@nestjs/passport");
let ClimaServiceController = class ClimaServiceController {
    climaServiceService;
    constructor(climaServiceService) {
        this.climaServiceService = climaServiceService;
    }
    async findOne(lat, long, timezone) {
        return this.climaServiceService.findOne(lat, long, timezone || "auto");
    }
};
exports.ClimaServiceController = ClimaServiceController;
__decorate([
    (0, common_1.Get)(':lat/:long'),
    __param(0, (0, common_1.Param)('lat', common_1.ParseFloatPipe)),
    __param(1, (0, common_1.Param)('long', common_1.ParseFloatPipe)),
    __param(2, (0, common_1.Query)('timezone')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Number, String]),
    __metadata("design:returntype", Promise)
], ClimaServiceController.prototype, "findOne", null);
exports.ClimaServiceController = ClimaServiceController = __decorate([
    (0, common_2.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, common_1.Controller)('clima-service'),
    __metadata("design:paramtypes", [clima_service_service_1.ClimaServiceService])
], ClimaServiceController);
//# sourceMappingURL=clima-service.controller.js.map