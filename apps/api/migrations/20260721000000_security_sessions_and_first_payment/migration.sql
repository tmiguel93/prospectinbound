ALTER TABLE "User" ADD COLUMN "sessionVersion" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "Payment" ADD COLUMN "firstPaymentSaleId" TEXT;

CREATE UNIQUE INDEX "Payment_firstPaymentSaleId_key" ON "Payment"("firstPaymentSaleId");
