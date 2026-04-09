import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { SupabaseModule } from './common/supabase/supabase.module';
import { AuthModule } from './auth/auth.module';
import { MerchantsModule } from './merchants/merchants.module';
import { ProductsModule } from './products/products.module';
import { ReceiptsModule } from './receipts/receipts.module';
import { HoldsModule } from './holds/holds.module';
import { ClaimsModule } from './claims/claims.module';

@Module({
  imports: [SupabaseModule, AuthModule, MerchantsModule, ProductsModule, ReceiptsModule, HoldsModule, ClaimsModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
