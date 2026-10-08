import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const email = String(process.env.TEST_EMPLOYEE_EMAIL || '')
    .trim()
    .toLowerCase();

  const pin = String(process.env.TEST_MOBILE_PIN || '').trim();

  if (!email) {
    throw new Error('TEST_EMPLOYEE_EMAIL is required.');
  }

  if (pin.length < 4) {
    throw new Error('TEST_MOBILE_PIN must be at least 4 characters.');
  }

  const employee = await prisma.employee.findFirst({
    where: {
      email: {
        equals: email,
        mode: 'insensitive',
      },
    },
    include: {
      portalAccount: true,
      department: true,
      jobTitle: true,
      site: true,
    },
  });

  if (!employee) {
    throw new Error(`Employee not found for ${email}`);
  }

  const pinHash = await bcrypt.hash(pin, 10);

  const allowedModules = [
    'EMPLOYEE_PROFILE',
    'EMPLOYEE_REQUESTS',
    'EMPLOYEE_PAYSLIPS',
    'OPERATIONS',
    'SAFETY',
    'ASSETS',
    'STORES',
    'FLEET',
    'FINANCE',
    'PEOPLE_OPS',
  ];

  const account = await prisma.employeePortalAccount.upsert({
    where: {
      employeeNumber: employee.employeeNumber,
    },

    create: {
      employeeId: employee.id,
      employeeNumber: employee.employeeNumber,
      pinHash,
      mustChangePin: false,
      isActive: true,
      accessProfile: 'EMPLOYEE',
      allowedModules,
      failedAttempts: 0,
      lockedUntil: null,
    },

    update: {
      pinHash,
      mustChangePin: false,
      isActive: true,
      allowedModules,
      failedAttempts: 0,
      lockedUntil: null,
    },
  });

  console.log('Mobile test account ready');
  console.log(`Employee Number: ${employee.employeeNumber}`);
  console.log(`Name: ${employee.firstName} ${employee.lastName}`);
  console.log(`Department: ${employee.department?.name || '-'}`);
  console.log(`Job Title: ${employee.jobTitle?.name || '-'}`);
  console.log(`Portal Active: ${account.isActive}`);
  console.log(`Access Profile: ${account.accessProfile}`);
  console.log(`Allowed Modules: ${JSON.stringify(account.allowedModules)}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });