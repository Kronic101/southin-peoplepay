import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const roles = [
    'Super Admin', 'System Admin', 'HR Officer', 'HR Manager', 'Payroll Officer',
    'Finance Officer', 'Finance Manager', 'Director', 'Line Manager', 'Employee',
    'Casual Worker', 'Auditor'
  ];

  for (const name of roles) {
    await prisma.role.upsert({
      where: { name },
      update: {},
      create: { name, description: `${name} role` }
    });
  }

  const departments = [
    'Executive', 'Human Resources', 'Finance', 'Operations', 'Procurement',
    'Projects', 'IT', 'Administration', 'Workshop'
  ];

  for (const name of departments) {
    await prisma.department.upsert({ where: { name }, update: {}, create: { name } });
  }

  const jobTitles = ['Director', 'HR Manager', 'Payroll Officer', 'Finance Manager', 'Line Manager', 'Employee'];
  for (const name of jobTitles) {
    await prisma.jobTitle.upsert({ where: { name }, update: {}, create: { name } });
  }

  const sites = ['Head Office', 'Project Site', 'Workshop', 'Client Site'];
  for (const name of sites) {
    await prisma.site.upsert({ where: { name }, update: {}, create: { name } });
  }

  const employmentTypes = ['Permanent', 'Fixed-Term', 'Temporary', 'Casual', 'Part-Time', 'Intern', 'Contractor', 'Project-Based'];
  for (const name of employmentTypes) {
    await prisma.employmentType.upsert({ where: { name }, update: {}, create: { name } });
  }

  const contractTypes = ['Permanent Contract', 'Fixed-Term Contract', 'Temporary Engagement', 'Casual Engagement', 'Internship Agreement'];
  for (const name of contractTypes) {
    await prisma.contractType.upsert({ where: { name }, update: {}, create: { name } });
  }

  const permanentType = await prisma.employmentType.findUnique({ where: { name: 'Permanent' } });
  const casualType = await prisma.employmentType.findUnique({ where: { name: 'Casual' } });
  const fixedType = await prisma.employmentType.findUnique({ where: { name: 'Fixed-Term' } });

  const templates = [
    { name: 'Permanent Office Staff', employmentTypeId: permanentType?.id },
    { name: 'Fixed-Term Contract Staff', employmentTypeId: fixedType?.id },
    { name: 'Casual Daily Worker', employmentTypeId: casualType?.id }
  ];

  for (const template of templates) {
    await prisma.serviceConditionTemplate.upsert({
      where: { name: template.name },
      update: {},
      create: {
        name: template.name,
        description: 'Starter condition template. Review and update before production use.',
        employmentTypeId: template.employmentTypeId
      }
    });
  }

  await prisma.napsaRate.create({
    data: {
      name: 'NAPSA Draft Configuration - Validate Before Go-Live',
      employeeRate: 0.05,
      employerRate: 0.05,
      monthlyCeiling: null,
      effectiveFrom: new Date('2026-01-01'),
      status: 'DRAFT'
    }
  });

  await prisma.nhimaRate.create({
    data: {
      name: 'NHIMA Draft Configuration - Validate Before Go-Live',
      employeeRate: 0.01,
      employerRate: 0.01,
      calculationBase: 'CONFIGURABLE_BY_FINANCE',
      effectiveFrom: new Date('2026-01-01'),
      status: 'DRAFT'
    }
  });

  await prisma.sdlRate.create({
    data: {
      name: 'SDL Draft Configuration - Validate Before Go-Live',
      employerRate: 0.005,
      calculationBase: 'GROSS_EMOLUMENTS',
      effectiveFrom: new Date('2026-01-01'),
      status: 'DRAFT'
    }
  });

  console.log('Southin PeoplePay seed completed. Statutory records are DRAFT and must be validated before go-live.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
