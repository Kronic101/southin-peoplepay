import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const APPLY =
  process.argv.includes('--apply');

const TEST_REGISTRATIONS = [
  'ABC4557',
  'ADE8462ZM',
  'ALB 1234',
];

async function main() {
  const vehicles =
    await prisma.fleetVehicle.findMany({
      where: {
        registrationNo: {
          in: TEST_REGISTRATIONS,
        },
      },
      orderBy: {
        registrationNo: 'asc',
      },
    });

  console.log('');
  console.log('TEST FLEET VEHICLE CLEANUP');
  console.log('==========================');

  console.table(
    vehicles.map((vehicle) => ({
      id: vehicle.id,
      registrationNo:
        vehicle.registrationNo,
      make: vehicle.make,
      model: vehicle.model,
      site: vehicle.site,
      assetId:
        vehicle.assetId || '-',
    })),
  );

  if (!vehicles.length) {
    console.log(
      'No matching test FleetVehicle records found.',
    );
    return;
  }

  if (!APPLY) {
    console.log('');
    console.log(
      'PREVIEW ONLY — no records changed.',
    );
    console.log(
      'Run again with --apply to delete them.',
    );
    return;
  }

  const vehicleIds =
    vehicles.map(
      (vehicle) => vehicle.id,
    );

  /*
   * Workshop jobs must be resolved first
   * because StockMovement / StockLedger
   * may reference them.
   */
  const workshopJobs =
    await prisma.fleetWorkshopJob.findMany({
      where: {
        vehicleId: {
          in: vehicleIds,
        },
      },
      select: {
        id: true,
      },
    });

  const workshopJobIds =
    workshopJobs.map(
      (job) => job.id,
    );

  if (workshopJobIds.length) {
    await prisma.stockMovement.updateMany({
      where: {
        workshopJobId: {
          in: workshopJobIds,
        },
      },
      data: {
        workshopJobId: null,
      },
    });

    await prisma.stockLedger.updateMany({
      where: {
        workshopJobId: {
          in: workshopJobIds,
        },
      },
      data: {
        workshopJobId: null,
      },
    });
  }

  /*
   * Delete dependent TEST operational
   * records in a safe order.
   *
   * No interactive transaction here:
   * the script is deliberately idempotent
   * and can safely be rerun.
   */

  const costPostings =
    await prisma.fleetCostPosting.deleteMany({
      where: {
        vehicleId: {
          in: vehicleIds,
        },
      },
    });

  const notifications =
    await prisma.fleetNotification.deleteMany({
      where: {
        vehicleId: {
          in: vehicleIds,
        },
      },
    });

  const documents =
    await prisma.fleetDocument.deleteMany({
      where: {
        vehicleId: {
          in: vehicleIds,
        },
      },
    });

  const dueItems =
    await prisma.fleetDueItem.deleteMany({
      where: {
        vehicleId: {
          in: vehicleIds,
        },
      },
    });

  const assignments =
    await prisma.fleetVehicleAssignment.deleteMany({
      where: {
        vehicleId: {
          in: vehicleIds,
        },
      },
    });

  const inspections =
    await prisma.fleetInspection.deleteMany({
      where: {
        vehicleId: {
          in: vehicleIds,
        },
      },
    });

  const trips =
    await prisma.fleetTrip.deleteMany({
      where: {
        vehicleId: {
          in: vehicleIds,
        },
      },
    });

  const fuelLogs =
    await prisma.fleetFuelLog.deleteMany({
      where: {
        vehicleId: {
          in: vehicleIds,
        },
      },
    });

  /*
   * Workshop jobs must be removed before
   * defects because jobs can reference
   * defectId.
   *
   * Workshop parts/labour cascade from
   * FleetWorkshopJob.
   */
  const workshop =
    await prisma.fleetWorkshopJob.deleteMany({
      where: {
        vehicleId: {
          in: vehicleIds,
        },
      },
    });

  const defects =
    await prisma.fleetDefect.deleteMany({
      where: {
        vehicleId: {
          in: vehicleIds,
        },
      },
    });

  const deletedVehicles =
    await prisma.fleetVehicle.deleteMany({
      where: {
        id: {
          in: vehicleIds,
        },
      },
    });

  console.log('');
  console.log('REMOVED TEST DATA');
  console.log('--------------------------');
  console.log(
    `Vehicles:       ${deletedVehicles.count}`,
  );
  console.log(
    `Assignments:    ${assignments.count}`,
  );
  console.log(
    `Inspections:    ${inspections.count}`,
  );
  console.log(
    `Trips:          ${trips.count}`,
  );
  console.log(
    `Fuel logs:      ${fuelLogs.count}`,
  );
  console.log(
    `Defects:        ${defects.count}`,
  );
  console.log(
    `Workshop jobs:  ${workshop.count}`,
  );
  console.log(
    `Due items:      ${dueItems.count}`,
  );
  console.log(
    `Documents:      ${documents.count}`,
  );
  console.log(
    `Notifications:  ${notifications.count}`,
  );
  console.log(
    `Cost postings:  ${costPostings.count}`,
  );

  console.log('');
  console.log(
    'HubAsset VEHICLE records were NOT deleted.',
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });