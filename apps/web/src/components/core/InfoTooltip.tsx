import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../ui/tooltip";

export default function InfoTooltip(props: {
  children: React.ReactNode;
  text: string;
}) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger>{props.children}</TooltipTrigger>
        <TooltipContent className="max-w-[300px] text-xs">
          {props.text}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
