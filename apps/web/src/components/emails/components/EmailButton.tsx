import { Button, ButtonProps } from "@react-email/components";
import { cn } from "~/lib/utils";

export function EmailButton({ className, ...rest }: ButtonProps) {
  return (
    <Button
      {...rest}
      className={cn(
        "rounded-[5px] bg-background px-5 py-[10px] text-[14px] font-medium text-white",
        className,
      )}
    />
  );
}
