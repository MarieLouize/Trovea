import { Module } from '@nestjs/common';
import { HoldsController } from './holds.controller';
import { HoldsService } from './holds.service';
import { MerchantsModule } from '../merchants/merchants.module';

@Module({
  imports: [MerchantsModule],
  controllers: [HoldsController],
  providers: [HoldsService],
})
export class HoldsModule {}
