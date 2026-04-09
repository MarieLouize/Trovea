import { Module } from '@nestjs/common';
import { DropsController } from './drops.controller';
import { DropsService } from './drops.service';
import { MerchantsModule } from '../merchants/merchants.module';

@Module({
  imports: [MerchantsModule],
  controllers: [DropsController],
  providers: [DropsService]
})
export class DropsModule {}
