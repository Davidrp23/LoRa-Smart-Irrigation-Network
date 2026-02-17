"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ParcelasService = void 0;
const common_1 = require("@nestjs/common");
let ParcelasService = class ParcelasService {
    create(createParcelaDto) {
        return 'This action adds a new parcela';
    }
    findAll() {
        return `This action returns all parcelas`;
    }
    findOne(id) {
        return `This action returns a #${id} parcela`;
    }
    update(id, updateParcelaDto) {
        return `This action updates a #${id} parcela`;
    }
    remove(id) {
        return `This action removes a #${id} parcela`;
    }
};
exports.ParcelasService = ParcelasService;
exports.ParcelasService = ParcelasService = __decorate([
    (0, common_1.Injectable)()
], ParcelasService);
//# sourceMappingURL=parcelas.service.js.map