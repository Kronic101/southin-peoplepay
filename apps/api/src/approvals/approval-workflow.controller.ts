import { Body, Controller, Post } from '@nestjs/common';
import { ApprovalWorkflowService } from './approval-workflow.service';

@Controller('approvals')
export class ApprovalWorkflowController {
  constructor(private readonly approvalWorkflowService: ApprovalWorkflowService) {}

  @Post('workflows/start')
  startWorkflow(@Body() body: any) {
    return this.approvalWorkflowService.startWorkflow(body);
  }
}