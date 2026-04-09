import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
} from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { SupabaseService } from '../common/supabase/supabase.service';

@Injectable()
export class AdminGuard extends AuthGuard implements CanActivate {
  constructor(
    reflector: any,
    private readonly supabaseService: SupabaseService,
  ) {
    super(reflector);
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const canActivate = await super.canActivate(context);
    if (!canActivate) return false;

    const request = context.switchToHttp().getRequest();
    const userId = request.user; // sub from JWT

    // Verify admin role in DB for critical administrative actions
    const { data: profile, error } = await this.supabaseService
      .getClient()
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single();

    if (error || profile?.role !== 'admin') {
      throw new ForbiddenException('Admin access required');
    }

    return true;
  }
}
