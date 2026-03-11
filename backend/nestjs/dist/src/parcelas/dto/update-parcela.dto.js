"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateParcelaDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const create_parcela_dto_1 = require("./create-parcela.dto");
class UpdateParcelaDto extends (0, swagger_1.PartialType)(create_parcela_dto_1.CreateParcelaDto) {
}
exports.UpdateParcelaDto = UpdateParcelaDto;
//# sourceMappingURL=update-parcela.dto.js.map