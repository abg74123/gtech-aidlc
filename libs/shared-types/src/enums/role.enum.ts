/**
 * User roles for RBAC authorization.
 * Each role has different approval authorities and menu access.
 */
export enum Role {
  /** Cashier — processes Job Orders, issues invoices, receives AR */
  CASHIER = 'CASHIER',
  /** Store Staff — receives goods, records tax invoices */
  STORE = 'STORE',
  /** Supervisor — approves returns, transfers, stock adjustments */
  SUPERVISOR = 'SUPERVISOR',
  /** Manager — approves Credit Notes, AP payments, VOIDs */
  MANAGER = 'MANAGER',
  /** CFO — approves write-offs, cost adjustments, period closing */
  CFO = 'CFO',
  /** Admin — system configuration, master data, user management */
  ADMIN = 'ADMIN',
}
