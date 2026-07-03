import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { SitesService } from './sites.service';

@Controller('sites')
export class SitesController {
  constructor(private readonly sitesService: SitesService) {}

  @Get()
  findAll() {
    return this.sitesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.sitesService.findOne(id);
  }

  @Post()
  create(@Body() body: any) {
    return this.sitesService.create(body);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: any) {
    return this.sitesService.update(id, body);
  }

  @Post(':id/managers')
  addManager(@Param('id') id: string, @Body() body: any) {
    return this.sitesService.addManager(id, body);
  }

  @Patch('managers/:managerId')
  updateManager(@Param('managerId') managerId: string, @Body() body: any) {
    return this.sitesService.updateManager(managerId, body);
  }
}