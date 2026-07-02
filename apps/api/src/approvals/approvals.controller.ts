import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApprovalWorkflowType, OperationsModule } from '@prisma/client';
import { ApprovalsService } from './approvals.service';
import { ApprovalNotificationsService } from './approval-notifications.service';
import { ApprovalWorkflowService } from './approval-workflow.service';

/**
 * ApprovalsController
 * ------------------------------------------------------
 * Shared approval engine for Southin Operations Hub.
 *
 * This controller will eventually serve:
 * - Leave approvals
 * - Expense approvals
 * - Procurement approvals
 * - Asset purchase approvals
 * - Payroll approvals
 * - Payment batch approvals
 * - Safety and operations approvals
 */
@Controller('approvals')
export class ApprovalsController {
  constructor(
    private readonly approvalsService: ApprovalsService,
    private readonly approvalWorkflowService: ApprovalWorkflowService,
    private readonly approvalNotificationsService: ApprovalNotificationsService,
  ) {}

  @Get('matrix')
  getApprovalMatrix() {
    return this.approvalsService.getApprovalMatrix();
  }

  @Post('matrix')
  createApprovalMatrixRule(
    @Body()
    body: {
      module: OperationsModule;
      workflowType: ApprovalWorkflowType;
      name: string;
      description?: string;
      departmentId?: string;
      site?: string;
      branch?: string;
      minAmount?: number;
      maxAmount?: number;
      requiresFinance?: boolean;
      requiresDirector?: boolean;
      approvalSteps: any[];
    },
  ) {
    return this.approvalsService.createApprovalMatrixRule(body);
  }

  @Post('requests')
  createApprovalRequest(
    @Body()
    body: {
      module: OperationsModule;
      workflowType: ApprovalWorkflowType;
      requestTitle: string;
      requestReference?: string;
      requestDescription?: string;
      requesterEmployeeId?: string;
      requesterName?: string;
      requesterRole?: string;
      requesterDepartment?: string;
      requesterSite?: string;
      requesterEmail?: string;
      requesterEntraId?: string;
      amount?: number;
      sourceEntityType?: string;
      sourceEntityId?: string;
      payload?: unknown;
      departmentId?: string;
      site?: string;
      branch?: string;
    },
  ) {
    return this.approvalsService.createApprovalRequest(body);
  }

  @Get('requests')
  getApprovalRequests() {
    return this.approvalsService.getApprovalRequests();
  }

  @Get('requests/:id')
  getApprovalRequest(@Param('id') id: string) {
    return this.approvalsService.getApprovalRequest(id);
  }

  @Patch('requests/:id/decision')
  recordDecision(
    @Param('id') id: string,
    @Body()
    body: {
      sequence: number;
      decision: 'APPROVED' | 'REJECTED';
      approverEmployeeId?: string;
      approverName?: string;
      approverEmail?: string;
      approverEntraObjectId?: string;
      approverRole?: string;
      actionedBy?: string;
      actionedByEmail?: string;
      actionedByEntraId?: string;
      actionedByRole?: string;
      comments?: string;
    },
  ) {
    return this.approvalsService.recordDecision(id, body);
  }

  @Post('seed-default-rules')
  seedDefaultRules() {
    return this.approvalsService.seedDefaultApprovalRules();
  }

  @Get('notifications/queue')
  getNotificationQueue(@Query('status') status?: string) {
    return this.approvalNotificationsService.getQueue(status);
  }

  @Post('notifications/process')
  processNotificationQueue(@Body() body: { limit?: number }) {
    return this.approvalNotificationsService.processPending(body?.limit || 10);
  }
}