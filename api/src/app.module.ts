import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { SupabaseModule } from './common/supabase/supabase.module';
import { AuthModule } from './auth/auth.module';
import { MerchantsModule } from './merchants/merchants.module';
import { ProductsModule } from './products/products.module';
import { ReceiptsModule } from './receipts/receipts.module';

@Module({
  imports: [SupabaseModule, AuthModule, MerchantsModule, ProductsModule, ReceiptsModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
