import { Component, computed, inject } from '@angular/core';
import { AuthService } from '../../core/services/auth.service';

interface StatCard {
  title: string;
  value: string;
  icon: string;
  description: string;
}

interface RoleSection {
  title: string;
  description: string;
  icon: string;
  roles: string[];
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent {
  private readonly authService = inject(AuthService);

  readonly user = this.authService.user;

  readonly stats: StatCard[] = [
    {
      title: 'Pending Orders',
      value: '—',
      icon: '📦',
      description: 'Awaiting processing',
    },
    {
      title: "Today's Transactions",
      value: '—',
      icon: '💰',
      description: 'Recorded today',
    },
    {
      title: 'Open AP Items',
      value: '—',
      icon: '📄',
      description: 'Accounts payable',
    },
    {
      title: 'Open AR Items',
      value: '—',
      icon: '📑',
      description: 'Accounts receivable',
    },
  ];

  private readonly roleSections: RoleSection[] = [
    {
      title: 'Sales & Invoicing',
      description:
        'Process Job Orders, issue invoices, manage delivery orders and AR receipts.',
      icon: '🧾',
      roles: ['CASHIER', 'SUPERVISOR', 'MANAGER', 'CFO', 'ADMIN'],
    },
    {
      title: 'Purchasing & Receiving',
      description:
        'Receive goods, record tax invoices, manage returns and AP payments.',
      icon: '🛒',
      roles: ['STORE', 'SUPERVISOR', 'MANAGER', 'CFO', 'ADMIN'],
    },
    {
      title: 'Warehouse Management',
      description:
        'Stock adjustments, transfers, cycle counts, and write-offs.',
      icon: '🏭',
      roles: ['STORE', 'SUPERVISOR', 'MANAGER', 'ADMIN'],
    },
    {
      title: 'Reports & Analytics',
      description:
        'View transaction reports, stock summaries, and financial overviews.',
      icon: '📈',
      roles: ['SUPERVISOR', 'MANAGER', 'CFO', 'ADMIN'],
    },
    {
      title: 'Master Data',
      description:
        'Manage products, suppliers, customers, and system configuration.',
      icon: '📋',
      roles: ['ADMIN', 'MANAGER', 'CFO'],
    },
    {
      title: 'Approvals',
      description:
        'Review and approve pending transactions, returns, and adjustments.',
      icon: '✅',
      roles: ['SUPERVISOR', 'MANAGER', 'CFO', 'ADMIN'],
    },
  ];

  readonly visibleSections = computed(() => {
    const userRoles = this.authService.roles();
    return this.roleSections.filter((section) =>
      section.roles.some((role) => userRoles.includes(role))
    );
  });
}
