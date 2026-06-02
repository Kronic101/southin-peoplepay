import { Injectable } from '@nestjs/common';

@Injectable()
export class IntegrationsService {
  sharePointStatusPlaceholder() {
    return { connected: false, message: 'SharePoint integration placeholder. Configure Microsoft Graph credentials next.' };
  }

  publishExecutiveDashboardPlaceholder() {
    return { message: 'Executive dashboard publish placeholder.' };
  }
}
