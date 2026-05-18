import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Guard that enforces JWT authentication.
 * Extends Passport's AuthGuard with the 'jwt' strategy.
 * Apply to routes/controllers that require an authenticated user.
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
