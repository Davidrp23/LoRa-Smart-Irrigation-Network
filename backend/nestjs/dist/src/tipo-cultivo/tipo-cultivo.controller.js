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
exports.TipoCultivoController = void 0;
const common_1 = require("@nestjs/common");
const tipo_cultivo_service_1 = require("./tipo-cultivo.service");
const passport_1 = require("@nestjs/passport");
const common_2 = require("@nestjs/common");
let TipoCultivoController = class TipoCultivoController {
    tipoCultivoService;
    constructor(tipoCultivoService) {
        this.tipoCultivoService = tipoCultivoService;
    }
    async findAll() {
        return this.tipoCultivoService.findAll();
    }
};
exports.TipoCultivoController = TipoCultivoController;
__decorate([
    (0, common_1.Get)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], TipoCultivoController.prototype, "findAll", null);
exports.TipoCultivoController = TipoCultivoController = __decorate([
    (0, common_2.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, common_1.Controller)('tipo-cultivo'),
    __metadata("design:paramtypes", [tipo_cultivo_service_1.TipoCultivoService])
], TipoCultivoController);
//# sourceMappingURL=tipo-cultivo.controller.js.map