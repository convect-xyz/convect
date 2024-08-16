import { Button, ButtonProps } from "@react-email/components";
import { cn } from "~/lib/utils";

export function EmailButton({ className, ...rest }: ButtonProps) {
  return (
    <Button
      {...rest}
      className={cn(
        "rounded-[5px] bg-white px-5 py-2 text-[14px] font-medium text-black",
        className,
      )}
    />
  );
}
