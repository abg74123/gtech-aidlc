/**
 * Demo Seed — Alert Log
 *
 * Inserts sample alert_log entries so the Reports Dashboard
 * displays meaningful "alertsByCode" breakdown and "recentAlerts" rows.
 *
 * Run: npx tsx prisma/seed-alerts.ts
 */

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const connectionString =
  process.env['DATABASE_URL'] ??
  'postgresql://autoflow:autoflow_secret@localhost:6432/autoflow?schema=public';

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

interface DemoAlert {
  alertCode: string;
  alertMessage: string;
  txType: string;
  txData: Record<string, unknown>;
  itemId: string | null;
  warehouseId: string | null;
  period: string | null;
  userId: string;
  createdAtOffsetMinutes: number;
}

const DEMO_ALERTS: DemoAlert[] = [
  {
    alertCode: 'STOCK_NEGATIVE',
    alertMessage: 'สต็อกไม่เพียงพอ',
    txType: 'SALE_INVOICE',
    txData: { itemId: 'item-001', warehouseId: 'wh-001', qty: 100, available: 50 },
    itemId: 'item-001',
    warehouseId: 'wh-001',
    period: '2025-01',
    userId: 'cashier01',
    createdAtOffsetMinutes: -10,
  },
  {
    alertCode: 'PERIOD_LOCKED',
    alertMessage: 'งวดบัญชีถูกปิดแล้ว',
    txType: 'GR_RECEIVE',
    txData: { period: '2024-12', txType: 'GR_RECEIVE' },
    itemId: null,
    warehouseId: null,
    period: '2024-12',
    userId: 'store01',
    createdAtOffsetMinutes: -30,
  },
  {
    alertCode: 'DUPLICATE_INVOICE',
    alertMessage: 'ใบสั่งงานนี้มีใบแจ้งหนี้แล้ว',
    txType: 'SALE_INVOICE',
    txData: { refJoId: 'jo-001', txType: 'SALE_INVOICE' },
    itemId: null,
    warehouseId: null,
    period: '2025-01',
    userId: 'cashier01',
    createdAtOffsetMinutes: -60,
  },
  {
    alertCode: 'STOCK_NEGATIVE',
    alertMessage: 'สต็อกไม่เพียงพอ',
    txType: 'TEMP_DO',
    txData: { itemId: 'item-002', warehouseId: 'wh-002', qty: 25, available: 10 },
    itemId: 'item-002',
    warehouseId: 'wh-002',
    period: '2025-01',
    userId: 'cashier01',
    createdAtOffsetMinutes: -120,
  },
  {
    alertCode: 'CN_RETURN_INVENTORY',
    alertMessage: 'CN_RETURN ห้ามมีรายการสต็อก',
    txType: 'CN_RETURN',
    txData: { qty: 5, totalCost: 1500 },
    itemId: 'item-003',
    warehouseId: 'wh-001',
    period: '2025-01',
    userId: 'manager01',
    createdAtOffsetMinutes: -180,
  },
  {
    alertCode: 'INVOICE_FROM_DO_STOCK',
    alertMessage: 'INVOICE_FROM_DO ห้ามมีรายการสต็อก/AR',
    txType: 'INVOICE_FROM_DO',
    txData: { qty: 0, totalCost: 0, arAmount: 5000 },
    itemId: null,
    warehouseId: null,
    period: '2025-01',
    userId: 'cashier01',
    createdAtOffsetMinutes: -240,
  },
  {
    alertCode: 'STOCK_NEGATIVE',
    alertMessage: 'สต็อกไม่เพียงพอ',
    txType: 'GR_RETURN',
    txData: { itemId: 'item-001', warehouseId: 'wh-001', qty: 80, available: 50 },
    itemId: 'item-001',
    warehouseId: 'wh-001',
    period: '2025-01',
    userId: 'store01',
    createdAtOffsetMinutes: -360,
  },
  {
    alertCode: 'PERIOD_LOCKED',
    alertMessage: 'งวดบัญชีถูกปิดแล้ว',
    txType: 'AP_PAYMENT',
    txData: { period: '2024-11', txType: 'AP_PAYMENT' },
    itemId: null,
    warehouseId: null,
    period: '2024-11',
    userId: 'manager01',
    createdAtOffsetMinutes: -1440,
  },
];

async function main() {
  console.log('🌱 Seeding alert_log demo data...');

  // Clear existing demo entries (optional — comment out to keep history)
  await prisma.alertLog.deleteMany({});

  const now = Date.now();
  let inserted = 0;

  for (const alert of DEMO_ALERTS) {
    const createdAt = new Date(now + alert.createdAtOffsetMinutes * 60 * 1000);
    await prisma.alertLog.create({
      data: {
        alertCode: alert.alertCode,
        alertMessage: alert.alertMessage,
        txType: alert.txType,
        txData: alert.txData,
        itemId: alert.itemId,
        warehouseId: alert.warehouseId,
        period: alert.period,
        userId: alert.userId,
        createdAt,
      },
    });
    inserted++;
  }

  console.log(`✅ Inserted ${inserted} alert_log entries`);

  // Print summary
  const totalAlerts = await prisma.alertLog.count();
  const byCode = await prisma.alertLog.groupBy({
    by: ['alertCode'],
    _count: { alertCode: true },
  });

  console.log(`\n📊 Total alerts: ${totalAlerts}`);
  console.log('📊 Breakdown:');
  for (const g of byCode) {
    console.log(`   - ${g.alertCode}: ${g._count.alertCode}`);
  }
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
