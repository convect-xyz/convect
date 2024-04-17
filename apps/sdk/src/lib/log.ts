import { AbiEvent, parseAbiItem } from "abitype";
import {
  Signature,
  Signatures,
} from "abitype/dist/types/human-readable/types/signatures";
import { Address, Narrow } from "viem";

type Error<T extends string | string[]> = T extends string
  ? [
      // Surrounding with array to prevent `T` from being widened to `string`
      `Error: ${T}`,
    ]
  : {
      [K in keyof T]: T[K] extends infer Message extends string
        ? `Error: ${Message}`
        : never;
    };

export type S<
  TSignature extends string | readonly string[] | readonly unknown[],
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
  TOptional extends true | false = false,
> {
  private _event: TAbiEvent;
  private _origin: Address;
  private _optional: TOptional;

  constructor(options: {
    event: TAbiEvent;
    origin: Address;
    optional: TOptional;
  }) {
    this._event = options.event;
    this._optional = options.optional;
    this._origin = options.origin;
  }

  optional() {
    const c = new Log({
      event: this._event,
      optional: true,
      origin: this._origin,
    });

    return c;
  }
}

export function log<
  const TSignature extends string | readonly string[] | readonly unknown[],
>(options: { signature: S<TSignature>; origin: Address }) {
  const parsedSignature = parseAbiItem(options.signature);
  if (parsedSignature.type !== "event") {
    throw new Error("Only events supported");
  }

  return new Log<
    typeof parsedSignature extends AbiEvent ? typeof parsedSignature : any,
    false
  >({
    event: parsedSignature,
    optional: false,
    origin: options.origin,
  });
}
