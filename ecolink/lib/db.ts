import { PrismaPg } from "@prisma/adapter-pg";

import { Prisma, PrismaClient } from "@/lib/generated/prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

export type DbClient = PrismaClient | Prisma.TransactionClient;

export interface PaginationInput {
  page?: number;
  pageSize?: number;
}

export interface PaginationResult {
  skip: number;
  take: number;
  page: number;
  pageSize: number;
}

export interface RepositoryResult<TData> {
  ok: true;
  data: TData;
}

export interface RepositoryFailure {
  ok: false;
  code: "CONFLICT" | "NOT_FOUND" | "VALIDATION" | "DATABASE";
  message: string;
}

export type RepositoryResponse<TData> = RepositoryResult<TData> | RepositoryFailure;

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("DATABASE_URL is required to initialize Prisma.");
  }

  return new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
  });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export const activeRecord = {
  deletedAt: null,
} as const;

export function getDbClient(db: DbClient = prisma): DbClient {
  return db;
}

export async function transaction<T>(
  callback: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  return prisma.$transaction(callback);
}

export function paginate(input: PaginationInput = {}): PaginationResult {
  const page = Math.max(input.page ?? 1, 1);
  const pageSize = Math.min(Math.max(input.pageSize ?? 20, 1), 100);

  return {
    skip: (page - 1) * pageSize,
    take: pageSize,
    page,
    pageSize,
  };
}

export function repositorySuccess<TData>(data: TData): RepositoryResult<TData> {
  return { ok: true, data };
}

export function repositoryFailure(
  code: RepositoryFailure["code"],
  message: string,
): RepositoryFailure {
  return { ok: false, code, message };
}

export function mapPrismaError(error: unknown): RepositoryFailure {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      return repositoryFailure("CONFLICT", "A record with this unique value already exists.");
    }

    if (error.code === "P2025") {
      return repositoryFailure("NOT_FOUND", "The requested record could not be found.");
    }
  }

  return repositoryFailure("DATABASE", "The database operation could not be completed.");
}
