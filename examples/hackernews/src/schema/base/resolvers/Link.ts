import type { LinkResolvers } from '../../types.generated';

export const Link: LinkResolvers = {
  comments: (parent, _arg, context) => {
    return context.prisma.comment.findMany({
      orderBy: { createdAt: 'desc' },
      where: {
        linkId: parent.id,
      },
    });
  },
};
