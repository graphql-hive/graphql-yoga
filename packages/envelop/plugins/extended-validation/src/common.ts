import { ASTVisitor, DirectiveNode, ExecutionArgs, ValidationContext } from 'graphql';

export type ExtendedValidationRule = (
  context: ValidationContext,
  executionArgs: ExecutionArgs,
) => ASTVisitor;

export function getDirectiveFromAstNode(
  astNode: { directives?: ReadonlyArray<DirectiveNode> },
  names: string | string[],
): null | DirectiveNode {
  const directives = astNode.directives || [];
  const namesArr = Array.isArray(names) ? names : [names];
  const authDirective = directives.find(d => namesArr.includes(d.name.value));

  return authDirective || null;
}
