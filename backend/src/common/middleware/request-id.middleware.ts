import { randomBytes } from 'crypto';

export function RequestIdMiddleware(req: any, _res: any, next: () => void) {
  if (!req.headers['x-request-id']) {
    req.headers['x-request-id'] = 'req-' + randomBytes(6).toString('hex');
  }
  next();
}
