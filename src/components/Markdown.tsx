import ReactMarkdown from "react-markdown";

export default function Markdown({ children }: { children: string }) {
  return (
    <div className="prose prose-sm prose-slate max-w-none prose-headings:font-semibold prose-h2:mt-5 prose-h2:text-base prose-li:my-0.5">
      <ReactMarkdown>{children}</ReactMarkdown>
    </div>
  );
}
