import { Injectable, InternalServerErrorException } from '@nestjs/common';

type GraphTokenResponse = {
  token_type: string;
  expires_in: number;
  access_token: string;
};

@Injectable()
export class GraphMailService {
  private async getAccessToken() {
    const tenantId = process.env.GRAPH_TENANT_ID;
    const clientId = process.env.GRAPH_CLIENT_ID;
    const clientSecret = process.env.GRAPH_CLIENT_SECRET;

    if (!tenantId || !clientId || !clientSecret) {
      throw new InternalServerErrorException(
        'Microsoft Graph mailer is not configured. Missing GRAPH_TENANT_ID, GRAPH_CLIENT_ID or GRAPH_CLIENT_SECRET.',
      );
    }

    const body = new URLSearchParams();
    body.set('client_id', clientId);
    body.set('client_secret', clientSecret);
    body.set('scope', 'https://graph.microsoft.com/.default');
    body.set('grant_type', 'client_credentials');

    const response = await fetch(
      `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body,
      },
    );

    if (!response.ok) {
      const text = await response.text();
      throw new InternalServerErrorException(`Failed to get Microsoft Graph token: ${text}`);
    }

    const data = (await response.json()) as GraphTokenResponse;
    return data.access_token;
  }

  async sendApprovalMail(input: {
    toEmail: string;
    toName?: string | null;
    subject: string;
    bodyText: string;
    actionUrl?: string | null;
  }) {
    const fromMailbox = process.env.GRAPH_FROM_MAILBOX || process.env.APPROVALS_FROM_EMAIL;

    if (!fromMailbox) {
      throw new InternalServerErrorException(
        'Microsoft Graph sender mailbox is not configured. Missing GRAPH_FROM_MAILBOX or APPROVALS_FROM_EMAIL.',
      );
    }

    if (!input.toEmail) {
      throw new InternalServerErrorException('Approval email recipient is missing.');
    }

    const token = await this.getAccessToken();

    const response = await fetch(
      `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(fromMailbox)}/sendMail`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: {
            subject: input.subject,
            body: {
              contentType: 'HTML',
              content: this.toHtmlBody(input.bodyText, input.actionUrl),
            },
            toRecipients: [
              {
                emailAddress: {
                  address: input.toEmail,
                  name: input.toName || input.toEmail,
                },
              },
            ],
          },
          saveToSentItems: true,
        }),
      },
    );

    if (!response.ok) {
      const text = await response.text();
      throw new InternalServerErrorException(`Microsoft Graph sendMail failed: ${text}`);
    }

    return {
      accepted: true,
      status: response.status,
      fromMailbox,
      toEmail: input.toEmail,
    };
  }

  private toHtmlBody(bodyText: string, actionUrl?: string | null) {
    const safeText = this.escapeHtml(bodyText || '').replace(/\n/g, '<br />');

    const button = actionUrl
      ? `
        <p style="margin-top:24px;">
          <a href="${this.escapeHtml(actionUrl)}"
             style="background:#f26a21;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:8px;font-weight:700;display:inline-block;">
            Open Southin Hub Approval Inbox
          </a>
        </p>
      `
      : '';

    return `
      <div style="font-family:Arial,sans-serif;color:#111827;line-height:1.5;">
        <h2>Southin Hub Approval Notification</h2>
        <div>${safeText}</div>
        ${button}
        <hr style="margin-top:24px;border:none;border-top:1px solid #e5e7eb;" />
        <p style="font-size:12px;color:#6b7280;">
          This is an automated Southin Hub Centre notification. Please do not approve from email.
          Open the Hub, sign in, and complete the approval inside the system.
        </p>
      </div>
    `;
  }

  private escapeHtml(value: string) {
    return String(value)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }
}