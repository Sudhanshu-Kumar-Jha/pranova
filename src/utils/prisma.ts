import { PrismaClient } from '@prisma/client';

const createPrismaClient = () => {
  const baseClient = new PrismaClient({
    log:
      process.env.NODE_ENV === 'development'
        ? ['query', 'error', 'warn']
        : ['error'],
  });

  // Immutability Guard: Programmatically prevent updates and deletions on audit trails
  return baseClient
    // Resilient connection retry: Retries transient network connection resets with backoff
    // to prevent spurious 500 errors during brief network latency or reconnects.
    .$extends({
      query: {
        $allModels: {
          async $allOperations({ args, query }) {
            for (let attempt = 0; ; attempt++) {
              try {
                return await query(args);
              } catch (error: unknown) {
                const e = error as { code?: string; message?: string };
                const transient =
                  e?.code === 'P1001' ||
                  e?.code === 'P1017' ||
                  /Can't reach database server|Server has closed the connection/i.test(String(e?.message ?? ''));
                if (!transient || attempt >= 3) throw error;
                await new Promise((resolve) => setTimeout(resolve, 150 * (attempt + 1)));
              }
            }
          },
        },
      },
    })
    .$extends({
    query: {
      caseTimeline: {
        async update() {
          throw new Error('Compliance Violation: CaseTimeline records are immutable and cannot be updated.');
        },
        async updateMany() {
          throw new Error('Compliance Violation: CaseTimeline records are immutable and cannot be updated.');
        },
        async delete() {
          throw new Error('Compliance Violation: CaseTimeline records are immutable and cannot be deleted.');
        },
        async deleteMany() {
          throw new Error('Compliance Violation: CaseTimeline records are immutable and cannot be deleted.');
        },
      },
    },
  });
};

type ExtendedPrismaClient = ReturnType<typeof createPrismaClient>;

declare global {
  // eslint-disable-next-line no-var
  var __prisma: ExtendedPrismaClient | undefined;
}

export const prisma: ExtendedPrismaClient = global.__prisma || createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  global.__prisma = prisma;
}

export default prisma;
