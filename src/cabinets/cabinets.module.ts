import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Cabinet } from '../entities/cabinet.entity';
import { CabinetsController } from './cabinets.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Cabinet])],
  controllers: [CabinetsController],
})
export class CabinetsModule {}
