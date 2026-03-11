"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BigPacketModule = void 0;
const common_1 = require("@nestjs/common");
const big_packet_service_1 = require("./big-packet.service");
const big_packet_controller_1 = require("./big-packet.controller");
const parcelas_module_1 = require("../parcelas/parcelas.module");
let BigPacketModule = class BigPacketModule {
};
exports.BigPacketModule = BigPacketModule;
exports.BigPacketModule = BigPacketModule = __decorate([
    (0, common_1.Module)({
        imports: [parcelas_module_1.ParcelasModule],
        controllers: [big_packet_controller_1.BigPacketController],
        providers: [big_packet_service_1.BigPacketService],
    })
], BigPacketModule);
//# sourceMappingURL=big-packet.module.js.map