import {
  ArgumentNode,
  DocumentNode,
  FragmentDefinitionNode,
  InlineFragmentNode,
  Kind,
  visit,
} from 'graphql';

export function applySelectionSetFragmentArguments(document: DocumentNode): DocumentNode | Error {
  const fragmentList = new Map<string, FragmentDefinitionNode>();
  for (const def of document.definitions) {
    if (def.kind !== 'FragmentDefinition') {
      continue;
    }
    fragmentList.set(def.name.value, def);
  }

  return visit(document, {
    FragmentSpread(fragmentNode) {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      if (fragmentNode.arguments != null && fragmentNode.arguments.length) {
        const fragmentDef = fragmentList.get(fragmentNode.name.value);
        if (!fragmentDef) {
          return;
        }

        const fragmentArguments = new Map<string, ArgumentNode>();
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        for (const arg of fragmentNode.arguments) {
          fragmentArguments.set(arg.name.value, arg);
        }

        const selectionSet = visit(fragmentDef.selectionSet, {
          Variable(variableNode) {
            const fragArg = fragmentArguments.get(variableNode.name.value);
            if (fragArg) {
              return fragArg.value;
            }

            return variableNode;
          },
        });

        const inlineFragment: InlineFragmentNode = {
          kind: Kind.INLINE_FRAGMENT,
          typeCondition: fragmentDef.typeCondition,
          selectionSet,
        };

        return inlineFragment;
      }
      return fragmentNode;
    },
  });
}
