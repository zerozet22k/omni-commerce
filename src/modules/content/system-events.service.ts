import { Types } from "mongoose";

import {
  AnalyticsEventModel,
  AuditLogModel,
  NotificationModel,
} from "@/modules/content/content.models";

function normalizeObjectId(value?: string | null) {
  if (!value) {
    return undefined;
  }

  return Types.ObjectId.isValid(value) ? new Types.ObjectId(value) : undefined;
}

function serializePayload(value: unknown) {
  if (value === undefined) {
    return undefined;
  }

  try {
    return JSON.stringify(value);
  } catch {
    return undefined;
  }
}

class SystemEventsService {
  async recordNotification(input: {
    userId?: string | null;
    channel?: "IN_APP" | "EMAIL" | "SMS";
    type: string;
    title: string;
    body?: string;
    relatedType?: string;
    relatedId?: string | null;
    sentAt?: Date;
  }) {
    try {
      const userId = normalizeObjectId(input.userId ?? undefined);

      if (!userId) {
        return null;
      }

      return await NotificationModel.create({
        userId,
        channel: input.channel ?? "IN_APP",
        type: input.type,
        title: input.title,
        body: input.body,
        relatedType: input.relatedType,
        relatedId: normalizeObjectId(input.relatedId ?? undefined),
        sentAt: input.sentAt ?? new Date(),
        isRead: false,
      });
    } catch {
      return null;
    }
  }

  async recordAuditLog(input: {
    actorUserId?: string | null;
    action: string;
    entityType: string;
    entityId: string;
    beforeData?: unknown;
    afterData?: unknown;
    createdAt?: Date;
  }) {
    try {
      const entityId = normalizeObjectId(input.entityId);

      if (!entityId) {
        return null;
      }

      return await AuditLogModel.create({
        actorUserId: normalizeObjectId(input.actorUserId ?? undefined),
        action: input.action,
        entityType: input.entityType,
        entityId,
        beforeData: serializePayload(input.beforeData),
        afterData: serializePayload(input.afterData),
        createdAt: input.createdAt ?? new Date(),
      });
    } catch {
      return null;
    }
  }

  async recordAnalyticsEvent(input: {
    eventName: string;
    userId?: string | null;
    sessionId?: string;
    productId?: string | null;
    variantId?: string | null;
    orderId?: string | null;
    source?: string;
    metadata?: unknown;
    createdAt?: Date;
  }) {
    try {
      return await AnalyticsEventModel.create({
        eventName: input.eventName,
        userId: normalizeObjectId(input.userId ?? undefined),
        sessionId: input.sessionId,
        productId: normalizeObjectId(input.productId ?? undefined),
        variantId: normalizeObjectId(input.variantId ?? undefined),
        orderId: normalizeObjectId(input.orderId ?? undefined),
        source: input.source,
        metadataJson: serializePayload(input.metadata),
        createdAt: input.createdAt ?? new Date(),
      });
    } catch {
      return null;
    }
  }
}

export const systemEventsService = new SystemEventsService();
