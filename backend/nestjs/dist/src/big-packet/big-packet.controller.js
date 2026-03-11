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
exports.BigPacketController = void 0;
const common_1 = require("@nestjs/common");
const big_packet_service_1 = require("./big-packet.service");
const big_packet_dto_1 = require("./dto/big-packet.dto");
const device_auth_guard_1 = require("../auth/guards/device-auth.guard");
const common_2 = require("@nestjs/common");
let BigPacketController = class BigPacketController {
    bigPacketService;
    constructor(bigPacketService) {
        this.bigPacketService = bigPacketService;
    }
    create(req, BigPacketDto) {
        const routerID = req.device.id;
        return this.bigPacketService.create(routerID, BigPacketDto);
    }
};
exports.BigPacketController = BigPacketController;
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_2.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, big_packet_dto_1.BigPacketDto]),
    __metadata("design:returntype", void 0)
], BigPacketController.prototype, "create", null);
exports.BigPacketController = BigPacketController = __decorate([
    (0, common_2.UseGuards)(device_auth_guard_1.DeviceAuthGuard),
    (0, common_1.Controller)('big-packet'),
    __metadata("design:paramtypes", [big_packet_service_1.BigPacketService])
], BigPacketController);
//# sourceMappingURL=big-packet.controller.js.map