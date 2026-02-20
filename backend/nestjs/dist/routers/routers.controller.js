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
exports.RoutersController = void 0;
const common_1 = require("@nestjs/common");
const routers_service_1 = require("./routers.service");
const create_router_dto_1 = require("./dto/create-router.dto");
const update_router_dto_1 = require("./dto/update-router.dto");
const vincular_router_dto_1 = require("./dto/vincular-router.dto");
const common_2 = require("@nestjs/common");
const passport_1 = require("@nestjs/passport");
let RoutersController = class RoutersController {
    routersService;
    constructor(routersService) {
        this.routersService = routersService;
    }
    async create(createRouterDto) {
        return this.routersService.create(createRouterDto);
    }
    async vincularRouter(req, vincularRouterDto) {
        return this.routersService.vincularRouter(req.user.id, vincularRouterDto);
    }
    async findAll() {
        return this.routersService.findAll();
    }
    async findOne(id) {
        return this.routersService.findOne(id);
    }
    isPublic(id) {
        return this.routersService.isPublic(id);
    }
    async update(id, updateRouterDto) {
        return this.routersService.update(id, updateRouterDto);
    }
    async remove(id) {
        return this.routersService.remove(id);
    }
};
exports.RoutersController = RoutersController;
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_router_dto_1.CreateRouterDto]),
    __metadata("design:returntype", Promise)
], RoutersController.prototype, "create", null);
__decorate([
    (0, common_2.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, common_1.Post)('vincular/'),
    __param(0, (0, common_2.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, vincular_router_dto_1.VincularRouterDto]),
    __metadata("design:returntype", Promise)
], RoutersController.prototype, "vincularRouter", null);
__decorate([
    (0, common_1.Get)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], RoutersController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", Promise)
], RoutersController.prototype, "findOne", null);
__decorate([
    (0, common_1.Get)('esPublico/:id'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", void 0)
], RoutersController.prototype, "isPublic", null);
__decorate([
    (0, common_1.Patch)(':id'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, update_router_dto_1.UpdateRouterDto]),
    __metadata("design:returntype", Promise)
], RoutersController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", Promise)
], RoutersController.prototype, "remove", null);
exports.RoutersController = RoutersController = __decorate([
    (0, common_1.Controller)('routers'),
    __metadata("design:paramtypes", [routers_service_1.RoutersService])
], RoutersController);
//# sourceMappingURL=routers.controller.js.map