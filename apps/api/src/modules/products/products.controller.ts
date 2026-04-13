import { Controller, Get, Param } from '@nestjs/common';
import { ProductsService } from './products.service';
import { Public } from '../auth/public.decorator';

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Public()
  @Get('merchant/:merchantId')
  async getByMerchant(@Param('merchantId') merchantId: string) {
    return this.productsService.getByMerchant(merchantId);
  }

  @Public()
  @Get('merchant/:merchantId/collections')
  async getCollections(@Param('merchantId') merchantId: string) {
    return this.productsService.getCollections(merchantId);
  }

  @Public()
  @Get(':id')
  async getById(@Param('id') id: string) {
    return this.productsService.getById(id);
  }
}
