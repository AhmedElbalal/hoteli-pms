-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "public"."UserRole" AS ENUM ('ADMIN', 'MANAGER', 'FRONT_DESK', 'NIGHT_AUDITOR', 'HOUSEKEEPING', 'ACCOUNTING');

-- CreateEnum
CREATE TYPE "public"."ReservationStatus" AS ENUM ('ARRIVAL', 'UNASSIGNED', 'IN_HOUSE', 'CHECKED_OUT', 'CANCELLED', 'NO_SHOW', 'BALANCE_REVIEW');

-- CreateEnum
CREATE TYPE "public"."FolioStatus" AS ENUM ('OPEN', 'CLOSED');

-- CreateEnum
CREATE TYPE "public"."LedgerItemType" AS ENUM ('CHARGE', 'PAYMENT', 'ADJUSTMENT', 'REFUND');

-- CreateEnum
CREATE TYPE "public"."RoomStatus" AS ENUM ('VACANT_READY', 'VACANT_DIRTY', 'OCCUPIED', 'GREEN_STAY', 'MAINTENANCE', 'OUT_OF_ORDER');

-- CreateEnum
CREATE TYPE "public"."HousekeepingStatus" AS ENUM ('CLEAN', 'DIRTY', 'INSPECTED', 'STAYOVER', 'ECO');

-- CreateEnum
CREATE TYPE "public"."NightAuditStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'COMPLETED', 'LOCKED');

-- CreateEnum
CREATE TYPE "public"."TicketStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED');

-- CreateEnum
CREATE TYPE "public"."TicketPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateTable
CREATE TABLE "public"."Property" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "roomsCount" INTEGER NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'CAD',
    "roomTaxRate" DECIMAL(8,5) NOT NULL DEFAULT 0.05,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Property_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "public"."UserRole" NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Room" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" "public"."RoomStatus" NOT NULL,
    "housekeeping" "public"."HousekeepingStatus" NOT NULL,
    "rateBase" DECIMAL(10,2) NOT NULL,
    "notes" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Room_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Reservation" (
    "id" TEXT NOT NULL,
    "guestName" TEXT NOT NULL,
    "email" TEXT,
    "roomNumber" TEXT,
    "status" "public"."ReservationStatus" NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'Direct',
    "checkIn" TEXT NOT NULL,
    "checkOut" TEXT NOT NULL,
    "adults" INTEGER NOT NULL DEFAULT 1,
    "rate" DECIMAL(10,2) NOT NULL,
    "balance" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "parking" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Reservation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Folio" (
    "id" TEXT NOT NULL,
    "reservationId" TEXT NOT NULL,
    "guestName" TEXT NOT NULL,
    "status" "public"."FolioStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Folio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."FolioItem" (
    "id" TEXT NOT NULL,
    "folioId" TEXT NOT NULL,
    "type" "public"."LedgerItemType" NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "date" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FolioItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."HouseAccount" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "public"."FolioStatus" NOT NULL DEFAULT 'OPEN',
    "owner" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HouseAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."HouseAccountItem" (
    "id" TEXT NOT NULL,
    "houseAccountId" TEXT NOT NULL,
    "type" "public"."LedgerItemType" NOT NULL,
    "description" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "date" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HouseAccountItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."NightAudit" (
    "id" TEXT NOT NULL,
    "businessDate" TEXT NOT NULL,
    "status" "public"."NightAuditStatus" NOT NULL DEFAULT 'OPEN',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "completedById" TEXT,
    "summary" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NightAudit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."SupportTicket" (
    "id" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" "public"."TicketStatus" NOT NULL DEFAULT 'OPEN',
    "priority" "public"."TicketPriority" NOT NULL DEFAULT 'MEDIUM',
    "owner" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupportTicket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AuditLog" (
    "id" TEXT NOT NULL,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userEmail" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "details" JSONB,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "public"."User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Room_number_key" ON "public"."Room"("number");

-- CreateIndex
CREATE INDEX "Reservation_checkIn_idx" ON "public"."Reservation"("checkIn");

-- CreateIndex
CREATE INDEX "Reservation_checkOut_idx" ON "public"."Reservation"("checkOut");

-- CreateIndex
CREATE INDEX "Reservation_status_idx" ON "public"."Reservation"("status");

-- CreateIndex
CREATE INDEX "Reservation_roomNumber_idx" ON "public"."Reservation"("roomNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Folio_reservationId_key" ON "public"."Folio"("reservationId");

-- CreateIndex
CREATE INDEX "FolioItem_folioId_idx" ON "public"."FolioItem"("folioId");

-- CreateIndex
CREATE INDEX "FolioItem_date_idx" ON "public"."FolioItem"("date");

-- CreateIndex
CREATE INDEX "HouseAccountItem_houseAccountId_idx" ON "public"."HouseAccountItem"("houseAccountId");

-- CreateIndex
CREATE INDEX "HouseAccountItem_date_idx" ON "public"."HouseAccountItem"("date");

-- CreateIndex
CREATE UNIQUE INDEX "NightAudit_businessDate_key" ON "public"."NightAudit"("businessDate");

-- CreateIndex
CREATE INDEX "AuditLog_at_idx" ON "public"."AuditLog"("at");

-- CreateIndex
CREATE INDEX "AuditLog_entity_idx" ON "public"."AuditLog"("entity");

-- CreateIndex
CREATE INDEX "AuditLog_userEmail_idx" ON "public"."AuditLog"("userEmail");

-- AddForeignKey
ALTER TABLE "public"."Reservation" ADD CONSTRAINT "Reservation_roomNumber_fkey" FOREIGN KEY ("roomNumber") REFERENCES "public"."Room"("number") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Folio" ADD CONSTRAINT "Folio_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "public"."Reservation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."FolioItem" ADD CONSTRAINT "FolioItem_folioId_fkey" FOREIGN KEY ("folioId") REFERENCES "public"."Folio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."HouseAccountItem" ADD CONSTRAINT "HouseAccountItem_houseAccountId_fkey" FOREIGN KEY ("houseAccountId") REFERENCES "public"."HouseAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."NightAudit" ADD CONSTRAINT "NightAudit_completedById_fkey" FOREIGN KEY ("completedById") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
