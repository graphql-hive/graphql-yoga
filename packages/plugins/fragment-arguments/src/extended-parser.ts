/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import {
  FragmentDefinitionNode,
  FragmentSpreadNode,
  InlineFragmentNode,
  Kind,
  Location,
  Token,
  TokenKind,
} from 'graphql';
import type { Lexer } from 'graphql/language/lexer.js';
import { ParseOptions, Parser } from 'graphql/language/parser.js';

export class FragmentArgumentCompatibleParser extends Parser {
  // see https://github.com/graphql/graphql-js/pull/3248
  getLexer(): Lexer {
    return (this as any)._lexer as Lexer;
  }

  // see https://github.com/graphql/graphql-js/pull/3248
  getOptions(): ParseOptions {
    return (this as any)._options as ParseOptions;
  }

  // for backwards-compat with v15, this api was removed in v16 in favor of the this.node API.
  loc(startToken: Token): Location | undefined {
    if (this.getOptions()?.noLocation !== true) {
      const lexer = this.getLexer();
      return new Location(startToken, lexer.lastToken, lexer.source);
    }
    return undefined;
  }

  override parseFragment() {
    const start = this.getLexer().token;
    this.expectToken(TokenKind.SPREAD);
    const hasTypeCondition = this.expectOptionalKeyword('on');

    if (!hasTypeCondition && this.peek(TokenKind.NAME)) {
      const name = this.parseFragmentName();

      if (this.peek(TokenKind.PAREN_L)) {
        return {
          kind: Kind.FRAGMENT_SPREAD,
          name,
          arguments: (this as any).parseArguments(),
          directives: (this as any).parseDirectives(),
          loc: this.loc(start),
        } as FragmentSpreadNode;
      }

      return {
        kind: Kind.FRAGMENT_SPREAD,
        name: this.parseFragmentName(),
        directives: (this as any).parseDirectives(),
        loc: this.loc(start),
      } as FragmentSpreadNode;
    }

    return {
      kind: Kind.INLINE_FRAGMENT,
      typeCondition: hasTypeCondition ? this.parseNamedType() : undefined,
      directives: (this as any).parseDirectives(),
      selectionSet: this.parseSelectionSet(),
      loc: this.loc(start),
    } as InlineFragmentNode;
  }

  override parseFragmentDefinition() {
    const start = this.getLexer().token;
    this.expectKeyword('fragment');
    const name = this.parseFragmentName();

    if (this.peek(TokenKind.PAREN_L)) {
      const fragmentDefinition: FragmentDefinitionNode = {
        kind: Kind.FRAGMENT_DEFINITION,
        name,
        variableDefinitions: this.parseVariableDefinitions(),
        typeCondition: (this.expectKeyword('on'), this.parseNamedType()),
        directives: (this as any).parseDirectives(),
        selectionSet: this.parseSelectionSet(),
        loc: this.loc(start),
      };
      return fragmentDefinition;
    }

    const fragmentDefinition: FragmentDefinitionNode = {
      kind: Kind.FRAGMENT_DEFINITION,
      name,
      typeCondition: (this.expectKeyword('on'), this.parseNamedType()),
      directives: (this as any).parseDirectives(),
      selectionSet: this.parseSelectionSet(),
      loc: this.loc(start),
    };
    return fragmentDefinition;
  }
}
