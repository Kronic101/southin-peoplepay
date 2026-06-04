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

  async publish(input: SharePointPublishInput) {
    const graphEnabled = this.isGraphEnabled();
    const targetValidation = this.validateTarget(input);
    const missingConfig = getMissingGraphConfig();

    if (!graphEnabled) {
      return {
        graphEnabled: false,
        graphStatus: 'DISABLED_DEV_MODE',
        message:
          'SharePoint export request logged only. No Microsoft Graph write operation was performed.',
        targetValidation,
        targetSite: input.targetSite,
        targetPage: input.targetPage || null,
        targetLibrary: input.targetLibrary || null,
        payloadEndpoint: input.payloadEndpoint,
        nextStep:
          'Enable SHAREPOINT_GRAPH_ENABLED=true only after Azure App Registration, permissions, site IDs, and drive/list IDs are configured.',
      };
    }

    if (missingConfig.length > 0 || !targetValidation.valid || !targetValidation.targetReady) {
      return {
        graphEnabled: true,
        graphStatus: 'FAILED',
        message:
          'Microsoft Graph publishing is enabled, but required configuration is incomplete. No SharePoint write was performed.',
        missingConfig,
        targetValidation,
        targetSite: input.targetSite,
        targetPage: input.targetPage || null,
        targetLibrary: input.targetLibrary || null,
        payloadEndpoint: input.payloadEndpoint,
      };
    }

    return {
      graphEnabled: true,
      graphStatus: 'FAILED',
      message:
        'Graph configuration is ready, but the real Microsoft Graph upload/write client has not been implemented yet.',
      targetValidation,
      targetSite: input.targetSite,
      targetPage: input.targetPage || null,
      targetLibrary: input.targetLibrary || null,
      payloadEndpoint: input.payloadEndpoint,
    };
  }
}