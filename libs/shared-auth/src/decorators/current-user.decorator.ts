import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AuthContext } from '@autoflow/shared-types';

/**
 * Parameter decorator that extracts the authenticated user (AuthContext)
 * from the request object.
 *
 * Requires JwtAuthGuard to be applied on the route.
 *
 * @example
 * ```ts
 * @UseGuards(JwtAuthGuard)
 * @Get('me')
 * getProfile(@CurrentUser() user: AuthContext) {
 *   return user;
 * }
 * ```
 */
export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): AuthContext => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
