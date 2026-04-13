import { Controller, Get, Post, Patch, Param, Body, UseGuards } from '@nestjs/common';
import { EnquiriesService } from './enquiries.service';
import { Public } from '../auth/public.decorator';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';

@Controller('enquiries')
export class EnquiriesController {
  constructor(private readonly enquiriesService: EnquiriesService) {}

  @Public()
  @Post()
  async create(@Body() dto: any) {
    return this.enquiriesService.create(dto);
  }

  @UseGuards(AuthGuard)
  @Get()
  async getByMerchant(@CurrentUser() userId: string) {
    return this.enquiriesService.getByMerchant(userId);
  }

  @UseGuards(AuthGuard)
  @Patch(':id/status')
  async updateStatus(
    @Param('id') id: string,
    @Body('status') status: string,
    @CurrentUser() userId: string,
  ) {
    return this.enquiriesService.updateStatus(id, status, userId);
  }
}
