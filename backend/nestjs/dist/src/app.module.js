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
const big_packet_module_1 = require("./big-packet/big-packet.module");
const prisma_module_1 = require("./prisma/prisma.module");
const auth_module_1 = require("./auth/auth.module");
const tipo_cultivo_module_1 = require("./tipo-cultivo/tipo-cultivo.module");
const tipo_suelo_module_1 = require("./tipo-suelo/tipo-suelo.module");
const tipo_riego_module_1 = require("./tipo-riego/tipo-riego.module");
const turno_riego_module_1 = require("./turno-riego/turno-riego.module");
const schedule_1 = require("@nestjs/schedule");
const riego_service_1 = require("./irrigationAlgorithm/riego.service");
const clima_service_module_1 = require("./clima-service/clima-service.module");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [motas_module_1.MotasModule, usuarios_module_1.UsuariosModule, routers_module_1.RoutersModule, parcelas_module_1.ParcelasModule, big_packet_module_1.BigPacketModule, prisma_module_1.PrismaModule, auth_module_1.AuthModule, tipo_cultivo_module_1.TipoCultivoModule, tipo_suelo_module_1.TipoSueloModule, tipo_riego_module_1.TipoRiegoModule, turno_riego_module_1.TurnoRiegoModule,
            schedule_1.ScheduleModule.forRoot(), clima_service_module_1.ClimaServiceModule
        ],
        controllers: [app_controller_1.AppController],
        providers: [app_service_1.AppService, riego_service_1.RiegoService],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map