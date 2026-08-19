import type { DocumentNode, FragmentDefinitionNode, InlineFragmentNode, ValueNode } from 'graphql';
import { Kind, visit } from 'graphql';

// The fragment-arguments proposal's `FragmentArgumentNode` AST type only exists in graphql-js 17,
// so we mirror its shape locally to stay compatible with graphql-js 15/16 too.
interface FragmentArgumentNode {
  readonly name: { readonly value: string };
  readonly value: ValueNode;
}

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
      if (fragmentNode.arguments?.length) {
        const fragmentDef = fragmentList.get(fragmentNode.name.value);
        if (!fragmentDef) {
          return;
        }

        const fragmentArguments = new Map<string, FragmentArgumentNode>();
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
