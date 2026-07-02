import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GraphMailService } from '../notifications/graph-mail.service';

@Injectable()
export class ApprovalNotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly graphMail: GraphMailService,
  ) {}

  async getQueue(status?: string) {
    return this.prisma.approvalNotificationQueue.findMany({
      where: status ? { status } : undefined,
      orderBy: [
        { queuedAt: 'desc' },
      ],
      take: 100,
    });
  }

  async processPending(limit = 10) {
    const safeLimit = Math.min(Math.max(Number(limit) || 10, 1), 50);

    const pending = await this.prisma.approvalNotificationQueue.findMany({
      where: {
        status: {
          in: ['PENDING', 'FAILED'],
        },
      },
      orderBy: [
        { queuedAt: 'asc' },
      ],
      take: safeLimit,
    });

    const results: any[] = [];

    for (const item of pending) {
      try {
        await this.prisma.approvalNotificationQueue.update({
          where: { id: item.id },
          data: {
            status: 'SENDING',
            attempts: { increment: 1 },
            lastError: null,
          },
        });

        const sent = await this.graphMail.sendApprovalMail({
          toEmail: item.toEmail,
          toName: item.toName,
          subject: item.subject,
          bodyText: item.bodyText,
          actionUrl: item.actionUrl,
        });

        await this.prisma.approvalNotificationQueue.update({
          where: { id: item.id },
          data: {
            status: 'SENT',
            sentAt: new Date(),
            lastError: null,
          },
        });

        results.push({
          id: item.id,
          toEmail: item.toEmail,
          status: 'SENT',
          graphStatus: sent.status,
        });
      } catch (err: any) {
        const errorMessage = err?.message || 'Unknown mail sending error';

        await this.prisma.approvalNotificationQueue.update({
          where: { id: item.id },
          data: {
            status: 'FAILED',
            lastError: errorMessage,
          },
        });

        results.push({
          id: item.id,
          toEmail: item.toEmail,
          status: 'FAILED',
          error: errorMessage,
        });
      }
    }

    return {
      processed: results.length,
      results,
    };
  }
}