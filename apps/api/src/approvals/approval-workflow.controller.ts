import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApprovalWorkflowService } from './approval-workflow.service';

@Controller('approvals')
export class ApprovalWorkflowController {
  constructor(private readonly approvalWorkflowService: ApprovalWorkflowService) {}

  @Post('workflows/start')
  startWorkflow(@Body() body: any) {
    return this.approvalWorkflowService.startWorkflow(body);
  }

  @Get('workflows')
  getWorkflows() {
    return this.approvalWorkflowService.getWorkflows();
  }

  @Get('workflows/inbox')
  getInbox(@Query('email') email?: string) {
    return this.approvalWorkflowService.getInbox(email);
  }

  @Patch('workflows/:id/approve')
  approveWorkflow(@Param('id') id: string, @Body() body: any) {
    return this.approvalWorkflowService.approveWorkflow(id, body);
  }

  @Patch('workflows/:id/reject')
  rejectWorkflow(@Param('id') id: string, @Body() body: any) {
    return this.approvalWorkflowService.rejectWorkflow(id, body);
  }
}