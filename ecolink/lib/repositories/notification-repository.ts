import { prisma, type DbClient, type PaginationInput, paginate } from "@/lib/db";
import type { NotificationType, Prisma } from "@/lib/generated/prisma/client";

export interface NotificationFilters extends PaginationInput {
  unreadOnly?: boolean;
  notificationType?: NotificationType;
}

export class NotificationRepository {
  constructor(private readonly db: DbClient = prisma) {}

  create(data: Prisma.NotificationUncheckedCreateInput) {
    return this.db.notification.create({ data });
  }

  listForUser(userProfileId: string, filters: NotificationFilters = {}) {
    const { skip, take } = paginate(filters);

    return this.db.notification.findMany({
      where: {
        userProfileId,
        notificationType: filters.notificationType,
        readAt: filters.unreadOnly ? null : undefined,
      },
      orderBy: { createdAt: "desc" },
      skip,
      take,
    });
  }

  markRead(id: string, userProfileId: string) {
    return this.db.notification.update({
      where: { id, userProfileId },
      data: { readAt: new Date() },
    });
  }

  markAllRead(userProfileId: string) {
    return this.db.notification.updateMany({
      where: { userProfileId, readAt: null },
      data: { readAt: new Date() },
    });
  }
}
