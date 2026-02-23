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
exports.DeviceAuthGuard = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
let DeviceAuthGuard = class DeviceAuthGuard {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async canActivate(context) {
        const request = context.switchToHttp().getRequest();
        const rawDeviceId = request.headers['x-device-id'];
        const deviceToken = request.headers['x-device-token'];
        if (!rawDeviceId || !deviceToken) {
            throw new common_1.UnauthorizedException('Faltan las credenciales del dispositivo (X-Device-Id o X-Device-Token)');
        }
        const deviceId = parseInt(rawDeviceId, 10);
        if (isNaN(deviceId)) {
            throw new common_1.UnauthorizedException('El X-Device-Id debe ser un número válido');
        }
        const router = await this.prisma.router.findFirst({
            where: {
                id: deviceId,
                apiToken: deviceToken,
            },
        });
        if (!router) {
            throw new common_1.UnauthorizedException('Credenciales de dispositivo inválidas');
        }
        request.device = router;
        return true;
    }
};
exports.DeviceAuthGuard = DeviceAuthGuard;
exports.DeviceAuthGuard = DeviceAuthGuard = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], DeviceAuthGuard);
//# sourceMappingURL=device-auth.guard.js.map