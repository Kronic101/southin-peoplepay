import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

function asNumber(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

@Injectable()
export class FleetReportsService {
  constructor(private readonly prisma: PrismaService) {}

  private db() {
    return this.prisma as any;
  }

  async getSummary() {
    const [
      vehicles,
      activeVehicles,
      defects,
      openDefects,
      trips,
      fuelLogs,
      workshopJobs,
      openWorkshopJobs,
    ] = await Promise.all([
      this.db().fleetVehicle.count().catch(() => 0),
      this.db().fleetVehicle.count({ where: { status: 'ACTIVE' } }).catch(() => 0),
      this.db().fleetDefect.count().catch(() => 0),
      this.db()
        .fleetDefect.count({
          where: {
            status: {
              in: ['OPEN', 'REPORTED', 'IN_PROGRESS'],
            },
          },
        })
        .catch(() => 0),
      this.db().fleetTrip.count().catch(() => 0),
      this.db().fleetFuelLog.count().catch(() => 0),
      this.db().fleetWorkshopJob.count().catch(() => 0),
      this.db()
        .fleetWorkshopJob.count({
          where: {
            status: {
              in: ['OPEN', 'IN_PROGRESS', 'WAITING_PARTS'],
            },
          },
        })
        .catch(() => 0),
    ]);

    const fuel = await this.db()
      .fleetFuelLog.findMany({
        include: {
          vehicle: true,
        },
      })
      .catch(() => []);

    const workshop = await this.db()
      .fleetWorkshopJob.findMany({
        include: {
          vehicle: true,
        },
      })
      .catch(() => []);

    const totalFuelCost = fuel.reduce((sum: number, row: any) => {
      return sum + asNumber(row.amount);
    }, 0);

    const totalWorkshopCost = workshop.reduce((sum: number, row: any) => {
      return sum + asNumber(row.totalCost || row.labourCost || 0) + asNumber(row.partsCost || 0);
    }, 0);

    return {
      summary: {
        vehicles,
        activeVehicles,
        defects,
        openDefects,
        trips,
        fuelLogs,
        workshopJobs,
        openWorkshopJobs,
        totalFuelCost,
        totalWorkshopCost,
        totalFleetCost: totalFuelCost + totalWorkshopCost,
      },
    };
  }

  async getCostsByVehicle() {
    const vehicles = await this.db()
      .fleetVehicle.findMany({
        orderBy: { registrationNo: 'asc' },
        include: {
          fuelLogs: true,
          workshopJobs: true,
          defects: true,
          trips: true,
        },
      })
      .catch(() => []);

    return vehicles.map((vehicle: any) => {
      const fuelCost = (vehicle.fuelLogs || []).reduce((sum: number, row: any) => {
        return sum + asNumber(row.totalCost);
      }, 0);

      const workshopCost = (vehicle.workshopJobs || []).reduce((sum: number, row: any) => {
        return sum + asNumber(row.actualCost || row.estimatedCost);
      }, 0);

      return {
        vehicleId: vehicle.id,
        registrationNo: vehicle.registrationNo,
        make: vehicle.make,
        model: vehicle.model,
        status: vehicle.status,
        fuelLogs: vehicle.fuelLogs?.length || 0,
        workshopJobs: vehicle.workshopJobs?.length || 0,
        defects: vehicle.defects?.length || 0,
        trips: vehicle.trips?.length || 0,
        fuelCost,
        workshopCost,
        totalCost: fuelCost + workshopCost,
      };
    });
  }
}