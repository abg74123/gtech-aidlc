-- CreateTable
CREATE TABLE "reports"."alert_log" (
    "id" UUID NOT NULL,
    "alert_code" TEXT NOT NULL,
    "alert_message" TEXT NOT NULL,
    "tx_type" TEXT NOT NULL,
    "tx_data" JSONB NOT NULL,
    "item_id" TEXT,
    "warehouse_id" TEXT,
    "period" TEXT,
    "user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "alert_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_alert_log_code_created" ON "reports"."alert_log"("alert_code", "created_at");

-- CreateIndex
CREATE INDEX "idx_alert_log_user" ON "reports"."alert_log"("user_id");

-- CreateIndex
CREATE INDEX "idx_alert_log_tx_type" ON "reports"."alert_log"("tx_type");

-- CreateIndex
CREATE INDEX "idx_alert_log_created" ON "reports"."alert_log"("created_at");
