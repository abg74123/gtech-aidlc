import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NavComponent } from '../nav/nav.component';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [RouterOutlet, NavComponent],
  template: `
    <div class="layout">
      <!-- Header -->
      <header class="header">
        <div class="header-brand">
          <h1 class="header-title">Autoflow</h1>
        </div>
        <div class="header-user">
          @if (authService.user(); as user) {
            <span class="user-name">{{ user.displayName }}</span>
            <span class="user-roles">{{ user.roles.join(', ') }}</span>
          }
          <button class="btn-logout" (click)="authService.logout()" aria-label="Logout">
            Logout
          </button>
        </div>
      </header>

      <div class="layout-body">
        <!-- Sidebar -->
        <aside class="sidebar" role="complementary">
          <app-nav />
        </aside>

        <!-- Main Content -->
        <main class="content" role="main">
          <router-outlet />
        </main>
      </div>
    </div>
  `,
  styles: [
    `
      .layout {
        display: flex;
        flex-direction: column;
        height: 100vh;
      }

      .header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0 24px;
        height: 56px;
        background-color: #1a237e;
        color: #ffffff;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        z-index: 100;
      }

      .header-title {
        font-size: 20px;
        font-weight: 600;
        margin: 0;
      }

      .header-user {
        display: flex;
        align-items: center;
        gap: 12px;
      }

      .user-name {
        font-weight: 500;
      }

      .user-roles {
        font-size: 12px;
        opacity: 0.8;
      }

      .btn-logout {
        padding: 6px 12px;
        border: 1px solid rgba(255, 255, 255, 0.5);
        border-radius: 4px;
        background: transparent;
        color: #ffffff;
        cursor: pointer;
        font-size: 13px;

        &:hover {
          background-color: rgba(255, 255, 255, 0.1);
        }
      }

      .layout-body {
        display: flex;
        flex: 1;
        overflow: hidden;
      }

      .sidebar {
        width: 240px;
        background-color: #283593;
        overflow-y: auto;
        flex-shrink: 0;
      }

      .content {
        flex: 1;
        overflow-y: auto;
        background-color: #f5f5f5;
      }
    `,
  ],
})
export class LayoutComponent {
  readonly authService = inject(AuthService);
}
