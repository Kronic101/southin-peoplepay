import { Injectable } from '@nestjs/common';

@Injectable()
export class HealthService {
  check() {
    return {
      status: 'ok',
      app: 'Southin PeoplePay API',
      timestamp: new Date().toISOString()
    };
  }
}
