import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('');
  console.log('SOUTHIN HUB — HR / MEDICAL / FLEET INTEGRITY AUDIT');
  console.log('==================================================');

  const [
    employeeCount,
    activeEmployeeCount,
    medicalRecordCount,
    medicalComplianceCount,
    fleetVehicleCount,
    vehicleAssetCount,
    allFleetVehicles,
  ] = await Promise.all([
    prisma.employee.count(),

    prisma.employee.count({
      where: {
        status: 'ACTIVE',
      },
    }),

    prisma.employeeMedicalRecord.count(),

    prisma.employeeMedicalCompliance.count(),

    prisma.fleetVehicle.count(),

    prisma.hubAsset.count({
      where: {
        category: 'VEHICLE',
      },
    }),

    prisma.fleetVehicle.findMany({
      orderBy: {
        registrationNo: 'asc',
      },
      select: {
        id: true,
        registrationNo: true,
        assetId: true,
        make: true,
        model: true,
        year: true,
        vehicleType: true,
        department: true,
        site: true,
        status: true,
      },
    }),
  ]);

  console.log('');
  console.log('EMPLOYEE MASTER');
  console.log('--------------------------------------------------');
  console.log(`Employees:             ${employeeCount}`);
  console.log(`Active employees:      ${activeEmployeeCount}`);

  const employeesWithoutMedical =
    await prisma.employee.count({
      where: {
        status: 'ACTIVE',
        medicalRecords: {
          none: {},
        },
      },
    });

  const employeesWithoutCompliance =
    await prisma.employee.count({
      where: {
        status: 'ACTIVE',
        medicalCompliance: null,
      },
    });

  console.log('');
  console.log('MEDICAL');
  console.log('--------------------------------------------------');
  console.log(`Medical records:       ${medicalRecordCount}`);
  console.log(`Compliance profiles:   ${medicalComplianceCount}`);
  console.log(
    `Active without record: ${employeesWithoutMedical}`,
  );
  console.log(
    `No compliance profile: ${employeesWithoutCompliance}`,
  );

  const medicalByType =
    await prisma.employeeMedicalRecord.groupBy({
      by: ['medicalType'],
      _count: {
        _all: true,
      },
    });

  console.log('');
  console.log('MEDICAL BY TYPE');
  console.table(
    medicalByType.map((row) => ({
      medicalType: row.medicalType,
      records: row._count._all,
    })),
  );

  const medicalByFitness =
    await prisma.employeeMedicalRecord.groupBy({
      by: ['fitnessStatus'],
      _count: {
        _all: true,
      },
    });

  console.log('');
  console.log('FITNESS STATUS');
  console.table(
    medicalByFitness.map((row) => ({
      fitnessStatus: row.fitnessStatus,
      records: row._count._all,
    })),
  );

  const now = new Date();
  const thirtyDays = new Date();
  thirtyDays.setDate(thirtyDays.getDate() + 30);

  const [
    expiredMedical,
    dueSoonMedical,
  ] = await Promise.all([
    prisma.employeeMedicalRecord.count({
      where: {
        expiryDate: {
          lt: now,
        },
      },
    }),

    prisma.employeeMedicalRecord.count({
      where: {
        expiryDate: {
          gte: now,
          lte: thirtyDays,
        },
      },
    }),
  ]);

  console.log('');
  console.log(`Expired medicals:      ${expiredMedical}`);
  console.log(`Due within 30 days:    ${dueSoonMedical}`);

  console.log('');
  console.log('FLEET / ASSET REGISTER');
  console.log('--------------------------------------------------');
  console.log(`Fleet vehicles:        ${fleetVehicleCount}`);
  console.log(`Vehicle assets:        ${vehicleAssetCount}`);

  const assetIds =
    allFleetVehicles
      .map((vehicle) => vehicle.assetId)
      .filter(
        (value): value is string =>
          Boolean(value),
      );

  const linkedAssets =
    assetIds.length
      ? await prisma.hubAsset.findMany({
          where: {
            id: {
              in: assetIds,
            },
          },
          select: {
            id: true,
            assetNo: true,
            name: true,
            category: true,
            status: true,
          },
        })
      : [];

  const linkedAssetIds =
    new Set(
      linkedAssets.map((asset) => asset.id),
    );

  const unlinkedVehicles =
    allFleetVehicles.filter(
      (vehicle) => !vehicle.assetId,
    );

  const brokenVehicleLinks =
    allFleetVehicles.filter(
      (vehicle) =>
        vehicle.assetId &&
        !linkedAssetIds.has(vehicle.assetId),
    );

  console.log(
    `Fleet linked to assets: ${
      allFleetVehicles.length -
      unlinkedVehicles.length -
      brokenVehicleLinks.length
    }`,
  );

  console.log(
    `Fleet without assetId:   ${unlinkedVehicles.length}`,
  );

  console.log(
    `Broken asset references: ${brokenVehicleLinks.length}`,
  );

  if (unlinkedVehicles.length) {
    console.log('');
    console.log('VEHICLES NOT YET LINKED TO ASSET REGISTER');
    console.table(
      unlinkedVehicles.map((vehicle) => ({
        registrationNo:
          vehicle.registrationNo,

        make:
          vehicle.make,

        model:
          vehicle.model,

        vehicleType:
          vehicle.vehicleType,

        site:
          vehicle.site || '-',

        status:
          vehicle.status,
      })),
    );
  }

  if (brokenVehicleLinks.length) {
    console.log('');
    console.log('BROKEN FLEET → ASSET REFERENCES');

    console.table(
      brokenVehicleLinks.map((vehicle) => ({
        registrationNo:
          vehicle.registrationNo,

        assetId:
          vehicle.assetId,
      })),
    );
  }

  console.log('');
  console.log('INTEGRATION STATUS');
  console.log('--------------------------------------------------');

  console.table([
    {
      area:
        'Employee Master',
      check:
        'Employee records available',
      result:
        employeeCount > 0
          ? 'PASS'
          : 'FAIL',
    },
    {
      area:
        'Medical',
      check:
        'Medical model connected to employees',
      result:
        'PASS',
    },
    {
      area:
        'Fleet',
      check:
        'Fleet vehicle records available',
      result:
        fleetVehicleCount > 0
          ? 'PASS'
          : 'REVIEW',
    },
    {
      area:
        'Asset/Fleet',
      check:
        'Every FleetVehicle linked to HubAsset',
      result:
        unlinkedVehicles.length === 0 &&
        brokenVehicleLinks.length === 0
          ? 'PASS'
          : 'ACTION REQUIRED',
    },
  ]);

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