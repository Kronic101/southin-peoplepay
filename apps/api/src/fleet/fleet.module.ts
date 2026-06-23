import { Module } from '@nestjs/common';

import { FleetController } from './fleet.controller';
import { FleetService } from './fleet.service';

import { FleetVehiclesController } from './vehicles/vehicles.controller';
import { FleetVehiclesService } from './vehicles/vehicles.service';

import { FleetDriversController } from './drivers/drivers.controller';
import { FleetDriversService } from './drivers/drivers.service';

import { FleetDefectsController } from './defects/defects.controller';
import { FleetDefectsService } from './defects/defects.service';

import { FleetTripsController } from './trips/trips.controller';
import { FleetTripsService } from './trips/trips.service';

import { FleetFuelController } from './fuel/fuel.controller';
import { FleetFuelService } from './fuel/fuel.service';

import { FleetWorkshopController } from './workshop/workshop.controller';
import { FleetWorkshopService } from './workshop/workshop.service';

import { FleetReportsController } from './reports/reports.controller';
import { FleetReportsService } from './reports/reports.service';

@Module({
  controllers: [
    FleetController,
    FleetVehiclesController,
    FleetDriversController,
    FleetDefectsController,
    FleetTripsController,
    FleetFuelController,
    FleetWorkshopController,
    FleetReportsController,
  ],
  providers: [
    FleetService,
    FleetVehiclesService,
    FleetDriversService,
    FleetDefectsService,
    FleetTripsService,
    FleetFuelService,
    FleetWorkshopService,
    FleetReportsService,
  ],
})
export class FleetModule {}