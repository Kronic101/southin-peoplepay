import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

function clean(value: unknown) {
  if (value === undefined || value === null) return '';
  return String(value).trim();
}

function asNumber(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function removeUndefined<T extends Record<string, any>>(data: T): T {
  return Object.fromEntries(
    Object.entries(data).filter(([, value]) => value !== undefined),
  ) as T;
}

@Injectable()
export class FleetFuelService {
  constructor(private readonly prisma: PrismaService) {}

  private db() {
    return this.prisma as any;
  }

  async getFuelLogs() {
    return this.db().fleetFuelLog.findMany({
      orderBy: {
        fuelDate: 'desc',
      },
      include: {
        vehicle: true,
        driver: true,
      },
    });
  }

  async createFuelLog(body: any) {
    const vehicleId = clean(body.vehicleId);

    if (!vehicleId) {
      throw new BadRequestException('Vehicle is required.');
    }

    const vehicle = await this.db().fleetVehicle.findUnique({
      where: { id: vehicleId },
    });

    if (!vehicle) {
      throw new NotFoundException('Fleet vehicle not found.');
    }

    const litres = asNumber(body.litres);
    const unitPrice = asNumber(body.unitPrice || body.pricePerLitre);
    const amount = asNumber(body.amount || body.totalCost) || litres * unitPrice;
    const odometer = asNumber(body.odometer);

    if (litres <= 0) {
      throw new BadRequestException('Litres must be greater than zero.');
    }

    if (amount <= 0) {
      throw new BadRequestException('Amount must be greater than zero.');
    }

    if (odometer <= 0) {
      throw new BadRequestException('Odometer is required.');
    }

    const fuelLog = await this.db().fleetFuelLog.create({
      data: removeUndefined({
        vehicleId,
        driverId: clean(body.driverId) || undefined,
        fuelDate: body.fuelDate ? new Date(body.fuelDate) : new Date(),
        stationName:
          clean(body.stationName) ||
          clean(body.station) ||
          clean(body.fuelStation) ||
          'Unknown Fuel Station',
        litres: String(litres),
        amount: String(amount),
        odometer: String(odometer),
        receiptDocumentId:
          clean(body.receiptDocumentId) ||
          clean(body.documentId) ||
          clean(body.receiptNo) ||
          undefined,
      }),
      include: {
        vehicle: true,
        driver: true,
      },
    });

    const existingCost = await this.db().fleetCostPosting.findFirst({
      where: {
        sourceType: 'FUEL_LOG',
        sourceId: fuelLog.id,
      },
    });

    if (!existingCost) {
      const costNo = `FLT-COST-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;
      const costDate = fuelLog.fuelDate || new Date();
      const month = `${costDate.getFullYear()}-${String(costDate.getMonth() + 1).padStart(2, '0')}`;

      await this.db().fleetCostPosting.create({
        data: {
          costNo,
          sourceType: 'FUEL_LOG',
          sourceId: fuelLog.id,
          vehicleId: fuelLog.vehicleId,
          vehicleRegistration: vehicle.registrationNo,
          category: 'FUEL',
          description: `Fuel log for ${vehicle.registrationNo} at ${fuelLog.stationName}`,
          amount: String(amount),
          costDate,
          month,
          department: vehicle.department || null,
          site: vehicle.site || null,
          status: 'PENDING_FINANCE_REVIEW',
        },
      });
    }

    return fuelLog;
  }
}