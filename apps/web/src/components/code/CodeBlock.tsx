import hljs from "highlight.js/lib/core";
import typescript from "highlight.js/lib/languages/typescript";
import { roboto_mono } from "~/app/fonts";
import { cn } from "~/lib/utils";

hljs.registerLanguage("typescript", typescript);
hljs.addPlugin({
  "after:highlightElement": ({ el, result }) => {
    console.log(el);
    console.log(result);
  },
});
hljs.configure({ classPrefix: "" });

type CodeBlockProps = { code: string };

export function CodeBlock(props: CodeBlockProps) {
  const highlighted = hljs.highlight(props.code, { language: "typescript" });

  return (
    <div className="rounded-lg border bg-muted">
      <div className="px-4 py-8">
        <code
          className={cn("whitespace-pre-wrap text-sm", roboto_mono.className)}
          dangerouslySetInnerHTML={{ __html: highlighted.value }}
        ></code>
      </div>
    </div>
  );
}

type FrameCodeBlockProps = CodeBlockProps & { fileName: string };

export function FrameCodeBlock(props: FrameCodeBlockProps) {
  const highlighted = hljs.highlight(props.code, { language: "typescript" });

  return (
    <div className="overflow-hidden rounded-lg border bg-muted">
      <div className="flex divide-x border-b">
        <div className="flex items-center gap-2 px-2">
          <div className="h-3 w-3 rounded-full bg-[rgb(237,106,94)]"></div>
          <div className="h-3 w-3 rounded-full bg-[rgb(245,191,79)]"></div>
          <div className="h-3 w-3 rounded-full bg-[rgb(98,197,84)]"></div>
        </div>
        <div className="flex-1 p-2">{props.fileName}</div>
      </div>
      <CodeBlock {...props} />
    </div>
  );
}
