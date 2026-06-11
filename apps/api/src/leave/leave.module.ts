import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { LeaveController } from '../leave/leave.controller';
import { LeaveService } from '../leave/leave.service';

@Module({
  imports: [AuthModule],
  controllers: [LeaveController],
  providers: [LeaveService],
  exports: [LeaveService],
})
export class LeaveModule {}