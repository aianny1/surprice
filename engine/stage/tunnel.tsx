'use client';

import { Fragment, type ReactNode, useLayoutEffect } from 'react';
import { create } from 'zustand';

/**
 * Minimal tunnel: chapter pages (DOM tree) render 3D content into the single
 * persistent <Canvas> that lives in the root layout.
 */
const useTunnel = create<{ nodes: Record<string, ReactNode> }>(() => ({ nodes: {} }));

export function SceneIn({ id, children }: { id: string; children: ReactNode }) {
  useLayoutEffect(() => {
    useTunnel.setState((s) => ({ nodes: { ...s.nodes, [id]: children } }));
  }, [id, children]);

  useLayoutEffect(
    () => () => {
      useTunnel.setState((s) => {
        const nodes = { ...s.nodes };
        delete nodes[id];
        return { nodes };
      });
    },
    [id],
  );

  return null;
}

export function SceneOut() {
  const nodes = useTunnel((s) => s.nodes);
  return (
    <>
      {Object.entries(nodes).map(([key, node]) => (
        <Fragment key={key}>{node}</Fragment>
      ))}
    </>
  );
}
