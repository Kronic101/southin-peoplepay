import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { FleetVehiclesService } from './vehicles.service';

@Controller('fleet/vehicles')
export class FleetVehiclesController {
  constructor(private readonly vehiclesService: FleetVehiclesService) {}

  @Get()
  getVehicles() {
    return this.vehiclesService.getVehicles();
  }

  @Get(':id')
  getVehicle(@Param('id') id: string) {
    return this.vehiclesService.getVehicle(id);
  }

  @Post()
  createVehicle(@Body() body: any) {
    return this.vehiclesService.createVehicle(body);
  }

  @Patch(':id')
  updateVehicle(@Param('id') id: string, @Body() body: any) {
    return this.vehiclesService.updateVehicle(id, body);
  }

  @Get(':vehicleId/assignments')
  getVehicleAssignments(@Param('vehicleId') vehicleId: string) {
    return this.vehiclesService.getVehicleAssignments(vehicleId);
  }

  @Post(':vehicleId/assign-driver')
  assignDriverToVehicle(@Param('vehicleId') vehicleId: string, @Body() body: any) {
    return this.vehiclesService.assignDriverToVehicle(vehicleId, body);
  }

  @Patch(':vehicleId/release-driver')
  releaseDriverFromVehicle(@Param('vehicleId') vehicleId: string, @Body() body: any) {
    return this.vehiclesService.releaseDriverFromVehicle(vehicleId, body);
  }
}