import ReactMarkdown from "react-markdown";

/**
 * Renders markdown safely. HTML is not rendered (react-markdown default).
 * Do not add rehype-raw or other plugins that enable raw HTML.
 */
export function SafeMarkdown({ children }: { children: string }) {
  return <ReactMarkdown>{children}</ReactMarkdown>;
}
