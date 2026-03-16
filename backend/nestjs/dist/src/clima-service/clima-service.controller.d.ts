import { ClimaServiceService } from './clima-service.service';
export declare class ClimaServiceController {
    private readonly climaServiceService;
    constructor(climaServiceService: ClimaServiceService);
    findOne(lat: number, long: number, timezone?: string): Promise<any>;
}
