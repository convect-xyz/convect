"use client";

import { useBlock } from "wagmi";
import { alchemyConfig, convectConfig, nodes } from "./constants";

export default function Page() {
  return (
    <>
      {nodes.map((node) => (
        <MonitoredNode key={node.name} node={node} />
      ))}
    </>
  );
}

function MonitoredNode(props: { node: (typeof nodes)[number] }) {
  const { data: alchemyBlock } = useBlock({
    config: alchemyConfig,
    scopeKey: `alchemy-${props.node.chain.id}`,
    chainId: props.node.chain.id,
  });
  const { data: convectBlock } = useBlock({
    config: convectConfig,
    scopeKey: `convect-${props.node.chain.id}`,
    chainId: props.node.chain.id,
  });

  return (
    <div>
      <div>
        {props.node.name} ({props.node.chain.id})
      </div>
      <div>Alchemy: {alchemyBlock?.number.toString()}</div>
      <div>Convect: {convectBlock?.number.toString()}</div>
    </div>
  );
}
