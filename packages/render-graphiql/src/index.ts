import type { GraphiQLOptions } from '@graphql-yoga/types';
import { css, editorWorkerService, favicon, graphqlWorker, js, jsonWorker } from './graphiql.js';

export const renderGraphiQL = (opts?: GraphiQLOptions) => /* HTML */ `
  <!doctype html>
  <html lang="en">
    <head>
      <meta charset="utf-8" />
      <title>${opts?.title || 'Yoga GraphiQL'}</title>
      <link rel="icon" href="${opts?.favicon || favicon}" />
      <style>
        ${css}
      </style>
    </head>
    <body id="body" class="no-focus-outline">
      <noscript>You need to enable JavaScript to run this app.</noscript>
      <div id="root"></div>

      <script>
        function prepareBlob(workerContent) {
          const blob = new Blob([workerContent], { type: 'application/javascript' });
          return URL.createObjectURL(blob);
        }
        const workers = {
          editorWorkerService: prepareBlob(${JSON.stringify(editorWorkerService)}),
          json: prepareBlob(${JSON.stringify(jsonWorker)}),
          graphql: prepareBlob(${JSON.stringify(graphqlWorker)}),
        };
        self['MonacoEnvironment'] = {
          globalAPI: false,
          getWorkerUrl: function (moduleId, label) {
            return workers[label];
          },
        };
        ${js};
        YogaGraphiQL.renderYogaGraphiQL(
          window.document.querySelector('#root'),
          ${JSON.stringify(opts ?? {})},
        );
      </script>
    </body>
  </html>
`;
