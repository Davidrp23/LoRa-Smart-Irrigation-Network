/*
  Warnings:

  - Made the column `modelo` on table `Router` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Router" ALTER COLUMN "modelo" SET NOT NULL;
