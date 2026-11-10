import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const requisitionNo = process.argv[2];

  if (!requisitionNo) {
    throw new Error(
      'Usage: tsx scripts/approve-test-stores-requisition.ts <REQUISITION_NO>',
    );
  }

  const requisition = await prisma.storesRequisition.findUnique({
    where: {
      requisitionNo,
    },
    include: {
      lines: true,
    },
  });

  if (!requisition) {
    throw new Error(
      `Stores requisition ${requisitionNo} was not found.`,
    );
  }

  if (
    requisition.status === 'ISSUED' ||
    requisition.status === 'CANCELLED'
  ) {
    throw new Error(
      `Cannot prepare ${requisitionNo} for testing because its current status is ${requisition.status}.`,
    );
  }

  const updated = await prisma.storesRequisition.update({
    where: {
      id: requisition.id,
    },
    data: {
      status: 'APPROVED',
      approvedBy: 'LOCAL_DEV_TEST',
      approvedAt: new Date(),
    },
    include: {
      lines: true,
    },
  });

  console.log('');
  console.log('LOCAL DEVELOPMENT TEST ONLY');
  console.log('--------------------------------');
  console.log(`Requisition: ${updated.requisitionNo}`);
  console.log(`Status:      ${updated.status}`);
  console.log(`Approved By: ${updated.approvedBy}`);
  console.log(`Lines:       ${updated.lines.length}`);
  console.log('');
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });