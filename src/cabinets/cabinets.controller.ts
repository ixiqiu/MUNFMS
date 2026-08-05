import { Controller, Get, UseGuards } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cabinet } from '../entities/cabinet.entity';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@Controller('cabinets')
@UseGuards(JwtAuthGuard)
export class CabinetsController {
  constructor(
    @InjectRepository(Cabinet)
    private cabinetRepo: Repository<Cabinet>,
  ) {}

  @Get()
  async list() {
    const cabinets = await this.cabinetRepo.find({
      select: ['id', 'name', 'type'],
      order: { name: 'ASC' },
    });
    return { cabinets };
  }
}
