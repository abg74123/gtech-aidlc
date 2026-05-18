import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
} from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { HttpErrorResponse } from '@angular/common/http';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="login-container">
      <div class="login-card">
        <div class="login-header">
          <h1 id="login-title">Autoflow</h1>
          <p class="login-subtitle">Sign in to your account</p>
        </div>

        <form
          [formGroup]="loginForm"
          (ngSubmit)="onSubmit()"
          aria-labelledby="login-title"
          class="login-form"
        >
          <div class="form-field">
            <label for="username">Username</label>
            <input
              id="username"
              type="text"
              formControlName="username"
              autocomplete="username"
              [attr.aria-invalid]="isFieldInvalid('username')"
              aria-describedby="username-error"
              placeholder="Enter your username"
            />
            @if (isFieldInvalid('username')) {
              <span id="username-error" class="field-error" role="alert">
                Username is required.
              </span>
            }
          </div>

          <div class="form-field">
            <label for="password">Password</label>
            <input
              id="password"
              type="password"
              formControlName="password"
              autocomplete="current-password"
              [attr.aria-invalid]="isFieldInvalid('password')"
              aria-describedby="password-error"
              placeholder="Enter your password"
            />
            @if (isFieldInvalid('password')) {
              <span id="password-error" class="field-error" role="alert">
                Password is required.
              </span>
            }
          </div>

          @if (errorMessage()) {
            <div class="form-error" role="alert" aria-live="assertive">
              {{ errorMessage() }}
            </div>
          }

          <button
            type="submit"
            class="login-button"
            [disabled]="isLoading()"
            [attr.aria-busy]="isLoading()"
          >
            @if (isLoading()) {
              <span class="spinner" aria-hidden="true"></span>
              Signing in...
            } @else {
              Sign In
            }
          </button>
        </form>
      </div>
    </div>
  `,
  styles: [
    `
      .login-container {
        display: flex;
        align-items: center;
        justify-content: center;
        min-height: 100vh;
        background: #f3f4f6;
        padding: 1rem;
      }

      .login-card {
        width: 100%;
        max-width: 400px;
        background: #fff;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        padding: 2.5rem 2rem;
      }

      .login-header {
        text-align: center;
        margin-bottom: 2rem;

        h1 {
          margin: 0 0 0.5rem;
          font-size: 1.75rem;
          font-weight: 700;
          color: #1f2937;
        }
      }

      .login-subtitle {
        margin: 0;
        color: #6b7280;
        font-size: 0.95rem;
      }

      .login-form {
        display: flex;
        flex-direction: column;
        gap: 1.25rem;
      }

      .form-field {
        display: flex;
        flex-direction: column;
        gap: 0.375rem;

        label {
          font-size: 0.875rem;
          font-weight: 500;
          color: #374151;
        }

        input {
          padding: 0.625rem 0.75rem;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          font-size: 0.95rem;
          transition: border-color 0.2s;
          outline: none;

          &:focus {
            border-color: #3b82f6;
            box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);
          }

          &[aria-invalid='true'] {
            border-color: #ef4444;
          }

          &::placeholder {
            color: #9ca3af;
          }
        }
      }

      .field-error {
        font-size: 0.8rem;
        color: #ef4444;
      }

      .form-error {
        padding: 0.75rem;
        background: #fef2f2;
        border: 1px solid #fecaca;
        border-radius: 6px;
        color: #dc2626;
        font-size: 0.875rem;
        text-align: center;
      }

      .login-button {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0.5rem;
        padding: 0.75rem;
        background: #3b82f6;
        color: #fff;
        border: none;
        border-radius: 6px;
        font-size: 1rem;
        font-weight: 500;
        cursor: pointer;
        transition: background 0.2s;
        margin-top: 0.5rem;

        &:hover:not(:disabled) {
          background: #2563eb;
        }

        &:focus-visible {
          outline: 2px solid #3b82f6;
          outline-offset: 2px;
        }

        &:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }
      }

      .spinner {
        width: 1rem;
        height: 1rem;
        border: 2px solid rgba(255, 255, 255, 0.3);
        border-top-color: #fff;
        border-radius: 50%;
        animation: spin 0.6s linear infinite;
      }

      @keyframes spin {
        to {
          transform: rotate(360deg);
        }
      }
    `,
  ],
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly isLoading = signal(false);
  readonly errorMessage = signal<string | null>(null);

  loginForm: FormGroup = this.fb.group({
    username: ['', [Validators.required]],
    password: ['', [Validators.required]],
  });

  isFieldInvalid(field: string): boolean {
    const control = this.loginForm.get(field);
    return !!(control && control.invalid && control.touched);
  }

  onSubmit(): void {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);

    const { username, password } = this.loginForm.value;

    this.authService.login(username, password).subscribe({
      next: () => {
        this.router.navigate(['/dashboard']);
      },
      error: (err: HttpErrorResponse) => {
        this.isLoading.set(false);

        if (err.status === 401) {
          this.errorMessage.set('Invalid username or password.');
        } else if (err.status === 0) {
          this.errorMessage.set(
            'Unable to connect to the server. Please check your network.'
          );
        } else {
          this.errorMessage.set(
            'An unexpected error occurred. Please try again.'
          );
        }
      },
    });
  }
}
