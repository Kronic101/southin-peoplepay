import { Injectable } from '@nestjs/common';

type SharePointPublishInput = {
  targetSite: string;
  targetPage?: string;
  targetLibrary?: string;
  payloadEndpoint: string;
  payloadType?: string;
  confidentiality?: string;
  requestedBy?: string;
  payload?: any;
};

@Injectable()
export class SharePointGraphService {
  private isGraphEnabled() {
    return String(process.env.SHAREPOINT_GRAPH_ENABLED || 'false').toLowerCase() === 'true';
  }

  getStatus() {
    const graphEnabled = this.isGraphEnabled();

    return {
      graphEnabled,
      mode: graphEnabled ? 'GRAPH_ENABLED' : 'DISABLED_DEV_MODE',
      message: graphEnabled
        ? 'Microsoft Graph publishing is enabled. Ensure Azure permissions and site IDs are configured.'
        : 'Microsoft Graph publishing is disabled. Export requests will be logged only.',
      requiredConfig: {
        AZURE_TENANT_ID: Boolean(process.env.AZURE_TENANT_ID),
        AZURE_CLIENT_ID: Boolean(process.env.AZURE_CLIENT_ID),
        AZURE_CLIENT_SECRET: Boolean(process.env.AZURE_CLIENT_SECRET),
        SHAREPOINT_EXECUTIVE_SITE_ID: Boolean(process.env.SHAREPOINT_EXECUTIVE_SITE_ID),
        SHAREPOINT_FINANCE_SITE_ID: Boolean(process.env.SHAREPOINT_FINANCE_SITE_ID),
        SHAREPOINT_HR_SITE_ID: Boolean(process.env.SHAREPOINT_HR_SITE_ID),
        SHAREPOINT_PUBLIC_DASHBOARD_SITE_ID: Boolean(process.env.SHAREPOINT_PUBLIC_DASHBOARD_SITE_ID),
        SHAREPOINT_FINANCE_AUDIT_DRIVE_ID: Boolean(process.env.SHAREPOINT_FINANCE_AUDIT_DRIVE_ID),
      },
    };
  }

  async publish(input: SharePointPublishInput) {
    const graphEnabled = this.isGraphEnabled();

    if (!graphEnabled) {
      return {
        graphEnabled: false,
        graphStatus: 'DISABLED_DEV_MODE',
        message:
          'SharePoint export request logged only. No Microsoft Graph write operation was performed.',
        targetSite: input.targetSite,
        targetPage: input.targetPage || null,
        targetLibrary: input.targetLibrary || null,
        payloadEndpoint: input.payloadEndpoint,
        nextStep:
          'Enable SHAREPOINT_GRAPH_ENABLED=true only after Azure App Registration, permissions, site IDs, and drive/list IDs are configured.',
      };
    }

    // Future real Graph publishing will be added here.
    // We intentionally do not write to SharePoint yet.
    return {
      graphEnabled: true,
      graphStatus: 'FAILED',
      message:
        'Graph publishing is marked enabled, but the real Microsoft Graph client has not been implemented yet.',
      targetSite: input.targetSite,
      targetPage: input.targetPage || null,
      targetLibrary: input.targetLibrary || null,
      payloadEndpoint: input.payloadEndpoint,
    };
  }
}