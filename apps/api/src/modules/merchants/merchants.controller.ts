import { Controller, Get, Patch, Param, Body, UseGuards } from '@nestjs/common';
import { MerchantsService } from './merchants.service';
import { Public } from '../auth/public.decorator';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';

@Controller('merchants')
export class MerchantsController {
  constructor(private readonly merchantsService: MerchantsService) {}

  @Public()
  @Get(':handle')
  async getByHandle(@Param('handle') handle: string) {
    return this.merchantsService.getByHandle(handle);
  }

  @UseGuards(AuthGuard)
  @Get('me')
  async getMe(@CurrentUser() userId: string) {
    return this.merchantsService.getByOwnerId(userId);
  }

  @UseGuards(AuthGuard)
  @Patch('me')
  async updateMe(@CurrentUser() userId: string, @Body() dto: any) {
    return this.merchantsService.update(userId, dto);
  }
}
