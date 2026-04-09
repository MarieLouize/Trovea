import { Controller, Get, Patch, Param, Body, Query, UseGuards } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminGuard } from './admin.guard';
import { CurrentUser } from '../auth/current-user.decorator';

@Controller('admin')
@UseGuards(AdminGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('merchants')
  async getAllMerchants(@Query('suspended') suspended?: string) {
    return this.adminService.getAllMerchants(suspended === 'true');
  }

  @Patch('merchants/:id/suspend')
  async suspendMerchant(
    @Param('id') id: string,
    @Body('note') note: string,
    @CurrentUser() adminId: string,
  ) {
    return this.adminService.suspendMerchant(id, note, adminId);
  }

  @Patch('merchants/:id/unsuspend')
  async unsuspendMerchant(
    @Param('id') id: string,
    @CurrentUser() adminId: string,
  ) {
    return this.adminService.unsuspendMerchant(id, adminId);
  }

  @Patch('merchants/:id/tier')
  async setMerchantTier(
    @Param('id') id: string,
    @Body('tier') tier: string,
    @CurrentUser() adminId: string,
  ) {
    return this.adminService.setMerchantTier(id, tier, adminId);
  }

  @Get('reports')
  async getReports() {
    return this.adminService.getReports();
  }

  @Get('log')
  async getAdminLog(@Query('limit') limit?: string) {
    return this.adminService.getAdminLog(limit ? parseInt(limit) : 100);
  }
}
