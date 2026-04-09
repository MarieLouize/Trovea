import { Controller, Get, Param } from '@nestjs/common';
import { MerchantsService } from './merchants.service';
import { Public } from '../auth/public.decorator';

@Controller('merchants')
export class MerchantsController {
  constructor(private readonly merchantsService: MerchantsService) {}

  @Public()
  @Get(':handle')
  async getByHandle(@Param('handle') handle: string) {
    return this.merchantsService.getByHandle(handle);
  }
}
