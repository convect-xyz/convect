import { PropsWithChildren } from "react";

export default function CopyButton(
  props: PropsWithChildren<{
    text: string;
  }>,
) {
  return (
    <button onClick={() => navigator.clipboard.writeText(props.text)}>
      {props.children}
    </button>
  );
}
