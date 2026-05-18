import { TestBed, ComponentFixture } from '@angular/core/testing';
import { signal } from '@angular/core';
import { DashboardComponent } from './dashboard.component';
import { AuthService, AuthUser } from '../../core/services/auth.service';

describe('DashboardComponent', () => {
  let component: DashboardComponent;
  let fixture: ComponentFixture<DashboardComponent>;

  function createAuthServiceMock(user: AuthUser | null) {
    const userSignal = signal(user);
    const rolesSignal = signal(user?.roles ?? []);
    return {
      user: userSignal.asReadonly(),
      roles: rolesSignal.asReadonly(),
      isAuthenticated: signal(user !== null).asReadonly(),
    };
  }

  function setup(user: AuthUser | null) {
    const authServiceMock = createAuthServiceMock(user);

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [DashboardComponent],
      providers: [{ provide: AuthService, useValue: authServiceMock }],
    });

    fixture = TestBed.createComponent(DashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  test('should create the component', () => {
    setup({ id: '1', username: 'admin', displayName: 'Admin User', roles: ['ADMIN'] });
    expect(component).toBeTruthy();
  });

  test('should display welcome message with user display name', () => {
    setup({ id: '1', username: 'john', displayName: 'John Doe', roles: ['CASHIER'] });

    const compiled = fixture.nativeElement as HTMLElement;
    const title = compiled.querySelector('.welcome-title');
    expect(title?.textContent).toContain('John Doe');
  });

  test('should display fallback when user is null', () => {
    setup(null);

    const compiled = fixture.nativeElement as HTMLElement;
    const title = compiled.querySelector('.welcome-title');
    expect(title?.textContent).toContain('User');
  });

  test('should render stat cards', () => {
    setup({ id: '1', username: 'admin', displayName: 'Admin', roles: ['ADMIN'] });

    const compiled = fixture.nativeElement as HTMLElement;
    const statCards = compiled.querySelectorAll('.stat-card');
    expect(statCards.length).toBe(4);
  });

  test('should show role-based sections for ADMIN', () => {
    setup({ id: '1', username: 'admin', displayName: 'Admin', roles: ['ADMIN'] });

    const compiled = fixture.nativeElement as HTMLElement;
    const roleCards = compiled.querySelectorAll('.role-card');
    // ADMIN has access to all 6 sections
    expect(roleCards.length).toBe(6);
  });

  test('should show limited sections for CASHIER role', () => {
    setup({ id: '1', username: 'cashier', displayName: 'Cashier', roles: ['CASHIER'] });

    const compiled = fixture.nativeElement as HTMLElement;
    const roleCards = compiled.querySelectorAll('.role-card');
    // CASHIER only has access to "Sales & Invoicing"
    expect(roleCards.length).toBe(1);
    expect(roleCards[0].querySelector('.role-card-title')?.textContent).toBe(
      'Sales & Invoicing'
    );
  });

  test('should show correct sections for STORE role', () => {
    setup({ id: '1', username: 'store', displayName: 'Store Staff', roles: ['STORE'] });

    const compiled = fixture.nativeElement as HTMLElement;
    const roleCards = compiled.querySelectorAll('.role-card');
    // STORE has access to: Purchasing & Receiving, Warehouse Management
    expect(roleCards.length).toBe(2);
  });

  test('should show correct sections for SUPERVISOR role', () => {
    setup({ id: '1', username: 'sup', displayName: 'Supervisor', roles: ['SUPERVISOR'] });

    const compiled = fixture.nativeElement as HTMLElement;
    const roleCards = compiled.querySelectorAll('.role-card');
    // SUPERVISOR: Sales, Purchasing, Warehouse, Reports, Approvals = 5
    expect(roleCards.length).toBe(5);
  });

  test('should have accessible section labels', () => {
    setup({ id: '1', username: 'admin', displayName: 'Admin', roles: ['ADMIN'] });

    const compiled = fixture.nativeElement as HTMLElement;
    const welcomeSection = compiled.querySelector('[aria-label="Welcome"]');
    const statsSection = compiled.querySelector('[aria-label="Quick statistics"]');
    const modulesSection = compiled.querySelector('[aria-label="Your modules"]');

    expect(welcomeSection).toBeTruthy();
    expect(statsSection).toBeTruthy();
    expect(modulesSection).toBeTruthy();
  });
});
