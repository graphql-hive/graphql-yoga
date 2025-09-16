import type { MutationResolvers } from '../../../types.generated';

export const postLink: NonNullable<MutationResolvers['postLink']> = async (
  _parent,
  args,
  context,
) => {
  const newLink = await context.prisma.link.create({
    data: {
      url: args.url,
      description: args.description,
    },
  });
  return newLink;
};
