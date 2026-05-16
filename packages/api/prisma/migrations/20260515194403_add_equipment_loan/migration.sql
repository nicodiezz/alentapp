-- CreateEnum
CREATE TYPE "EquipmentLoanStatus" AS ENUM ('Loaned', 'Returned', 'Damaged');

-- CreateTable
CREATE TABLE "equipment_loans" (
    "id" TEXT NOT NULL,
    "item_name" TEXT NOT NULL,
    "status" "EquipmentLoanStatus" NOT NULL,
    "loan_date" DATE NOT NULL,
    "due_date" DATE NOT NULL,
    "member_id" TEXT NOT NULL,

    CONSTRAINT "equipment_loans_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "equipment_loans" ADD CONSTRAINT "equipment_loans_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
