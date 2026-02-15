"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateMotaDto = void 0;
const mapped_types_1 = require("@nestjs/mapped-types");
const create_mota_dto_1 = require("./create-mota.dto");
class UpdateMotaDto extends (0, mapped_types_1.PartialType)(create_mota_dto_1.CreateMotaDto) {
}
exports.UpdateMotaDto = UpdateMotaDto;
//# sourceMappingURL=update-mota.dto.js.map