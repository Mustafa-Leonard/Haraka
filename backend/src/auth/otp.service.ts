import { Injectable } from '@nestjs/common';
import { randomInt } from 'crypto';

@Injectable()
export class OtpService {
  /**
   * Generates a cryptographically secure 6-digit numeric OTP.
   */
  generate(digits = 6): string {
    const min = Math.pow(10, digits - 1);
    const max = Math.pow(10, digits) - 1;
    return String(randomInt(min, max + 1)).padStart(digits, '0');
  }
}
