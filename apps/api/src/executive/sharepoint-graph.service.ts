import { Injectable } from '@nestjs/common';
import {
  getMissingGraphConfig,
  getRequiredGraphConfig,
  SHAREPOINT_TARGETS,
  SharePointTargetKey,
} from './sharepoint-graph.config';

type SharePointPublishInput = {
  targetKey?: SharePointTargetKey;
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

  getTargets() {
    return {
      generatedAt: new Date(),
      graphEnabled: this.isGraphEnabled(),
      targets: SHAREPOINT_TARGETS.map((target) => {
        const siteId = process.env[target.siteIdEnv];
        const driveId = target.driveIdEnv ? process.env[target.driveIdEnv] : null;
        const listId = target.listIdEnv ? process.env[target.listIdEnv] : null;

        return {
          ...target,
          configured: {
            siteId: Boolean(siteId),
            driveId: target.driveIdEnv ? Boolean(driveId) : null,
            listId: target.listIdEnv ? Boolean(listId) : null,
          },
        };
      }),
    };
  }

  getStatus() {
    const graphEnabled = this.isGraphEnabled();
    const missingConfig = getMissingGraphConfig();

    return {
      graphEnabled,
      mode: graphEnabled ? 'GRAPH_ENABLED' : 'DISABLED_DEV_MODE',
      readyForGraphWrites: graphEnabled && missingConfig.length === 0,
      message: graphEnabled
        ? 'Microsoft Graph publishing is enabled. Confirm permissions and target IDs before production use.'
        : 'Microsoft Graph publishing is disabled. Export requests will be logged only.',
      requiredConfig: getRequiredGraphConfig(),
      missingConfig,
      targets: this.getTargets().targets,
    };
  }

  validateTarget(input: SharePointPublishInput) {
    const target = SHAREPOINT_TARGETS.find((item) => {
      if (input.targetKey && item.key === input.targetKey) return true;
      if (item.payloadEndpoint === input.payloadEndpoint) return true;
      return item.siteName === input.targetSite;
    });

    if (!target) {
      return {
        valid: false,
        target: null,
        message: 'No matching SharePoint target registry entry was found for this export request.',
      };
    }

    const missingTargetConfig: string[] = [];

    if (!process.env[target.siteIdEnv]) {
      missingTargetConfig.push(target.siteIdEnv);
    }

    if (target.driveIdEnv && !process.env[target.driveIdEnv]) {
      missingTargetConfig.push(target.driveIdEnv);
    }

    if (target.listIdEnv && !process.env[target.listIdEnv]) {
      missingTargetConfig.push(target.listIdEnv);
    }

    return {
      valid: true,
      target,
      targetReady: missingTargetConfig.length === 0,
      missingTargetConfig,
      message:
        missingTargetConfig.length === 0
          ? 'SharePoint target has all required configuration values.'
          : 'SharePoint target is registered, but required site/list/drive IDs are still missing.',
    };
  }

  private assertGraphWriteAllowed() {
    const graphEnabled = this.isGraphEnabled();

    if (!graphEnabled) {
      return {
        allowed: false,
        graphStatus: 'DISABLED_DEV_MODE',
        reason:
          'Microsoft Graph publishing is disabled. This request will only be logged for audit and testing.',
      };
    }

    const status = this.getStatus();

    if (!status.readyForGraphWrites) {
      return {
        allowed: false,
        graphStatus: 'FAILED',
        reason:
          'Microsoft Graph publishing is enabled, but required configuration values are missing.',
        missingConfig: status.missingConfig,
      };
    }

    return {
      allowed: true,
      graphStatus: 'READY',
      reason: 'Microsoft Graph configuration appears ready for write operations.',
    };
  }

  private async uploadJsonToSharePointPlaceholder(input: SharePointPublishInput) {
    return {
      operation: 'UPLOAD_JSON_PLACEHOLDER',
      performed: false,
      message:
        'Placeholder only. Real Microsoft Graph JSON upload will be implemented after Azure App Registration is configured.',
      targetSite: input.targetSite,
      targetPage: input.targetPage || null,
      targetLibrary: input.targetLibrary || null,
      payloadEndpoint: input.payloadEndpoint,
    };
  }

  private async updateSharePointPagePlaceholder(input: SharePointPublishInput) {
    return {
      operation: 'UPDATE_PAGE_PLACEHOLDER',
      performed: false,
      message:
        'Placeholder only. Real SharePoint page update will be implemented after Microsoft Graph permissions are approved.',
      targetSite: input.targetSite,
      targetPage: input.targetPage || null,
      payloadEndpoint: input.payloadEndpoint,
    };
  }

  async publish(input: SharePointPublishInput) {
    const targetValidation = this.validateTarget(input);
    const writeCheck = this.assertGraphWriteAllowed();

    if (!writeCheck.allowed) {
      return {
        graphEnabled: this.isGraphEnabled(),
        graphStatus: writeCheck.graphStatus,
        message:
          writeCheck.graphStatus === 'DISABLED_DEV_MODE'
            ? 'SharePoint export request logged only. No Microsoft Graph write operation was performed.'
            : 'Microsoft Graph write operation blocked because configuration is incomplete.',
        writeCheck,
        targetValidation,
        targetSite: input.targetSite,
        targetPage: input.targetPage || null,
        targetLibrary: input.targetLibrary || null,
        payloadEndpoint: input.payloadEndpoint,
        nextStep:
          'Enable Microsoft Graph only after Azure App Registration, permissions, site IDs, and library/list IDs are configured.',
      };
    }

    const uploadPlaceholder = await this.uploadJsonToSharePointPlaceholder(input);
    const pagePlaceholder = await this.updateSharePointPagePlaceholder(input);

    return {
      graphEnabled: true,
      graphStatus: 'FAILED',
      message:
        'Graph configuration is ready, but real Microsoft Graph write operations are still intentionally blocked.',
      targetValidation,
      uploadPlaceholder,
      pagePlaceholder,
      targetSite: input.targetSite,
      targetPage: input.targetPage || null,
      targetLibrary: input.targetLibrary || null,
      payloadEndpoint: input.payloadEndpoint,
    };
  }
}