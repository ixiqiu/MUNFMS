import { Repository } from 'typeorm';
import { Cabinet } from '../entities/cabinet.entity';
export declare class CabinetsController {
    private cabinetRepo;
    constructor(cabinetRepo: Repository<Cabinet>);
    list(): Promise<{
        cabinets: Cabinet[];
    }>;
}
