import { GraphQLError } from 'graphql';
import { Prisma } from '@prisma/client';
import { parseIntSafe } from '../../../../utils';
import type { MutationResolvers } from '../../../types.generated';

export const postCommentOnLink: NonNullable<MutationResolvers['postCommentOnLink']> = async (
  _parent,
  args,
  context,
) => {
  const linkId = parseIntSafe(args.linkId);
  if (linkId === null) {
    return Promise.reject(
      new GraphQLError(`Cannot post comment on non-existing link with id '${args.linkId}'.`),
    );
  }

  if (!args.body || args.body.trim().length === 0) {
    return Promise.reject(new GraphQLError(`Comment body cannot be empty.`));
  }

  const newComment = await context.prisma.comment
    .create({
      data: {
        linkId,
        body: args.body,
      },
    })
    .catch((err: unknown) => {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2003') {
        return Promise.reject(
          new GraphQLError(`Cannot post comment on non-existing link with id '${args.linkId}'.`),
        );
      }
      return Promise.reject(err);
    });

  return newComment;
};
