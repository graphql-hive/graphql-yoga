declare module 'graphiql/graphiql.css' {
  export default string;
}

declare module 'graphiql-explorer' {
  import React from 'react';
  import { GraphQLSchema } from 'graphql';

  declare function GraphiQLExplorer(props: {
    schema: GraphQLSchema;
    query: string;
    onEdit: (value: string) => void;
    explorerIsOpen: boolean;
    onToggleExplorer: () => void;
    colors: {
      keyword: string;
      def: string; // OperationName, FragmentName
      property: string; // FieldName
      qualifier: string; // FieldAlias
      attribute: string; // ArgumentName and ObjectFieldName
      number: string;
      string: string;
      string2: string; // Enum
      builtin: string; // Boolean
      variable: string;
      atom: string; // Type
    };
  }): React.ReactElement;
  export default GraphiQLExplorer;
}
