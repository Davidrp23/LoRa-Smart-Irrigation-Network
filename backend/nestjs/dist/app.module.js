"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const app_controller_1 = require("./app.controller");
const app_service_1 = require("./app.service");
const motas_module_1 = require("./motas/motas.module");
const usuarios_module_1 = require("./usuarios/usuarios.module");
const routers_module_1 = require("./routers/routers.module");
const parcelas_module_1 = require("./parcelas/parcelas.module");
const mediciones_module_1 = require("./mediciones/mediciones.module");
const big_packet_module_1 = require("./big-packet/big-packet.module");
const prisma_module_1 = require("./prisma/prisma.module");
const auth_module_1 = require("./auth/auth.module");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [motas_module_1.MotasModule, usuarios_module_1.UsuariosModule, routers_module_1.RoutersModule, parcelas_module_1.ParcelasModule, mediciones_module_1.MedicionesModule, big_packet_module_1.BigPacketModule, prisma_module_1.PrismaModule, auth_module_1.AuthModule],
        controllers: [app_controller_1.AppController],
        providers: [app_service_1.AppService],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map