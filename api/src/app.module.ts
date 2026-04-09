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
import { BookingsModule } from './bookings/bookings.module';
import { DropsModule } from './drops/drops.module';
import { EnquiriesModule } from './enquiries/enquiries.module';
import { AdminModule } from './admin/admin.module';

@Module({
  imports: [SupabaseModule, AuthModule, MerchantsModule, ProductsModule, ReceiptsModule, HoldsModule, ClaimsModule, BookingsModule, DropsModule, EnquiriesModule, AdminModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
