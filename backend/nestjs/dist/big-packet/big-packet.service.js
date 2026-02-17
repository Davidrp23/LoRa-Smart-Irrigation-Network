"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BigPacketService = void 0;
const common_1 = require("@nestjs/common");
let BigPacketService = class BigPacketService {
    create(createBigPacketDto) {
        return 'This action adds a new bigPacket';
    }
    findAll() {
        return `This action returns all bigPacket`;
    }
    findOne(id) {
        return `This action returns a #${id} bigPacket`;
    }
    update(id, updateBigPacketDto) {
        return `This action updates a #${id} bigPacket`;
    }
    remove(id) {
        return `This action removes a #${id} bigPacket`;
    }
};
exports.BigPacketService = BigPacketService;
exports.BigPacketService = BigPacketService = __decorate([
    (0, common_1.Injectable)()
], BigPacketService);
//# sourceMappingURL=big-packet.service.js.map