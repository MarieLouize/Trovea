import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { BookingsService } from './bookings.service';
import { Public } from '../auth/public.decorator';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';

@Controller()
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @UseGuards(AuthGuard)
  @Get('bookings')
  async getByMerchant(@CurrentUser() userId: string) {
    return this.bookingsService.getByMerchant(userId);
  }

  @Public()
  @Post('bookings')
  async create(@Body() dto: any) {
    return this.bookingsService.create(dto);
  }

  @UseGuards(AuthGuard)
  @Patch('bookings/:id')
  async update(@Param('id') id: string, @Body() dto: any, @CurrentUser() userId: string) {
    return this.bookingsService.update(id, dto, userId);
  }

  @UseGuards(AuthGuard)
  @Get('windows')
  async getWindowsByMerchant(@CurrentUser() userId: string) {
    return this.bookingsService.getWindowsByMerchant(userId);
  }

  @UseGuards(AuthGuard)
  @Post('windows')
  async createWindow(@Body() dto: any, @CurrentUser() userId: string) {
    return this.bookingsService.createWindow(dto, userId);
  }

  @UseGuards(AuthGuard)
  @Patch('windows/:id')
  async updateWindow(@Param('id') id: string, @Body() dto: any, @CurrentUser() userId: string) {
    return this.bookingsService.updateWindow(id, dto, userId);
  }

  @UseGuards(AuthGuard)
  @Delete('windows/:id')
  async deleteWindow(@Param('id') id: string, @CurrentUser() userId: string) {
    return this.bookingsService.deleteWindow(id, userId);
  }

  @Public()
  @Get('windows/merchant/:merchantId/open')
  async getOpenWindows(@Param('merchantId') merchantId: string) {
    return this.bookingsService.getOpenWindows(merchantId);
  }
}
