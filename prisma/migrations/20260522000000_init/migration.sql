-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'MANAGER', 'SALES', 'SERVICE', 'READ_ONLY');

-- CreateEnum
CREATE TYPE "InventoryStatus" AS ENUM ('AVAILABLE', 'ON_HOLD', 'IN_SERVICE', 'SOLD', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "Condition" AS ENUM ('NEW', 'USED');

-- CreateEnum
CREATE TYPE "FuelType" AS ENUM ('ELECTRIC', 'LP_GAS', 'DIESEL', 'GASOLINE', 'DUAL_FUEL', 'HYDROGEN');

-- CreateEnum
CREATE TYPE "TireType" AS ENUM ('CUSHION', 'PNEUMATIC', 'SOLID_PNEUMATIC');

-- CreateEnum
CREATE TYPE "ForkliftClass" AS ENUM ('CLASS_I', 'CLASS_II', 'CLASS_III', 'CLASS_IV', 'CLASS_V', 'CLASS_VI', 'CLASS_VII');

-- CreateEnum
CREATE TYPE "SaleType" AS ENUM ('CASH', 'FINANCED', 'LEASED', 'RENTAL', 'TRADE_IN');

-- CreateEnum
CREATE TYPE "AttachmentKind" AS ENUM ('PHOTO', 'DATA_CARD', 'INVOICE', 'DOCUMENT', 'OTHER');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('CREATE', 'UPDATE', 'DELETE', 'RESTORE', 'LOGIN', 'LOGIN_FAILED', 'LOGOUT', 'PASSWORD_CHANGE', 'EXPORT', 'UPLOAD', 'OCR');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'READ_ONLY',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" TIMESTAMP(3),
    "failedLogins" INTEGER NOT NULL DEFAULT 0,
    "lockedUntil" TIMESTAMP(3),
    "mustChangePwd" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Forklift" (
    "id" TEXT NOT NULL,
    "stockNumber" TEXT NOT NULL,
    "status" "InventoryStatus" NOT NULL DEFAULT 'AVAILABLE',
    "condition" "Condition" NOT NULL,
    "make" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "year" INTEGER,
    "serialNumber" TEXT,
    "fuelType" "FuelType",
    "forkliftClass" "ForkliftClass",
    "capacityLbs" INTEGER,
    "mastType" TEXT,
    "mastLoweredIn" INTEGER,
    "mastRaisedIn" INTEGER,
    "sideShift" BOOLEAN NOT NULL DEFAULT false,
    "attachments" TEXT,
    "hours" INTEGER,
    "tireType" "TireType",
    "batteryVolts" INTEGER,
    "color" TEXT,
    "yardLocation" TEXT,
    "acquisitionDate" TIMESTAMP(3),
    "acquisitionCost" DECIMAL(12,2),
    "listPrice" DECIMAL(12,2),
    "description" TEXT,
    "internalNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Forklift_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL,
    "company" TEXT,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "address1" TEXT,
    "address2" TEXT,
    "city" TEXT,
    "state" TEXT,
    "zip" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Sale" (
    "id" TEXT NOT NULL,
    "forkliftId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "saleDate" TIMESTAMP(3) NOT NULL,
    "salePrice" DECIMAL(12,2) NOT NULL,
    "saleType" "SaleType" NOT NULL DEFAULT 'CASH',
    "invoiceNumber" TEXT,
    "notes" TEXT,
    "isHistorical" BOOLEAN NOT NULL DEFAULT false,
    "dataCardId" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Sale_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Attachment" (
    "id" TEXT NOT NULL,
    "kind" "AttachmentKind" NOT NULL DEFAULT 'PHOTO',
    "storagePath" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "sha256" TEXT NOT NULL,
    "ocrText" TEXT,
    "ocrConfidence" DOUBLE PRECISION,
    "ocrProcessedAt" TIMESTAMP(3),
    "forkliftId" TEXT,
    "uploadedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Attachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "action" "AuditAction" NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "changes" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_isActive_idx" ON "User"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Forklift_stockNumber_key" ON "Forklift"("stockNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Forklift_serialNumber_key" ON "Forklift"("serialNumber");

-- CreateIndex
CREATE INDEX "Forklift_status_idx" ON "Forklift"("status");

-- CreateIndex
CREATE INDEX "Forklift_condition_idx" ON "Forklift"("condition");

-- CreateIndex
CREATE INDEX "Forklift_make_model_idx" ON "Forklift"("make", "model");

-- CreateIndex
CREATE INDEX "Forklift_deletedAt_idx" ON "Forklift"("deletedAt");

-- CreateIndex
CREATE INDEX "Customer_company_idx" ON "Customer"("company");

-- CreateIndex
CREATE INDEX "Customer_lastName_firstName_idx" ON "Customer"("lastName", "firstName");

-- CreateIndex
CREATE INDEX "Customer_deletedAt_idx" ON "Customer"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Sale_forkliftId_key" ON "Sale"("forkliftId");

-- CreateIndex
CREATE UNIQUE INDEX "Sale_invoiceNumber_key" ON "Sale"("invoiceNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Sale_dataCardId_key" ON "Sale"("dataCardId");

-- CreateIndex
CREATE INDEX "Sale_saleDate_idx" ON "Sale"("saleDate");

-- CreateIndex
CREATE INDEX "Sale_customerId_idx" ON "Sale"("customerId");

-- CreateIndex
CREATE INDEX "Sale_isHistorical_idx" ON "Sale"("isHistorical");

-- CreateIndex
CREATE INDEX "Attachment_forkliftId_idx" ON "Attachment"("forkliftId");

-- CreateIndex
CREATE INDEX "Attachment_kind_idx" ON "Attachment"("kind");

-- CreateIndex
CREATE INDEX "Attachment_sha256_idx" ON "Attachment"("sha256");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");

-- CreateIndex
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_forkliftId_fkey" FOREIGN KEY ("forkliftId") REFERENCES "Forklift"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_dataCardId_fkey" FOREIGN KEY ("dataCardId") REFERENCES "Attachment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_forkliftId_fkey" FOREIGN KEY ("forkliftId") REFERENCES "Forklift"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
