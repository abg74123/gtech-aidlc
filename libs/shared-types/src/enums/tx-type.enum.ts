/**
 * Transaction Type enum — all transaction types in the Autoflow system.
 * Each TX type determines system behavior for stock, AP/AR, MA, VAT, and COGS.
 */
export enum TxType {
  // ── Sales ──────────────────────────────────────────────
  /** ใบสั่งงาน — Job Order (no stock/AR impact) */
  JOB_ORDER = 'JOB_ORDER',
  /** ใบส่งสินค้าชั่วคราว — Temporary Delivery Order */
  TEMP_DO = 'TEMP_DO',
  /** Invoice จาก DO — formal tax document only */
  INVOICE_FROM_DO = 'INVOICE_FROM_DO',
  /** ใบเสร็จ(ตรง) — Direct Sale Invoice */
  SALE_INVOICE = 'SALE_INVOICE',
  /** ใบลดหนี้รับคืน — Credit Note: Sales Return */
  CN_SALES_RETURN = 'CN_SALES_RETURN',
  /** ใบลดหนี้(ยอดหนี้) — Credit Note: Sales Price Adjustment */
  CN_SALES_PRICE = 'CN_SALES_PRICE',
  /** ใบรับชำระ — AR Receipt */
  AR_RECEIVE = 'AR_RECEIVE',
  /** ใบลดหนี้ลูกหนี้(หนี้) — AR Credit Note (debt only) */
  AR_CN_DEBT = 'AR_CN_DEBT',
  /** ใบเพิ่มหนี้ลูกหนี้ — AR Debit Note */
  AR_DN = 'AR_DN',

  // ── Purchasing ─────────────────────────────────────────
  /** ใบรับสินค้า — Goods Receive */
  GR_RECEIVE = 'GR_RECEIVE',
  /** ใบส่งคืน — Goods Return to Supplier */
  GR_RETURN = 'GR_RETURN',
  /** รับสินค้าทดแทน — Goods Replacement */
  GR_REPLACEMENT = 'GR_REPLACEMENT',
  /** ใบลดหนี้(จากส่งคืน) — CN from Return */
  CN_RETURN = 'CN_RETURN',
  /** ใบลดหนี้ตามใบเสร็จ(ราคาผิด) — CN Price Adjustment */
  CN_PRICE_ADJ = 'CN_PRICE_ADJ',
  /** ใบลดหนี้(ยอดหนี้) — AP Credit Note (debt only) */
  AP_CN_DEBT = 'AP_CN_DEBT',
  /** ใบจ่ายชำระ — AP Payment */
  AP_PAYMENT = 'AP_PAYMENT',
  /** ใบเพิ่มหนี้เจ้าหนี้ — AP Debit Note */
  AP_DN = 'AP_DN',
  /** ใบเพิ่มหนี้ตามใบเสร็จ — AP Debit Note with stock */
  AP_DN_REF = 'AP_DN_REF',

  // ── Warehouse / Adjustments ────────────────────────────
  /** ตรวจนับ/ปรับปรุง(เพิ่ม) — Stock Count Up */
  ADJ_COUNT_UP = 'ADJ_COUNT_UP',
  /** ตรวจนับ/ปรับปรุง(ลด) — Stock Count Down */
  ADJ_COUNT_DOWN = 'ADJ_COUNT_DOWN',
  /** ลดมูลค่าสินค้า — Write-down */
  ADJ_WRITEDOWN = 'ADJ_WRITEDOWN',
  /** ตัดจำหน่าย — Write-off */
  ADJ_WRITEOFF = 'ADJ_WRITEOFF',
  /** โอนย้ายสินค้า — Transfer between warehouses */
  ADJ_TRANSFER = 'ADJ_TRANSFER',
  /** จัดประเภทใหม่ — Reclassification */
  ADJ_RECLASS = 'ADJ_RECLASS',
  /** ปรับต้นทุน — Cost Adjustment (Landed Cost) */
  ADJ_COST = 'ADJ_COST',
  /** เบิกวัสดุ — Supply Issue */
  SUPPLY_ISSUE = 'SUPPLY_ISSUE',

  // ── Other ──────────────────────────────────────────────
  /** ภาษีหัก ณ ที่จ่าย — Withholding Tax Record */
  WHT_RECORD = 'WHT_RECORD',
  /** รับเช็ค — Cheque Receive */
  CHEQUE_RECEIVE = 'CHEQUE_RECEIVE',
  /** บันทึกค่าใช้จ่าย — Expense Record */
  EXPENSE_RECORD = 'EXPENSE_RECORD',
  /** ยกเลิก TX — Void (creates reverse TX) */
  VOID = 'VOID',
}
