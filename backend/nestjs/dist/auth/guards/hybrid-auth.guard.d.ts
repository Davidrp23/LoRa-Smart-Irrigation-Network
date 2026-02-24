import { ExecutionContext } from '@nestjs/common';
import { DeviceAuthGuard } from './device-auth.guard';
declare const HybridAuthGuard_base: import("@nestjs/passport").Type<import("@nestjs/passport").IAuthGuard>;
export declare class HybridAuthGuard extends HybridAuthGuard_base {
    private readonly deviceAuthGuard;
    constructor(deviceAuthGuard: DeviceAuthGuard);
    canActivate(context: ExecutionContext): Promise<boolean>;
}
export {};
