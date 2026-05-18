import { Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

export interface NavItem {
  label: string;
  path: string;
  icon: string;
  roles: string[];
}

const NAV_ITEMS: NavItem[] = [
  {
    label: 'Dashboard',
    path: '/dashboard',
    icon: '📊',
    roles: ['CASHIER', 'STORE', 'SUPERVISOR', 'MANAGER', 'CFO', 'ADMIN'],
  },
  {
    label: 'Master Data',
    path: '/master-data',
    icon: '📋',
    roles: ['ADMIN', 'MANAGER', 'CFO'],
  },
  {
    label: 'Transactions',
    path: '/transactions',
    icon: '💰',
    roles: ['CASHIER', 'STORE', 'SUPERVISOR', 'MANAGER', 'CFO', 'ADMIN'],
  },
  {
    label: 'Warehouse',
    path: '/warehouse',
    icon: '🏭',
    roles: ['STORE', 'SUPERVISOR', 'MANAGER', 'ADMIN'],
  },
  {
    label: 'Reports',
    path: '/reports',
    icon: '📈',
    roles: ['SUPERVISOR', 'MANAGER', 'CFO', 'ADMIN'],
  },
];

@Component({
  selector: 'app-nav',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  template: `
    <nav class="nav" role="navigation" aria-label="Main navigation">
      <ul class="nav-list">
        @for (item of visibleItems(); track item.path) {
          <li class="nav-item">
            <a
              [routerLink]="item.path"
              routerLinkActive="active"
              class="nav-link"
              [attr.aria-label]="item.label"
            >
              <span class="nav-icon">{{ item.icon }}</span>
              <span class="nav-label">{{ item.label }}</span>
            </a>
          </li>
        }
      </ul>
    </nav>
  `,
  styles: [
    `
      .nav {
        padding: 16px 0;
      }

      .nav-list {
        list-style: none;
        padding: 0;
        margin: 0;
      }

      .nav-item {
        margin-bottom: 4px;
      }

      .nav-link {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 10px 20px;
        color: #e0e0e0;
        border-radius: 4px;
        margin: 0 8px;
        transition: background-color 0.2s;

        &:hover {
          background-color: rgba(255, 255, 255, 0.1);
        }

        &.active {
          background-color: rgba(255, 255, 255, 0.15);
          color: #ffffff;
          font-weight: 500;
        }
      }

      .nav-icon {
        font-size: 18px;
        width: 24px;
        text-align: center;
      }

      .nav-label {
        font-size: 14px;
      }
    `,
  ],
})
export class NavComponent {
  private readonly authService = inject(AuthService);

  readonly visibleItems = computed(() => {
    const userRoles = this.authService.roles();
    return NAV_ITEMS.filter((item) =>
      item.roles.some((role) => userRoles.includes(role))
    );
  });
}
