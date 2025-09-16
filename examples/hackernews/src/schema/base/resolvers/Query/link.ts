import type { QueryResolvers } from '../../../types.generated';

export const link: NonNullable<QueryResolvers['link']> = async (_parent, args, context) => {
  return context.prisma.link.findUnique({
    where: { id: parseInt(args.id) },
  });
};
