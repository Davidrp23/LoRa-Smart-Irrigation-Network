"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateMedicioneDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const create_medicione_dto_1 = require("./create-medicione.dto");
class UpdateMedicioneDto extends (0, swagger_1.PartialType)(create_medicione_dto_1.CreateMedicioneDto) {
}
exports.UpdateMedicioneDto = UpdateMedicioneDto;
//# sourceMappingURL=update-medicione.dto.js.map