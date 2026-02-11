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
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import {
  DeliveryRequest,
  DeliveryRequestDocument,
  Rider,
  RiderDocument,
  ChatMessage,
  ChatMessageDocument,
  ChatMessageSenderType,
  ChatMessageType,
} from '@libs/database';
import { WS_EVENTS, WS_SERVER_EVENTS, getRoomName } from './ws-events';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  userType?: 'customer' | 'rider';
  userName?: string;
}

@WebSocketGateway({
  cors: { origin: '*' },
  namespace: '/delivery',
  transports: ['websocket', 'polling'],
  pingInterval: 25000,
  pingTimeout: 60000,
})
export class DeliveryGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(DeliveryGateway.name);

  // userId → Set<socketId> for multi-device support
  private userSockets = new Map<string, Set<string>>();

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @InjectModel(DeliveryRequest.name)
    private readonly deliveryModel: Model<DeliveryRequestDocument>,
    @InjectModel(ChatMessage.name)
    private readonly chatMessageModel: Model<ChatMessageDocument>,
    @InjectModel(Rider.name)
    private readonly riderModel: Model<RiderDocument>,
  ) {}

  // ═══════════════════════════════════════════════
  //  CONNECTION LIFECYCLE
  // ═══════════════════════════════════════════════

  async handleConnection(client: AuthenticatedSocket) {
    this.logger.log(`Client connected: ${client.id}`);
    const token =
      client.handshake.auth?.token ||
      client.handshake.headers?.authorization?.replace('Bearer ', '');

    if (token) {
      const userType = client.handshake.auth?.userType || 'customer';
      await this.authenticateClient(client, token, userType);
    }
  }

  handleDisconnect(client: AuthenticatedSocket) {
    this.logger.log(
      `Client disconnected: ${client.id} (${client.userType}:${client.userId})`,
    );
    if (client.userId) {
      const set = this.userSockets.get(client.userId);
      if (set) {
        set.delete(client.id);
        if (set.size === 0) this.userSockets.delete(client.userId);
      }
    }
  }

  // ═══════════════════════════════════════════════
  //  AUTHENTICATION
  // ═══════════════════════════════════════════════

  @SubscribeMessage(WS_EVENTS.AUTHENTICATE)
  async onAuthenticate(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { token: string; userType?: 'customer' | 'rider' },
  ) {
    await this.authenticateClient(
      client,
      data.token,
      data.userType || 'customer',
    );
  }

  private async authenticateClient(
    client: AuthenticatedSocket,
    token: string,
    userType: 'customer' | 'rider',
  ) {
    try {
      const secret = this.configService.get<string>('JWT_SECRET');
      const payload = this.jwtService.verify(token, { secret });

      // user-api JWTs use `user_id`, delivery-api JWTs use `rider_id`
      const userId =
        payload.user_id || payload.rider_id || payload.sub || payload._id;

      if (!userId) {
        throw new Error('No user id in token');
      }

      client.userId = String(userId);
      client.userType = payload.rider_id ? 'rider' : userType;
      client.userName =
        [payload.firstName, payload.lastName].filter(Boolean).join(' ') ||
        'User';

      // Track multi-device sockets
      if (!this.userSockets.has(client.userId)) {
        this.userSockets.set(client.userId, new Set());
      }
      this.userSockets.get(client.userId)!.add(client.id);

      client.emit(WS_SERVER_EVENTS.AUTHENTICATED, {
        userId: client.userId,
        userType: client.userType,
      });
      this.logger.log(
        `Authenticated ${client.userType}:${client.userId} on socket ${client.id}`,
      );
    } catch (err) {
      client.emit(WS_SERVER_EVENTS.AUTH_ERROR, {
        message: 'Invalid or expired token',
      });
      this.logger.warn(`Auth failed ${client.id}: ${err.message}`);
    }
  }

  // ═══════════════════════════════════════════════
  //  TRACKING — subscribe / unsubscribe
  // ═══════════════════════════════════════════════

  @SubscribeMessage(WS_EVENTS.TRACKING_SUBSCRIBE)
  async onTrackingSubscribe(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { deliveryId: string },
  ) {
    if (!client.userId)
      return client.emit(WS_SERVER_EVENTS.ERROR, {
        message: 'Not authenticated',
      });

    const delivery = await this.deliveryModel.findById(data.deliveryId).lean();
    if (!delivery)
      return client.emit(WS_SERVER_EVENTS.ERROR, {
        message: 'Delivery not found',
      });

    const isParticipant =
      delivery.customer?.toString() === client.userId ||
      delivery.rider?.toString() === client.userId;

    if (!isParticipant)
      return client.emit(WS_SERVER_EVENTS.ERROR, { message: 'Unauthorized' });

    const room = getRoomName.delivery(data.deliveryId);
    client.join(room);
    this.logger.log(
      `${client.userType}:${client.userId} → tracking room ${room}`,
    );

    // Send current rider location if rider is assigned
    if (delivery.rider) {
      const rider = await this.riderModel
        .findById(delivery.rider)
        .select(
          'currentLatitude currentLongitude firstName lastName averageRating vehicleType vehiclePlateNumber profilePhoto lastLocationUpdate',
        )
        .lean();

      if (rider?.currentLatitude && rider?.currentLongitude) {
        client.emit(WS_SERVER_EVENTS.RIDER_LOCATION, {
          deliveryId: data.deliveryId,
          latitude: parseFloat(rider.currentLatitude),
          longitude: parseFloat(rider.currentLongitude),
          rider: {
            id: rider._id,
            firstName: rider.firstName,
            lastName: rider.lastName,
            averageRating: rider.averageRating,
            vehicleType: rider.vehicleType,
            vehiclePlateNumber: rider.vehiclePlateNumber,
            profilePhoto: rider.profilePhoto,
          },
          timestamp: rider.lastLocationUpdate || new Date(),
        });
      }
    }

    // Send current status
    client.emit(WS_SERVER_EVENTS.DELIVERY_STATUS_UPDATE, {
      deliveryId: data.deliveryId,
      status: delivery.status,
      paymentStatus: delivery.paymentStatus,
      updatedAt: delivery.updatedAt,
    });
  }

  @SubscribeMessage(WS_EVENTS.TRACKING_UNSUBSCRIBE)
  onTrackingUnsubscribe(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { deliveryId: string },
  ) {
    client.leave(getRoomName.delivery(data.deliveryId));
  }

  // ═══════════════════════════════════════════════
  //  TRACKING — rider location update
  // ═══════════════════════════════════════════════

  @SubscribeMessage(WS_EVENTS.RIDER_LOCATION_UPDATE)
  async onRiderLocationUpdate(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody()
    data: {
      deliveryId: string;
      latitude: number;
      longitude: number;
      heading?: number;
      speed?: number;
    },
  ) {
    if (!client.userId || client.userType !== 'rider')
      return client.emit(WS_SERVER_EVENTS.ERROR, {
        message: 'Only riders can emit location',
      });

    // Persist (fire-and-forget)
    this.riderModel
      .updateOne(
        { _id: client.userId },
        {
          currentLatitude: String(data.latitude),
          currentLongitude: String(data.longitude),
          lastLocationUpdate: new Date(),
        },
      )
      .exec()
      .catch((e) =>
        this.logger.error(`Rider loc persist fail: ${e.message}`),
      );

    // Broadcast to delivery tracking room
    this.server
      .to(getRoomName.delivery(data.deliveryId))
      .emit(WS_SERVER_EVENTS.RIDER_LOCATION, {
        deliveryId: data.deliveryId,
        latitude: data.latitude,
        longitude: data.longitude,
        heading: data.heading,
        speed: data.speed,
        timestamp: new Date(),
      });
  }

  // ═══════════════════════════════════════════════
  //  CHAT — join / leave
  // ═══════════════════════════════════════════════

  @SubscribeMessage(WS_EVENTS.CHAT_JOIN)
  async onChatJoin(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { deliveryId: string },
  ) {
    if (!client.userId)
      return client.emit(WS_SERVER_EVENTS.ERROR, {
        message: 'Not authenticated',
      });

    const delivery = await this.deliveryModel
      .findById(data.deliveryId)
      .select('customer rider')
      .lean();
    if (!delivery)
      return client.emit(WS_SERVER_EVENTS.ERROR, {
        message: 'Delivery not found',
      });

    const isCustomer = delivery.customer?.toString() === client.userId;
    const isRider = delivery.rider?.toString() === client.userId;
    if (!isCustomer && !isRider)
      return client.emit(WS_SERVER_EVENTS.ERROR, { message: 'Unauthorized' });

    const chatRoom = getRoomName.chat(data.deliveryId);
    client.join(chatRoom);
    this.logger.log(
      `${client.userType}:${client.userId} → chat ${chatRoom}`,
    );

    // Send history (last 50)
    const messages = await this.chatMessageModel
      .find({ deliveryRequest: new Types.ObjectId(data.deliveryId) })
      .sort({ createdAt: 1 })
      .limit(50)
      .lean();

    client.emit(WS_SERVER_EVENTS.CHAT_HISTORY, {
      deliveryId: data.deliveryId,
      messages: messages.map((m) => ({
        id: m._id,
        senderType: m.senderType,
        senderId: m.senderId,
        senderName: m.senderName,
        messageType: m.messageType,
        content: m.content,
        imageUrl: m.imageUrl,
        location: m.location,
        isRead: m.isRead,
        createdAt: m.createdAt,
      })),
    });

    // Mark opponent messages as read
    const oppositeSender = isCustomer
      ? ChatMessageSenderType.RIDER
      : ChatMessageSenderType.CUSTOMER;

    await this.chatMessageModel.updateMany(
      {
        deliveryRequest: new Types.ObjectId(data.deliveryId),
        senderType: oppositeSender,
        isRead: false,
      },
      { isRead: true, readAt: new Date() },
    );
  }

  @SubscribeMessage(WS_EVENTS.CHAT_LEAVE)
  onChatLeave(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { deliveryId: string },
  ) {
    client.leave(getRoomName.chat(data.deliveryId));
  }

  // ═══════════════════════════════════════════════
  //  CHAT — send message
  // ═══════════════════════════════════════════════

  @SubscribeMessage(WS_EVENTS.CHAT_SEND_MESSAGE)
  async onChatSendMessage(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody()
    data: {
      deliveryId: string;
      content: string;
      messageType?: string;
      imageUrl?: string;
      location?: { latitude: number; longitude: number };
    },
  ) {
    if (!client.userId)
      return client.emit(WS_SERVER_EVENTS.ERROR, {
        message: 'Not authenticated',
      });

    if (!data.content?.trim() && !data.imageUrl && !data.location)
      return client.emit(WS_SERVER_EVENTS.ERROR, {
        message: 'Message content required',
      });

    const delivery = await this.deliveryModel
      .findById(data.deliveryId)
      .select('customer rider status')
      .lean();
    if (!delivery)
      return client.emit(WS_SERVER_EVENTS.ERROR, {
        message: 'Delivery not found',
      });

    const isCustomer = delivery.customer?.toString() === client.userId;
    const isRider = delivery.rider?.toString() === client.userId;
    if (!isCustomer && !isRider)
      return client.emit(WS_SERVER_EVENTS.ERROR, { message: 'Unauthorized' });

    const chatMessage = await this.chatMessageModel.create({
      deliveryRequest: new Types.ObjectId(data.deliveryId),
      senderType: isCustomer
        ? ChatMessageSenderType.CUSTOMER
        : ChatMessageSenderType.RIDER,
      senderId: new Types.ObjectId(client.userId),
      senderName: client.userName,
      messageType: data.messageType || ChatMessageType.TEXT,
      content: data.content?.trim() || '',
      imageUrl: data.imageUrl,
      location: data.location,
      isRead: false,
    });

    const payload = {
      id: chatMessage._id,
      deliveryId: data.deliveryId,
      senderType: chatMessage.senderType,
      senderId: chatMessage.senderId,
      senderName: chatMessage.senderName,
      messageType: chatMessage.messageType,
      content: chatMessage.content,
      imageUrl: chatMessage.imageUrl,
      location: chatMessage.location,
      isRead: false,
      createdAt: chatMessage.createdAt,
    };

    this.server
      .to(getRoomName.chat(data.deliveryId))
      .emit(WS_SERVER_EVENTS.CHAT_NEW_MESSAGE, payload);
  }

  // ═══════════════════════════════════════════════
  //  CHAT — typing / read
  // ═══════════════════════════════════════════════

  @SubscribeMessage(WS_EVENTS.CHAT_TYPING)
  onChatTyping(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { deliveryId: string; isTyping: boolean },
  ) {
    if (!client.userId) return;
    client
      .to(getRoomName.chat(data.deliveryId))
      .emit(WS_SERVER_EVENTS.CHAT_USER_TYPING, {
        deliveryId: data.deliveryId,
        userId: client.userId,
        userType: client.userType,
        userName: client.userName,
        isTyping: data.isTyping,
      });
  }

  @SubscribeMessage(WS_EVENTS.CHAT_READ)
  async onChatRead(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { deliveryId: string },
  ) {
    if (!client.userId) return;

    const oppositeSender =
      client.userType === 'customer'
        ? ChatMessageSenderType.RIDER
        : ChatMessageSenderType.CUSTOMER;

    await this.chatMessageModel.updateMany(
      {
        deliveryRequest: new Types.ObjectId(data.deliveryId),
        senderType: oppositeSender,
        isRead: false,
      },
      { isRead: true, readAt: new Date() },
    );

    client
      .to(getRoomName.chat(data.deliveryId))
      .emit(WS_SERVER_EVENTS.CHAT_MESSAGES_READ, {
        deliveryId: data.deliveryId,
        readBy: client.userId,
        readByType: client.userType,
        readAt: new Date(),
      });
  }

  // ═══════════════════════════════════════════════
  //  SERVER-SIDE EMITTERS (called by services)
  // ═══════════════════════════════════════════════

  /** Broadcast status change to everyone watching this delivery */
  emitDeliveryStatusUpdate(
    deliveryId: string,
    status: string,
    extra?: Record<string, any>,
  ) {
    const room = getRoomName.delivery(deliveryId);
    this.server.to(room).emit(WS_SERVER_EVENTS.DELIVERY_STATUS_UPDATE, {
      deliveryId,
      status,
      updatedAt: new Date(),
      ...extra,
    });
    this.logger.log(`WS status → ${deliveryId}: ${status}`);
  }

  /** Broadcast rider location to the delivery room */
  emitRiderLocation(
    deliveryId: string,
    location: {
      latitude: number;
      longitude: number;
      heading?: number;
      speed?: number;
    },
  ) {
    this.server
      .to(getRoomName.delivery(deliveryId))
      .emit(WS_SERVER_EVENTS.RIDER_LOCATION, {
        deliveryId,
        ...location,
        timestamp: new Date(),
      });
  }

  /** Broadcast ETA update */
  emitETAUpdate(
    deliveryId: string,
    eta: { minutes: number; distance?: number },
  ) {
    this.server
      .to(getRoomName.delivery(deliveryId))
      .emit(WS_SERVER_EVENTS.DELIVERY_ETA_UPDATE, {
        deliveryId,
        estimatedMinutes: eta.minutes,
        estimatedDistance: eta.distance,
        updatedAt: new Date(),
      });
  }

  /** Insert and broadcast a system chat message */
  async emitSystemChatMessage(deliveryId: string, content: string) {
    const msg = await this.chatMessageModel.create({
      deliveryRequest: new Types.ObjectId(deliveryId),
      senderType: ChatMessageSenderType.SYSTEM,
      senderId: new Types.ObjectId('000000000000000000000000'),
      senderName: 'FastMotion',
      messageType: ChatMessageType.SYSTEM,
      content,
      isRead: false,
    });

    this.server
      .to(getRoomName.chat(deliveryId))
      .emit(WS_SERVER_EVENTS.CHAT_NEW_MESSAGE, {
        id: msg._id,
        deliveryId,
        senderType: ChatMessageSenderType.SYSTEM,
        senderId: null,
        senderName: 'FastMotion',
        messageType: ChatMessageType.SYSTEM,
        content,
        isRead: false,
        createdAt: msg.createdAt,
      });
  }

  /** Push a notification-style event to a specific user (all their sockets) */
  emitToUser(userId: string, event: string, data: any) {
    const sockets = this.userSockets.get(userId);
    if (sockets) {
      sockets.forEach((socketId) => {
        this.server.to(socketId).emit(event, data);
      });
    }
  }
}
