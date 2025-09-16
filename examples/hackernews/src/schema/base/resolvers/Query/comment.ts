import type { QueryResolvers } from '../../../types.generated';

export const comment: NonNullable<QueryResolvers['comment']> = async (_parent, args, context) => {
  return context.prisma.comment.findUnique({
    where: { id: parseInt(args.id) },
  });
};
