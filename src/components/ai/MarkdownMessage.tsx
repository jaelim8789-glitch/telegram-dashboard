"use client";

import React from "react";

interface MarkdownProps {
  content: string;
  className?: string;
}

/**
 * Lightweight Markdown renderer — handles:
 * - **bold** / *italic*
 * - `code` / ```code blocks```
 * - [links](url) → auto-linkify
 * - - lists / 1. numbered lists
 * - > blockquotes
 * - ~~strikethrough~~
 *
 * No external dependencies required.
 */
export function MarkdownMessage({ content, className }: MarkdownProps) {
  if (!content) return null;

  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];
  let inCodeBlock = false;
  let codeLines: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Code block fence
    if (line.trim().startsWith("```")) {
      if (inCodeBlock) {
        elements.push(
          <pre key={`code-${i}`} className="my-1.5 overflow-x-auto rounded-lg bg-app-border/30 p-2.5 text-[11px] font-mono text-app-text leading-relaxed">
            <code>{codeLines.join("\n")}</code>
          </pre>
        );
        codeLines = [];
        inCodeBlock = false;
      } else {
        inCodeBlock = true;
      }
      i++;
      continue;
    }

    if (inCodeBlock) {
      codeLines.push(line);
      i++;
      continue;
    }

    // Empty line
    if (!line.trim()) {
      elements.push(<div key={`br-${i}`} className="h-2" />);
      i++;
      continue;
    }

    // Blockquote
    if (line.trim().startsWith("> ")) {
      elements.push(
        <blockquote key={`bq-${i}`} className="my-1 border-l-2 border-app-primary/30 pl-3 text-[12px] text-app-text-muted italic">
          {parseInline(line.trim().slice(2))}
        </blockquote>
      );
      i++;
      continue;
    }

    // Unordered list
    if (/^[\s]*[-*+]\s/.test(line)) {
      const items: React.ReactNode[] = [];
      while (i < lines.length && /^[\s]*[-*+]\s/.test(lines[i])) {
        items.push(
          <li key={`li-${i}`} className="ml-4 list-disc text-[12px] text-app-text leading-relaxed">
            {parseInline(lines[i].replace(/^[\s]*[-*+]\s/, ""))}
          </li>
        );
        i++;
      }
      elements.push(<ul key={`ul-${i}`} className="my-1 space-y-0.5">{items}</ul>);
      continue;
    }

    // Ordered list
    if (/^\d+[.)]\s/.test(line)) {
      const items: React.ReactNode[] = [];
      while (i < lines.length && /^\d+[.)]\s/.test(lines[i])) {
        items.push(
          <li key={`oli-${i}`} className="ml-4 list-decimal text-[12px] text-app-text leading-relaxed">
            {parseInline(lines[i].replace(/^\d+[.)]\s/, ""))}
          </li>
        );
        i++;
      }
      elements.push(<ol key={`ol-${i}`} className="my-1 space-y-0.5">{items}</ol>);
      continue;
    }

    // Heading
    if (line.trim().startsWith("### ")) {
      elements.push(<h4 key={`h-${i}`} className="mt-1 text-[13px] font-bold text-app-text">{parseInline(line.trim().slice(4))}</h4>);
      i++; continue;
    }
    if (line.trim().startsWith("## ")) {
      elements.push(<h3 key={`h-${i}`} className="mt-1.5 text-sm font-bold text-app-text">{parseInline(line.trim().slice(3))}</h3>);
      i++; continue;
    }
    if (line.trim().startsWith("# ")) {
      elements.push(<h2 key={`h-${i}`} className="mt-2 text-[15px] font-bold text-app-text">{parseInline(line.trim().slice(2))}</h2>);
      i++; continue;
    }

    // Divider
    if (/^[-*_]{3,}$/.test(line.trim())) {
      elements.push(<hr key={`hr-${i}`} className="my-2 border-app-border/30" />);
      i++; continue;
    }

    // Regular paragraph
    elements.push(
      <p key={`p-${i}`} className="text-[12px] text-app-text leading-relaxed">
        {parseInline(line)}
      </p>
    );
    i++;
  }

  // Close unclosed code block
  if (inCodeBlock && codeLines.length > 0) {
    elements.push(
      <pre key="code-last" className="my-1.5 overflow-x-auto rounded-lg bg-app-border/30 p-2.5 text-[11px] font-mono text-app-text">
        <code>{codeLines.join("\n")}</code>
      </pre>
    );
  }

  return <div className={className}>{elements}</div>;
}

function parseInline(text: string): React.ReactNode[] {
  if (!text) return [];
  const parts: React.ReactNode[] = [];
  let remaining = text;
  let key = 0;

  while (remaining.length > 0) {
    // Bold: **text**
    const boldMatch = remaining.match(/^(.*?)\*\*(.+?)\*\*/s);
    // Italic: *text* (but not **)
    const italicMatch = remaining.match(/^(.*?)(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/);
    // Strikethrough: ~~text~~
    const strikeMatch = remaining.match(/^(.*?)~~(.+?)~~/);
    // Inline code: `text`
    const codeMatch = remaining.match(/^(.*?)`(.+?)`/);
    // Link: [text](url)
    const linkMatch = remaining.match(/^(.*?)\[(.+?)\]\((.+?)\)/);
    // Auto-link: https?://...
    const urlMatch = remaining.match(/^(.*?)(https?:\/\/\S+)/);

    // Find the first match
    type Match = { index: number; render: () => React.ReactNode; consume: number };
    const matches: Match[] = [];

    if (boldMatch) matches.push({
      index: boldMatch[1]?.length ?? 0,
      render: () => <strong key={++key} className="font-bold">{parseInline(boldMatch[2])}</strong>,
      consume: boldMatch[0].length,
    });
    if (italicMatch) matches.push({
      index: italicMatch[1]?.length ?? 0,
      render: () => <em key={++key}>{parseInline(italicMatch[2])}</em>,
      consume: italicMatch[0].length,
    });
    if (strikeMatch) matches.push({
      index: strikeMatch[1]?.length ?? 0,
      render: () => <del key={++key} className="line-through text-app-text-muted">{parseInline(strikeMatch[2])}</del>,
      consume: strikeMatch[0].length,
    });
    if (codeMatch) matches.push({
      index: codeMatch[1]?.length ?? 0,
      render: () => <code key={++key} className="rounded bg-app-border/40 px-1 py-0.5 text-[11px] font-mono">{codeMatch[2]}</code>,
      consume: codeMatch[0].length,
    });
    if (linkMatch) matches.push({
      index: linkMatch[1]?.length ?? 0,
      render: () => <a key={++key} href={linkMatch[3]} target="_blank" rel="noopener noreferrer" className="text-app-primary underline decoration-app-primary/30 hover:decoration-app-primary">{parseInline(linkMatch[2])}</a>,
      consume: linkMatch[0].length,
    });
    if (urlMatch) matches.push({
      index: urlMatch[1]?.length ?? 0,
      render: () => <a key={++key} href={urlMatch[2]} target="_blank" rel="noopener noreferrer" className="text-app-primary underline break-all">{urlMatch[2]}</a>,
      consume: urlMatch[0].length,
    });

    if (matches.length === 0) {
      parts.push(<span key={++key}>{remaining}</span>);
      break;
    }

    matches.sort((a, b) => a.index - b.index);
    const first = matches[0];

    if (first.index > 0) {
      parts.push(<span key={++key}>{remaining.slice(0, first.index)}</span>);
    }

    parts.push(first.render());
    remaining = remaining.slice(first.consume);
  }

  return parts;
}
