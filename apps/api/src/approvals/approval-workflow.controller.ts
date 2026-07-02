import { Body, Controller, Get, Param, Patch, Query } from '@nestjs/common';
import { ApprovalWorkflowService } from './approval-workflow.service';

@Controller('approvals/workflows')
export class ApprovalWorkflowController {
  constructor(
    private readonly approvalWorkflowService: ApprovalWorkflowService,
  ) {}

  @Get()
  getWorkflows() {
    return this.approvalWorkflowService.getWorkflows();
  }

  @Get('inbox')
  getInbox(
    @Query('email') email?: string,
    @Query('role') role?: string,
  ) {
    return this.approvalWorkflowService.getInbox(email, role);
  }

  @Patch(':id/approve')
  approveWorkflow(
    @Param('id') id: string,
    @Body() body: any,
  ) {
    return this.approvalWorkflowService.approveWorkflow(id, body);
  }

  @Patch(':id/reject')
  rejectWorkflow(
    @Param('id') id: string,
    @Body() body: any,
  ) {
    return this.approvalWorkflowService.rejectWorkflow(id, body);
  }
}