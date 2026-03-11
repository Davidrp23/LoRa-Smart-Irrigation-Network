"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MotasModule = void 0;
const common_1 = require("@nestjs/common");
const motas_service_1 = require("./motas.service");
const motas_controller_1 = require("./motas.controller");
const parcelas_module_1 = require("../parcelas/parcelas.module");
const routers_module_1 = require("../routers/routers.module");
let MotasModule = class MotasModule {
};
exports.MotasModule = MotasModule;
exports.MotasModule = MotasModule = __decorate([
    (0, common_1.Module)({
        imports: [parcelas_module_1.ParcelasModule, routers_module_1.RoutersModule],
        controllers: [motas_controller_1.MotasController],
        providers: [motas_service_1.MotasService],
        exports: [motas_service_1.MotasService],
    })
], MotasModule);
//# sourceMappingURL=motas.module.js.map