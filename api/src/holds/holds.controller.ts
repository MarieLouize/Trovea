import { Controller, Get, Post, Patch, Param, Body, UseGuards } from '@nestjs/common';
import { HoldsService } from './holds.service';
import { Public } from '../auth/public.decorator';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';

@Controller('holds')
export class HoldsController {
  constructor(private readonly holdsService: HoldsService) {}

  @Public()
  @Post()
  async create(@Body() dto: any) {
    return this.holdsService.create(dto);
  }

  @Public()
  @Get('product/:productId')
  async getActiveForProduct(@Param('productId') productId: string) {
    return this.holdsService.getActiveForProduct(productId);
  }

  @UseGuards(AuthGuard)
  @Get()
  async getByMerchant(@CurrentUser() userId: string) {
    return this.holdsService.getByMerchant(userId);
  }

  @UseGuards(AuthGuard)
  @Patch(':id/release')
  async release(@Param('id') id: string, @CurrentUser() userId: string) {
    return this.holdsService.release(id, userId);
  }
}
