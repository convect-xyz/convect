import { AbiEvent, parseAbiItem } from "abitype";
import {
  Signature,
  Signatures,
} from "abitype/dist/types/human-readable/types/signatures";
import { Error } from "abitype/dist/types/types";
import { Narrow } from "viem";

export type S<
  TSignature extends string | readonly string[] | readonly unknown[]
> = Narrow<TSignature> &
  (
    | (TSignature extends string
        ? string extends TSignature
          ? unknown
          : Signature<TSignature>
        : never)
    | (TSignature extends readonly string[]
        ? TSignature extends readonly [] // empty array
          ? Error<"At least one signature required.">
          : string[] extends TSignature
          ? unknown
          : Signatures<TSignature>
        : never)
  );

export class Log<
  TAbiEvent extends AbiEvent,
  TOptional extends true | false = false
> {
  #options: { event: TAbiEvent; optional: TOptional };

  constructor(options: { event: TAbiEvent; optional: TOptional }) {
    this.#options = options;
  }

  optional() {
    const c = new Log({
      ...this.#options,
      optional: true,
    });

    return c;
  }
}

export function log<
  const TSignature extends string | readonly string[] | readonly unknown[]
>(signature: S<TSignature>) {
  const parsedSignature = parseAbiItem(signature);
  if (parsedSignature.type !== "event") {
    throw new Error("Only events supported");
  }

  return new Log<
    typeof parsedSignature extends AbiEvent ? typeof parsedSignature : any,
    false
  >({
    event: parsedSignature,
    optional: false,
  });
}
