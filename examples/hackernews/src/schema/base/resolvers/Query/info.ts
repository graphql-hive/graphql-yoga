import type { QueryResolvers } from '../../../types.generated';

export const info: NonNullable<QueryResolvers['info']> = async (_parent, _arg, _ctx) => {
  return `This is the API of a Hackernews Clone`;
};
