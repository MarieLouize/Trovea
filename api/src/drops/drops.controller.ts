import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { DropsService } from './drops.service';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';

@Controller('drops')
export class DropsController {
  constructor(private readonly dropsService: DropsService) {}

  @UseGuards(AuthGuard)
  @Get()
  async getByMerchant(@CurrentUser() userId: string) {
    return this.dropsService.getByMerchant(userId);
  }

  @UseGuards(AuthGuard)
  @Post()
  async create(@Body() dto: any, @CurrentUser() userId: string) {
    return this.dropsService.create(dto, userId);
  }

  @UseGuards(AuthGuard)
  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: any, @CurrentUser() userId: string) {
    return this.dropsService.update(id, dto, userId);
  }

  @UseGuards(AuthGuard)
  @Delete(':id')
  async delete(@Param('id') id: string, @CurrentUser() userId: string) {
    return this.dropsService.delete(id, userId);
  }
}
