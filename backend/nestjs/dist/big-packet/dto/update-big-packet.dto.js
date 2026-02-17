"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateBigPacketDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const create_big_packet_dto_1 = require("./create-big-packet.dto");
class UpdateBigPacketDto extends (0, swagger_1.PartialType)(create_big_packet_dto_1.CreateBigPacketDto) {
}
exports.UpdateBigPacketDto = UpdateBigPacketDto;
//# sourceMappingURL=update-big-packet.dto.js.map