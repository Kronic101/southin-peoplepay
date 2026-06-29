import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { ApprovalMatrixService } from './approval-matrix.service';

@Controller('approvals')
export class ApprovalMatrixController {
  constructor(private readonly approvalMatrixService: ApprovalMatrixService) {}

  @Get('matrix')
  getMatrixRules() {
    return this.approvalMatrixService.getMatrixRules();
  }

  @Get('matrix/options')
  getOptions() {
    return this.approvalMatrixService.getOptions();
  }

  @Post('matrix')
  createRule(@Body() body: any) {
    return this.approvalMatrixService.createRule(body);
  }

  @Patch('matrix/:id')
  updateRule(@Param('id') id: string, @Body() body: any) {
    return this.approvalMatrixService.updateRule(id, body);
  }

  @Patch('matrix/:id/toggle')
  toggleRule(@Param('id') id: string) {
    return this.approvalMatrixService.toggleRule(id);
  }

  @Post('matrix/seed-defaults')
  seedDefaults() {
    return this.approvalMatrixService.seedDefaultMatrix();
  }

  @Get('users')
  getApproverUsers() {
    return this.approvalMatrixService.getUsers();
  }

  @Post('users')
  upsertApprover(@Body() body: any) {
    return this.approvalMatrixService.upsertApprover(body);
  }
}