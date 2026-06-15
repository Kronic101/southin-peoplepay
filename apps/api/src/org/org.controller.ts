import { Body, Controller, Get, Post } from '@nestjs/common';
import { OrgService } from './org.service';

/**
 * OrgController
 * ------------------------------------------------------
 * Organisation structure endpoints for Southin Operations Hub.
 */
@Controller('org')
export class OrgController {
  constructor(private readonly orgService: OrgService) {}

  @Get('departments')
  getDepartments() {
    return this.orgService.getDepartments();
  }

  @Post('departments')
  createDepartment(
    @Body()
    body: {
      code: string;
      name: string;
      description?: string;
    },
  ) {
    return this.orgService.createDepartment(body);
  }

  @Get('roles')
  getRoles() {
    return this.orgService.getRoles();
  }

  @Post('roles')
  createRole(
    @Body()
    body: {
      code: string;
      name: string;
      description?: string;
      isStaffRole?: boolean;
    },
  ) {
    return this.orgService.createRole(body);
  }

  @Get('positions')
  getPositions() {
    return this.orgService.getPositions();
  }

  @Post('positions')
  createPosition(
    @Body()
    body: {
      title: string;
      positionCode?: string;
      site?: string;
      branch?: string;
      isHod?: boolean;
      departmentId?: string;
      roleId?: string;
      reportsToPositionId?: string;
    },
  ) {
    return this.orgService.createPosition(body);
  }

  @Post('seed-southin-structure')
  seedSouthinStructure() {
    return this.orgService.seedSouthinOrgStructure();
  }
}