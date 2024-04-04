import { Chain } from "./chain";

type PipelineOptions = {
  chain: Chain;
  handlers: Record<string, any>;
};

export function pipeline(options: PipelineOptions) {
  return options;
}
