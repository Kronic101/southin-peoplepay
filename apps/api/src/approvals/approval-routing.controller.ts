import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { ApprovalRoutingService } from './approval-routing.service';

@Controller('approvals')
export class ApprovalRoutingController {
  constructor(private readonly approvalRoutingService: ApprovalRoutingService) {}

  @Get('assignments')
  getAssignments() {
    return this.approvalRoutingService.getAssignments();
  }

  @Post('assignments')
  createAssignment(@Body() body: any) {
    return this.approvalRoutingService.createAssignment(body);
  }

  @Patch('assignments/:id')
  updateAssignment(@Param('id') id: string, @Body() body: any) {
    return this.approvalRoutingService.updateAssignment(id, body);
  }

  @Patch('assignments/:id/toggle')
  toggleAssignment(@Param('id') id: string) {
    return this.approvalRoutingService.toggleAssignment(id);
  }

  @Get('delegations')
  getDelegations() {
    return this.approvalRoutingService.getDelegations();
  }

  @Post('delegations')
  createDelegation(@Body() body: any) {
    return this.approvalRoutingService.createDelegation(body);
  }

  @Patch('delegations/:id')
  updateDelegation(@Param('id') id: string, @Body() body: any) {
    return this.approvalRoutingService.updateDelegation(id, body);
  }

  @Patch('delegations/:id/toggle')
  toggleDelegation(@Param('id') id: string) {
    return this.approvalRoutingService.toggleDelegation(id);
  }

  @Post('resolve')
  resolveApprover(@Body() body: any) {
    return this.approvalRoutingService.resolveApprover(body);
  }
}