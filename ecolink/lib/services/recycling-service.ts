import { repositoryFailure, repositorySuccess, transaction, type RepositoryResponse } from "@/lib/db";
import type { RecyclingRequest, RecyclingRequestStatus } from "@/lib/generated/prisma/client";

const allowedTransitions: Record<RecyclingRequestStatus, RecyclingRequestStatus[]> = {
  DRAFT: ["SUBMITTED", "CANCELLED"],
  SUBMITTED: ["MATCHED", "REJECTED", "CANCELLED"],
  MATCHED: ["SCHEDULED", "REJECTED", "CANCELLED"],
  SCHEDULED: ["COLLECTED", "CANCELLED"],
  COLLECTED: ["VERIFIED", "REJECTED"],
  VERIFIED: ["COMPLETED"],
  COMPLETED: [],
  CANCELLED: [],
  REJECTED: [],
};

export class RecyclingService {
  canTransition(from: RecyclingRequestStatus, to: RecyclingRequestStatus) {
    return allowedTransitions[from].includes(to);
  }

  async transitionRequestStatus(
    requestId: string,
    nextStatus: RecyclingRequestStatus,
  ): Promise<RepositoryResponse<RecyclingRequest>> {
    return transaction(async (tx) => {
      const request = await tx.recyclingRequest.findFirst({
        where: { id: requestId, deletedAt: null },
      });

      if (!request) {
        return repositoryFailure("NOT_FOUND", "Recycling request not found.");
      }

      if (!this.canTransition(request.status, nextStatus)) {
        return repositoryFailure("VALIDATION", "This recycling request status change is not allowed.");
      }

      const updated = await tx.recyclingRequest.update({
        where: { id: request.id },
        data: {
          status: nextStatus,
          completedAt: nextStatus === "COMPLETED" ? new Date() : request.completedAt,
          cancelledAt: nextStatus === "CANCELLED" ? new Date() : request.cancelledAt,
        },
      });

      return repositorySuccess(updated);
    });
  }
}
