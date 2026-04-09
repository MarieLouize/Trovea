import { Controller, Get, Param } from '@nestjs/common';
import { ReceiptsService } from './receipts.service';
import { Public } from '../auth/public.decorator';

@Controller('receipts')
export class ReceiptsController {
  constructor(private readonly receiptsService: ReceiptsService) {}

  @Public()
  @Get(':sealId')
  async getBySealId(@Param('sealId') sealId: string) {
    return this.receiptsService.getBySealId(sealId);
  }
}
