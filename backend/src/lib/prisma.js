import { PrismaClient } from '@prisma/client';
import { tenantScopeQuery } from './tenantScope.js';

const globalForPrisma = globalThis;

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ['error', 'warn'],
  }).$extends({
    name: 'tenantScope',
    query: {
      $allModels: {
        $allOperations: tenantScopeQuery,
      },
    },
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
