import type { NotificationChannel, NotificationStatus } from './enums';

export interface NotificationDto {
  id: string;
  channel: NotificationChannel;
  recipient: string;
  subject: string | null;
  body: string;
  status: NotificationStatus;
  sentAt: string | null;
  createdAt: string;
}
