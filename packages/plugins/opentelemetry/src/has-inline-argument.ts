import { BREAK, DocumentNode, visit } from 'graphql';

export function hasInlineArgument(doc: DocumentNode) {
  let seen = false;
  const leave = () => {
    seen = true;
    return BREAK;
  };
  visit(doc, {
    StringValue: {
      leave,
    },
    BooleanValue: {
      leave,
    },
    FloatValue: {
      leave,
    },
    EnumValue: {
      leave,
    },
    IntValue: {
      leave,
    },
  });
  return seen;
}
