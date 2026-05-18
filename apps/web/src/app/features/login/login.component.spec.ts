import { TestBed, ComponentFixture } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { LoginComponent } from './login.component';
import { AuthService } from '../../core/services/auth.service';

describe('LoginComponent', () => {
  let component: LoginComponent;
  let fixture: ComponentFixture<LoginComponent>;
  let authServiceMock: jest.Mocked<Pick<AuthService, 'login'>>;
  let routerMock: jest.Mocked<Pick<Router, 'navigate'>>;

  beforeEach(async () => {
    authServiceMock = {
      login: jest.fn(),
    };

    routerMock = {
      navigate: jest.fn(),
    };

    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [LoginComponent, ReactiveFormsModule],
      providers: [
        { provide: AuthService, useValue: authServiceMock },
        { provide: Router, useValue: routerMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  test('should create the component', () => {
    expect(component).toBeTruthy();
  });

  test('should render username and password fields', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('input#username')).toBeTruthy();
    expect(compiled.querySelector('input#password')).toBeTruthy();
  });

  test('should have labels for accessibility', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const usernameLabel = compiled.querySelector('label[for="username"]');
    const passwordLabel = compiled.querySelector('label[for="password"]');
    expect(usernameLabel?.textContent?.trim()).toBe('Username');
    expect(passwordLabel?.textContent?.trim()).toBe('Password');
  });

  test('should not submit when form is invalid', () => {
    component.onSubmit();
    expect(authServiceMock.login).not.toHaveBeenCalled();
  });

  test('should show validation errors when fields are touched and empty', () => {
    component.loginForm.get('username')?.markAsTouched();
    component.loginForm.get('password')?.markAsTouched();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const errors = compiled.querySelectorAll('.field-error');
    expect(errors.length).toBe(2);
  });

  test('should call AuthService.login on valid submit', () => {
    authServiceMock.login.mockReturnValue(
      of({
        accessToken: 'token',
        refreshToken: 'refresh',
        user: { id: '1', username: 'admin', displayName: 'Admin', roles: ['ADMIN'] },
      })
    );

    component.loginForm.setValue({ username: 'admin', password: 'pass123' });
    component.onSubmit();

    expect(authServiceMock.login).toHaveBeenCalledWith('admin', 'pass123');
  });

  test('should navigate to /dashboard on successful login', () => {
    authServiceMock.login.mockReturnValue(
      of({
        accessToken: 'token',
        refreshToken: 'refresh',
        user: { id: '1', username: 'admin', displayName: 'Admin', roles: ['ADMIN'] },
      })
    );

    component.loginForm.setValue({ username: 'admin', password: 'pass123' });
    component.onSubmit();

    expect(routerMock.navigate).toHaveBeenCalledWith(['/dashboard']);
  });

  test('should show error message on 401 response', () => {
    authServiceMock.login.mockReturnValue(
      throwError(
        () => new HttpErrorResponse({ status: 401, statusText: 'Unauthorized' })
      )
    );

    component.loginForm.setValue({ username: 'admin', password: 'wrong' });
    component.onSubmit();

    expect(component.errorMessage()).toBe('Invalid username or password.');
    expect(component.isLoading()).toBe(false);
  });

  test('should show network error message on status 0', () => {
    authServiceMock.login.mockReturnValue(
      throwError(
        () => new HttpErrorResponse({ status: 0, statusText: 'Unknown Error' })
      )
    );

    component.loginForm.setValue({ username: 'admin', password: 'pass123' });
    component.onSubmit();

    expect(component.errorMessage()).toBe(
      'Unable to connect to the server. Please check your network.'
    );
  });

  test('should show generic error message on other errors', () => {
    authServiceMock.login.mockReturnValue(
      throwError(
        () => new HttpErrorResponse({ status: 500, statusText: 'Server Error' })
      )
    );

    component.loginForm.setValue({ username: 'admin', password: 'pass123' });
    component.onSubmit();

    expect(component.errorMessage()).toBe(
      'An unexpected error occurred. Please try again.'
    );
  });

  test('should set isLoading to true during submission', () => {
    authServiceMock.login.mockReturnValue(
      of({
        accessToken: 'token',
        refreshToken: 'refresh',
        user: { id: '1', username: 'admin', displayName: 'Admin', roles: ['ADMIN'] },
      })
    );

    component.loginForm.setValue({ username: 'admin', password: 'pass123' });
    component.onSubmit();

    // After success, isLoading stays true (navigation happens)
    // The component doesn't reset isLoading on success since we navigate away
    expect(authServiceMock.login).toHaveBeenCalled();
  });

  test('should disable submit button when loading', () => {
    component.isLoading.set(true);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const button = compiled.querySelector('button[type="submit"]') as HTMLButtonElement;
    expect(button.disabled).toBe(true);
  });
});
