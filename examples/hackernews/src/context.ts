import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export type GraphQLContext = {
  prisma: PrismaClient;
};

export async function createContext(): Promise<GraphQLContext> {
  return { prisma };
}
