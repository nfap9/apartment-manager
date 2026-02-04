/*
  Warnings:

  - You are about to drop the column `facilities` on the `Room` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Room" DROP COLUMN "facilities",
ADD COLUMN     "isRented" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "notes" TEXT;

-- CreateTable
CREATE TABLE "RoomFacility" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "valueCents" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RoomFacility_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RoomFacility_roomId_idx" ON "RoomFacility"("roomId");

-- CreateIndex
CREATE UNIQUE INDEX "RoomFacility_roomId_name_key" ON "RoomFacility"("roomId", "name");

-- AddForeignKey
ALTER TABLE "RoomFacility" ADD CONSTRAINT "RoomFacility_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE CASCADE ON UPDATE CASCADE;
