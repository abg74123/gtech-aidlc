import { JwtAuthGuard } from './jwt-auth.guard';
import { AuthGuard } from '@nestjs/passport';

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;

  beforeEach(() => {
    guard = new JwtAuthGuard();
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  it('should extend AuthGuard with jwt strategy', () => {
    // JwtAuthGuard extends AuthGuard('jwt'), which is a mixin class
    const authGuardInstance = new (AuthGuard('jwt'))();
    expect(guard).toBeInstanceOf(authGuardInstance.constructor);
  });

  it('should be an instance of JwtAuthGuard', () => {
    expect(guard).toBeInstanceOf(JwtAuthGuard);
  });
});
