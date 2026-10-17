import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import type { Server, Socket } from 'socket.io';

@WebSocketGateway({
  cors: {
    origin: '*',
    credentials: true,
  },
  namespace: '/tracking',
})
export class TrackingGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(TrackingGateway.name);

  handleConnection(client: Socket) {
    this.logger.debug(`Client connected to tracking socket: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.debug(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('subscribe_job')
  handleSubscribeJob(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { jobId: string },
  ) {
    if (data?.jobId) {
      client.join(`job:${data.jobId}`);
      client.emit('subscribed', { room: `job:${data.jobId}` });
    }
  }

  @SubscribeMessage('subscribe_public')
  handleSubscribePublic(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { token: string },
  ) {
    if (data?.token) {
      client.join(`public:${data.token}`);
      client.emit('subscribed', { room: `public:${data.token}` });
    }
  }

  broadcastLocation(jobId: string, location: { lat: number; lng: number; heading?: number }) {
    if (this.server) {
      this.server.to(`job:${jobId}`).emit('rider_location', location);
    }
  }

  broadcastJobStatus(jobId: string, status: string) {
    if (this.server) {
      this.server.to(`job:${jobId}`).emit('job_status', { jobId, status });
    }
  }
}
