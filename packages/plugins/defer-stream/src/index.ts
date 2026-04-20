import { GraphQLDirective, GraphQLSchema, ValidationRule } from 'graphql';
import { Plugin } from 'graphql-yoga';
import { GraphQLDeferDirective, GraphQLStreamDirective } from '@graphql-tools/utils';
import { DeferStreamDirectiveLabelRule } from './validations/defer-stream-directive-label.js';
import { DeferStreamDirectiveOnRootFieldRule } from './validations/defer-stream-directive-on-root-field.js';
import { OverlappingFieldsCanBeMergedRule } from './validations/overlapping-fields-can-be-merged.js';
import { StreamDirectiveOnListFieldRule } from './validations/stream-directive-on-list-field.js';

export function useDeferStream<
  TPluginContext extends Record<string, unknown>,
>(): Plugin<TPluginContext> {
  return {
    onSchemaChange: ({
      schema,
      replaceSchema,
    }: {
      schema: GraphQLSchema;
      replaceSchema(schema: GraphQLSchema): void;
    }) => {
      const directives: GraphQLDirective[] = [];

      const deferInSchema = schema.getDirective('defer');
      if (deferInSchema == null) {
        directives.push(GraphQLDeferDirective);
      }

      const streamInSchema = schema.getDirective('stream');
      if (streamInSchema == null) {
        directives.push(GraphQLStreamDirective);
      }

      if (directives.length) {
        const newSchema = new GraphQLSchema({
          ...schema.toConfig(),
          directives: [...schema.getDirectives(), ...directives],
        });
        // Move extensions from the old schema to the new one, otherwise we might lose important information like plugin metadata.
        newSchema.extensions = schema.extensions;
        replaceSchema(newSchema);
      }
    },
    onValidate: ({
      params,
      addValidationRule,
    }: {
      params: {
        rules?: ValidationRule[];
      };
      addValidationRule(rule: ValidationRule): void;
    }) => {
      // Just to make TS happy because rules are always defined by useEngine.
      params.rules ||= [];
      params.rules = params.rules.filter(rule => rule.name !== 'OverlappingFieldsCanBeMergedRule');
      addValidationRule(OverlappingFieldsCanBeMergedRule);
      addValidationRule(DeferStreamDirectiveLabelRule);
      addValidationRule(DeferStreamDirectiveOnRootFieldRule);
      addValidationRule(StreamDirectiveOnListFieldRule);
    },
  };
}
