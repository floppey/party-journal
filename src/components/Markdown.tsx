import ReactMarkdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import remarkGfm from "remark-gfm";
import type { ComponentProps, ReactNode } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { getNoteIdByTitleCI } from "../notes";
import type { PluggableList } from "unified";
import type { Root, Text, Content, Link } from "mdast";
import { visit } from "unist-util-visit";

interface MarkdownProps {
  markdown: string;
}

export const Markdown: React.FC<MarkdownProps> = ({ markdown }) => {
  // Resolve [[Wiki Links]] anywhere in the AST via a custom remark plugin
  const [titleToId, setTitleToId] = useState<Record<string, string | null>>({});
  const [resolverReady, setResolverReady] = useState(false);

  // Extract all wiki-link titles (case-insensitive keys)
  const wikiTitles = useMemo(() => {
    const titles = new Set<string>();
    const re = /\[\[([^\]]+)\]\]/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(markdown)) !== null) {
      const t = m[1].trim();
      if (t) titles.add(t);
    }
    return Array.from(titles);
  }, [markdown]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const entries = await Promise.all(
        wikiTitles.map(async (t) => [t, await getNoteIdByTitleCI(t)] as const)
      );
      if (!cancelled) {
        const map: Record<string, string | null> = {};
        for (const [t, id] of entries) map[t.toLowerCase()] = id;
        setTitleToId(map);
        setResolverReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [wikiTitles]);

  const remarkWikiLinks = useMemo(() => {
    function plugin() {
      return (tree: Root) => {
        visit(tree, "text", (node: Text, index, parent) => {
          const value = node.value;
          if (!value || !parent || typeof index !== "number") return;
          const re = /\[\[([^\]]+)\]\]/g;
          let last = 0;
          let m: RegExpExecArray | null;
          const newNodes: Content[] = [];
          while ((m = re.exec(value)) !== null) {
            if (m.index > last) {
              newNodes.push({
                type: "text",
                value: value.slice(last, m.index),
              } as Text);
            }
            const title = m[1].trim();
            const key = title.toLowerCase();
            const id = (titleToId as Record<string, string | null>)[key];
            const exists = !!id;
            const href = exists
              ? `/notes/${id}`
              : `/notes/new?title=${encodeURIComponent(title)}`;
            const display = exists ? title : `[[${title}]]`;
            const linkNode: Link = {
              type: "link",
              url: href,
              title: exists ? title : `Create note "${title}"`,
              children: [{ type: "text", value: display } as Text],
            };
            newNodes.push(linkNode as unknown as Content);
            last = m.index + m[0].length;
          }
          if (last === 0) return;
          if (last < value.length) {
            newNodes.push({ type: "text", value: value.slice(last) } as Text);
          }
          parent.children.splice(index, 1, ...newNodes);
          return index + newNodes.length;
        });
      };
    }
    return plugin as unknown as PluggableList[number];
  }, [titleToId]);

  // Simple preprocessor: convert :::type Title ... ::: blocks into fenced code
  // blocks we render specially in the code renderer.
  const preprocessAdmonitions = useCallback((src: string) => {
    const pattern = new RegExp(
      String.raw`^:::\s*([a-zA-Z]+)\s*(.*)\r?\n([\s\S]*?)^:::\s*(?:\r?\n|$)`,
      "gmi"
    );
    return src.replace(
      pattern,
      (_m, t: string, titleTail: string, body: string) => {
        const type = (t || "info").toLowerCase();
        const title = (titleTail || type).trim();
        const cleaned = (body || "").replace(/\s+$/, "");
        return [
          "```admo-" + type,
          title || type.toUpperCase(),
          "",
          cleaned,
          "```",
          "",
        ].join("\n");
      }
    );
  }, []);

  const processed = useMemo(
    () => preprocessAdmonitions(markdown),
    [markdown, preprocessAdmonitions]
  );

  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm, ...(resolverReady ? [remarkWikiLinks] : [])]}
      rehypePlugins={[rehypeHighlight]}
      components={{
        a: (props) => {
          const href = (props.href as string) || "";
          const external = /^(https?:)?\/\//i.test(href);
          const classNames = [props.className ?? "", "link"];
          // Use title attr inserted by plugin to infer existence for styling
          const titleAttr = props.title as string | undefined;
          const isWiki = !!titleAttr; // plugin sets title to the wiki text
          const exists = isWiki && href.startsWith("/notes/");
          if (isWiki) {
            classNames.push(
              exists
                ? "underline decoration-2"
                : "underline decoration-dashed decoration-2"
            );
          }
          return (
            <a
              {...props}
              target={external ? "_blank" : undefined}
              rel={external ? "noopener noreferrer" : undefined}
              className={classNames.join(" ").trim()}
            />
          );
        },
        h1: ({ children, className, ...props }: ComponentProps<"h1">) => (
          <h1
            {...props}
            className={`mt-6 mb-3 text-3xl md:text-4xl font-bold ${
              className ?? ""
            }`}
            style={{ color: "var(--foreground)" }}
          >
            {children}
          </h1>
        ),

        h2: ({ children, className, ...props }: ComponentProps<"h2">) => (
          <h2
            {...props}
            className={`mt-6 mb-3 text-2xl md:text-3xl font-semibold ${
              className ?? ""
            }`}
            style={{ color: "var(--foreground)" }}
          >
            {children}
          </h2>
        ),
        h3: ({ children, className, ...props }: ComponentProps<"h3">) => (
          <h3
            {...props}
            className={`mt-5 mb-2 text-xl md:text-2xl font-semibold ${
              className ?? ""
            }`}
            style={{ color: "var(--foreground)" }}
          >
            {children}
          </h3>
        ),
        h4: ({ children, className, ...props }: ComponentProps<"h4">) => (
          <h4
            {...props}
            className={`mt-4 mb-2 text-lg md:text-xl font-medium ${
              className ?? ""
            }`}
            style={{ color: "var(--foreground)" }}
          >
            {children}
          </h4>
        ),
        h5: ({ children, className, ...props }: ComponentProps<"h5">) => (
          <h5
            {...props}
            className={`mt-3 mb-2 text-base md:text-lg font-medium ${
              className ?? ""
            }`}
            style={{ color: "var(--foreground)" }}
          >
            {children}
          </h5>
        ),
        h6: ({ children, className, ...props }: ComponentProps<"h6">) => (
          <h6
            {...props}
            className={`mt-3 mb-2 text-sm md:text-base font-medium uppercase tracking-wide ${
              className ?? ""
            }`}
            style={{ color: "var(--muted)" }}
          >
            {children}
          </h6>
        ),
        p: ({ children, className, ...props }: ComponentProps<"p">) => (
          <p
            {...props}
            className={`my-3 leading-7 ${className ?? ""}`}
            style={{ color: "var(--foreground)" }}
          >
            {children}
          </p>
        ),
        blockquote: ({
          children,
          className,
          ...props
        }: ComponentProps<"blockquote">) => {
          const type = (
            props as unknown as { [k: string]: string | undefined }
          )["data-admonition"];
          const title = (
            props as unknown as { [k: string]: string | undefined }
          )["data-admonition-title"];
          if (type) {
            const t = String(type).toLowerCase();
            const styles: Record<string, { bg: string; border: string }> = {
              info: {
                bg: "rgba(37,99,235,0.12)",
                border: "rgba(37,99,235,0.35)",
              },
              note: {
                bg: "rgba(59,130,246,0.12)",
                border: "rgba(59,130,246,0.35)",
              },
              tip: {
                bg: "rgba(16,185,129,0.12)",
                border: "rgba(16,185,129,0.35)",
              },
              success: {
                bg: "rgba(16,185,129,0.12)",
                border: "rgba(16,185,129,0.35)",
              },
              warning: {
                bg: "rgba(245,158,11,0.12)",
                border: "rgba(245,158,11,0.35)",
              },
              danger: {
                bg: "rgba(220,38,38,0.12)",
                border: "rgba(220,38,38,0.35)",
              },
              question: {
                bg: "rgba(139,92,246,0.12)",
                border: "rgba(139,92,246,0.35)",
              },
              bug: {
                bg: "rgba(244,63,94,0.12)",
                border: "rgba(244,63,94,0.35)",
              },
              example: {
                bg: "rgba(107,114,128,0.12)",
                border: "rgba(107,114,128,0.35)",
              },
            };
            const c = styles[t] || styles.info;
            return (
              <div
                className={`my-4 rounded border ${className ?? ""}`}
                style={{
                  backgroundColor: c.bg,
                  borderColor: c.border,
                  color: "var(--foreground)",
                }}
              >
                <div
                  className="px-3 py-2 font-semibold"
                  style={{ borderBottom: `1px solid ${c.border}` }}
                >
                  {title || t.toUpperCase()}
                </div>
                <div className="px-3 py-2">{children}</div>
              </div>
            );
          }
          return (
            <blockquote
              {...props}
              className={`my-4 border-l-4 pl-4 italic ${className ?? ""}`}
              style={{ color: "var(--muted)", borderColor: "var(--border)" }}
            >
              {children}
            </blockquote>
          );
        },
        ul: ({ children, className, ...props }: ComponentProps<"ul">) => (
          <ul {...props} className={`my-3 list-disc pl-6 ${className ?? ""}`}>
            {children}
          </ul>
        ),
        ol: ({ children, className, ...props }: ComponentProps<"ol">) => (
          <ol
            {...props}
            className={`my-3 list-decimal pl-6 ${className ?? ""}`}
          >
            {children}
          </ol>
        ),
        li: ({ children, className, ...props }: ComponentProps<"li">) => (
          <li {...props} className={`my-1 ${className ?? ""}`}>
            {children}
          </li>
        ),
        hr: (props: ComponentProps<"hr">) => (
          <hr
            {...props}
            className={`my-6 border-t`}
            style={{ borderColor: "var(--border)" }}
          />
        ),
        table: ({ children, className, ...props }: ComponentProps<"table">) => (
          <div className="my-4 w-full overflow-x-auto">
            <table
              {...props}
              className={`w-full border border-collapse rounded ${
                className ?? ""
              }`}
              style={{ borderColor: "var(--border)" }}
            >
              {children}
            </table>
          </div>
        ),
        thead: ({ children, className, ...props }: ComponentProps<"thead">) => (
          <thead {...props} className={`${className ?? ""}`}>
            {children}
          </thead>
        ),
        tbody: ({ children, className, ...props }: ComponentProps<"tbody">) => (
          <tbody {...props} className={`${className ?? ""}`}>
            {children}
          </tbody>
        ),
        tr: ({ children, className, ...props }: ComponentProps<"tr">) => (
          <tr {...props} className={`${className ?? ""}`}>
            {children}
          </tr>
        ),
        th: ({ children, className, ...props }: ComponentProps<"th">) => (
          <th
            {...props}
            className={`px-3 py-2 text-left font-semibold border ${
              className ?? ""
            }`}
            style={{ borderColor: "var(--border)" }}
          >
            {children}
          </th>
        ),
        td: ({ children, className, ...props }: ComponentProps<"td">) => (
          <td
            {...props}
            className={`px-3 py-2 border align-top ${className ?? ""}`}
            style={{ borderColor: "var(--border)" }}
          >
            {children}
          </td>
        ),
        img: ({ className, ...props }: ComponentProps<"img">) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            {...props}
            className={`my-3 rounded max-w-full ${className ?? ""}`}
            style={{ backgroundColor: "var(--surface)" }}
            alt={(props as { alt?: string }).alt ?? ""}
          />
        ),
        code: (rawProps) => {
          const { inline, className, children, ...props } =
            (rawProps as unknown as {
              inline?: boolean;
              className?: string;
              children?: ReactNode;
            }) ?? {};
          const isInline = inline === true;
          const cls = className || "";
          if (!isInline && cls.startsWith("language-admo-")) {
            const type = cls.replace("language-admo-", "");
            const raw = String(children ?? "");
            const lines = raw.split(/\r?\n/);
            let title = type.toUpperCase();
            if (lines[0]?.toLowerCase().startsWith("title:")) {
              title = lines[0].slice(6).trim() || title;
              lines.shift();
              if (lines[0] === "") lines.shift();
            }
            const body = lines.join("\n");
            const typeClass: Record<string, string> = {
              info: "bg-blue-500/10 border-blue-500/40",
              note: "bg-blue-400/10 border-blue-400/40",
              tip: "bg-emerald-500/10 border-emerald-500/40",
              success: "bg-emerald-500/10 border-emerald-500/40",
              warning: "bg-amber-500/10 border-amber-500/40",
              danger: "bg-red-600/10 border-red-600/40",
              question: "bg-violet-500/10 border-violet-500/40",
              bug: "bg-rose-500/10 border-rose-500/40",
              example: "bg-gray-500/10 border-gray-500/40",
            };
            const containerClasses = `my-4 rounded border admonition admonition-${type} ${
              typeClass[type] || typeClass.info
            }`;
            const headerBorderClass =
              (typeClass[type] || typeClass.info)
                .split(" ")
                .find((c) => c.startsWith("border-")) || "border-blue-500/40";
            return (
              <div className={containerClasses} data-admonition={type}>
                <div
                  className={`px-3 py-2 font-semibold border-b ${headerBorderClass}`}
                >
                  {title}
                </div>
                <div className="px-3 py-2">
                  <ReactMarkdown
                    remarkPlugins={[
                      remarkGfm,
                      ...(resolverReady ? [remarkWikiLinks] : []),
                    ]}
                    rehypePlugins={[rehypeHighlight]}
                  >
                    {body}
                  </ReactMarkdown>
                </div>
              </div>
            );
          }
          if (isInline) {
            return (
              <code
                {...props}
                className={`px-1.5 py-0.5 rounded text-sm ${className ?? ""}`}
                style={{
                  backgroundColor: "rgba(125,125,125,0.15)",
                  color: "var(--foreground)",
                }}
              >
                {children as ReactNode}
              </code>
            );
          }
          return (
            <pre
              className="my-4 rounded border overflow-x-auto"
              style={{
                borderColor: "var(--border)",
                backgroundColor: "#0b1021",
              }}
            >
              <code {...props} className={className}>
                {children as ReactNode}
              </code>
            </pre>
          );
        },
      }}
    >
      {processed}
    </ReactMarkdown>
  );
};
