// Tiny markdown renderer for the care guide. Supports:
//  - # / ## / ### headings
//  - bullet lists (- prefix)
//  - numbered lists (1. prefix)
//  - tables (| sep | sep |)
//  - blockquotes (> prefix)
//  - **bold**, *italic*, `code`
//  - paragraphs
// Not a full implementation — just enough for our static content.

import React from "react";

interface Props { source: string }

function inline(text: string): React.ReactNode {
  // Process inline formatting. Sequence matters: code → bold → italic.
  const parts: React.ReactNode[] = [];
  let key = 0;
  const re = /(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g;
  let last = 0;
  for (const m of text.matchAll(re)) {
    const idx = m.index ?? 0;
    if (idx > last) parts.push(text.slice(last, idx));
    const seg = m[0];
    if (seg.startsWith("`")) {
      parts.push(<code key={key++} className="rounded px-1.5 py-0.5 text-[0.92em]" style={{ background: "rgba(255,255,255,0.08)", color: "#fbcfe8" }}>{seg.slice(1, -1)}</code>);
    } else if (seg.startsWith("**")) {
      parts.push(<strong key={key++} className="font-display tracking-wide text-white">{seg.slice(2, -2)}</strong>);
    } else if (seg.startsWith("*")) {
      parts.push(<em key={key++} className="italic">{seg.slice(1, -1)}</em>);
    }
    last = idx + seg.length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

export function Markdown({ source }: Props) {
  const lines = source.replace(/\r/g, "").split("\n");
  const blocks: React.ReactNode[] = [];
  let i = 0;
  let key = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Headings
    if (line.startsWith("### ")) { blocks.push(<h3 key={key++} className="font-display text-base mt-4 mb-1.5" style={{ color: "#86efac" }}>{inline(line.slice(4))}</h3>); i++; continue; }
    if (line.startsWith("## "))  { blocks.push(<h2 key={key++} className="font-display text-lg mt-5 mb-2"  style={{ color: "#fde68a" }}>{inline(line.slice(3))}</h2>); i++; continue; }
    if (line.startsWith("# "))   { blocks.push(<h1 key={key++} className="font-display text-2xl mt-2 mb-3" style={{ color: "#fef3c7" }}>{inline(line.slice(2))}</h1>); i++; continue; }

    // Table
    if (line.startsWith("|") && lines[i + 1]?.startsWith("|") && /^\|[\s:-]+\|/.test(lines[i + 1])) {
      const header = line.split("|").slice(1, -1).map(c => c.trim());
      i += 2;
      const rows: string[][] = [];
      while (i < lines.length && lines[i].startsWith("|")) {
        rows.push(lines[i].split("|").slice(1, -1).map(c => c.trim()));
        i++;
      }
      blocks.push(
        <div key={key++} className="my-3 overflow-x-auto rounded-lg" style={{ border: "1px solid rgba(255,255,255,0.10)" }}>
          <table className="w-full text-[13px] border-collapse">
            <thead><tr>{header.map((h, j) => <th key={j} className="text-left px-3 py-2 font-display text-[11px] tracking-widest text-amber-200" style={{ background: "rgba(0,0,0,0.4)", borderBottom: "1px solid rgba(255,255,255,0.10)" }}>{h}</th>)}</tr></thead>
            <tbody>{rows.map((r, ri) => (
              <tr key={ri} style={{ background: ri % 2 ? "rgba(255,255,255,0.025)" : "transparent" }}>
                {r.map((c, ci) => <td key={ci} className="px-3 py-2 text-white align-top" style={{ borderTop: ri ? "1px solid rgba(255,255,255,0.05)" : undefined }}>{inline(c)}</td>)}
              </tr>
            ))}</tbody>
          </table>
        </div>
      );
      continue;
    }

    // Bullet list
    if (/^[-•] /.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^[-•] /.test(lines[i])) {
        items.push(lines[i].replace(/^[-•] /, ""));
        i++;
      }
      blocks.push(<ul key={key++} className="list-disc pl-5 my-2 space-y-1 text-[13px] text-amber-50 leading-relaxed">{items.map((it, j) => <li key={j}>{inline(it)}</li>)}</ul>);
      continue;
    }

    // Numbered list
    if (/^\d+\. /.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\. /.test(lines[i])) {
        items.push(lines[i].replace(/^\d+\. /, ""));
        i++;
      }
      blocks.push(<ol key={key++} className="list-decimal pl-5 my-2 space-y-1 text-[13px] text-amber-50 leading-relaxed">{items.map((it, j) => <li key={j}>{inline(it)}</li>)}</ol>);
      continue;
    }

    // Blockquote
    if (line.startsWith("> ")) {
      const quotedLines: string[] = [];
      while (i < lines.length && lines[i].startsWith("> ")) {
        quotedLines.push(lines[i].slice(2));
        i++;
      }
      blocks.push(
        <blockquote key={key++} className="my-3 px-4 py-3 rounded-lg" style={{ background: "rgba(220,38,38,0.12)", borderLeft: "4px solid #fca5a5" }}>
          {quotedLines.map((q, j) => <div key={j} className="text-[13px] text-red-100 leading-relaxed">{inline(q)}</div>)}
        </blockquote>
      );
      continue;
    }

    // Empty line — paragraph break
    if (line.trim() === "") { i++; continue; }

    // Plain paragraph
    blocks.push(<p key={key++} className="text-[13px] text-amber-50 leading-relaxed my-2">{inline(line)}</p>);
    i++;
  }
  return <div>{blocks}</div>;
}
