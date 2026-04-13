import { Controller, Get, Post, Patch, Param, Body, UseGuards, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ClaimsService } from './claims.service';
import { Public } from '../auth/public.decorator';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';

@Controller('claims')
export class ClaimsController {
  constructor(private readonly claimsService: ClaimsService) {}

  @Public()
  @Post()
  async create(@Body() dto: any) {
    return this.claimsService.create(dto);
  }

  @Public()
  @Get('product/:productId')
  async getPendingForProduct(@Param('productId') productId: string) {
    return this.claimsService.getPendingForProduct(productId);
  }

  @UseGuards(AuthGuard)
  @Get()
  async getByMerchant(@CurrentUser() userId: string) {
    return this.claimsService.getByMerchant(userId);
  }

  @UseGuards(AuthGuard)
  @Patch(':id/status')
  async updateStatus(
    @Param('id') id: string,
    @Body('status') status: string,
    @CurrentUser() userId: string,
  ) {
    return this.claimsService.updateStatus(id, status, userId);
  }

  @Public()
  @Post(':id/proof')
  @UseInterceptors(FileInterceptor('file'))
  async uploadProof(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.claimsService.uploadProof(id, file);
  }
}
