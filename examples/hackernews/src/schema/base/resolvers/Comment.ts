import type { CommentResolvers } from '../../types.generated';

export const Comment: CommentResolvers = {
  link(parent, _arg, context) {
    return context.prisma.link.findUniqueOrThrow({
      where: {
        id: parent.linkId,
      },
    });
  },
  createdAt: ({ createdAt }, _arg, _ctx) => {
    /* Comment.createdAt resolver is required because Comment.createdAt and CommentMapper.createdAt are not compatible */
    return createdAt.toISOString();
  },
};
