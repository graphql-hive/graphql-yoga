import React from 'react';
import { createRoot } from 'react-dom/client';
import { YogaGraphiQL, YogaGraphiQLProps } from './YogaGraphiQL.js';

export function renderYogaGraphiQL(element: Element, opts?: YogaGraphiQLProps) {
  const root = createRoot(element);
  root.render(<YogaGraphiQL {...opts} />);
}

globalThis.React = React;
