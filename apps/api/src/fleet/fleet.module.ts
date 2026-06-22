import { Module } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

import { FleetController } from './fleet.controller';
import { FleetService } from './fleet.service';

import { FleetVehiclesController } from './vehicles/vehicles.controller';
import { FleetVehiclesService } from './vehicles/vehicles.service';

import { FleetDriversController } from './drivers/drivers.controller';
import { FleetDriversService } from './drivers/drivers.service';

@Module({
  controllers: [FleetController, FleetVehiclesController, FleetDriversController],
  providers: [PrismaService, FleetService, FleetVehiclesService, FleetDriversService],
  exports: [FleetService, FleetVehiclesService, FleetDriversService],
})
export class FleetModule {}