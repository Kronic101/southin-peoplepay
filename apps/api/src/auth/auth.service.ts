import { Injectable } from '@nestjs/common';

@Injectable()
export class AuthService {
  currentUserPlaceholder() {
    return { authenticated: false, message: 'Authentication foundation ready. Implement JWT and Microsoft Entra next.' };
  }

  employeeLoginPlaceholder(employeeNumber: string) {
    return {
      message: 'Employee Number + PIN login endpoint placeholder.',
      employeeNumber,
      mustChangePinFlow: true
    };
  }

  changePinPlaceholder() {
    return { message: 'First-login PIN change endpoint placeholder.' };
  }

  microsoftLoginPlaceholder() {
    return { message: 'Microsoft Entra ID login endpoint placeholder.' };
  }
}
