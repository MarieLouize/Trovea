import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { SupabaseModule } from './common/supabase/supabase.module';
import { AuthModule } from './modules/auth/auth.module';
import { MerchantsModule } from './modules/merchants/merchants.module';
import { ProductsModule } from './modules/products/products.module';
import { ReceiptsModule } from './modules/receipts/receipts.module';
import { HoldsModule } from './modules/holds/holds.module';
import { ClaimsModule } from './modules/claims/claims.module';
import { BookingsModule } from './modules/bookings/bookings.module';
import { DropsModule } from './modules/drops/drops.module';
import { EnquiriesModule } from './modules/enquiries/enquiries.module';
import { AdminModule } from './modules/admin/admin.module';

@Module({
  imports: [SupabaseModule, AuthModule, MerchantsModule, ProductsModule, ReceiptsModule, HoldsModule, ClaimsModule, BookingsModule, DropsModule, EnquiriesModule, AdminModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
