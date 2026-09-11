// Minimal rich-text: textarea -> safe HTML. Client-safe.
// Supports: paragraphs, line breaks, **bold**, *italic*, [text](url), bullet lists (- or *).

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function inlineFormat(escaped: string): string {
  // Links [text](https://...)
  let out = escaped.replace(
    /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>'
  );
  // Bold **x**
  out = out.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  // Italic *x*
  out = out.replace(/(^|[^*])\*([^*\n]+)\*/g, "$1<em>$2</em>");
  return out;
}

export function textToHtml(text: string): string {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const blocks: string[] = [];
  let listItems: string[] = [];

  const flushList = () => {
    if (listItems.length > 0) {
      blocks.push(`<ul>${listItems.map((li) => `<li>${inlineFormat(escapeHtml(li))}</li>`).join("")}</ul>`);
      listItems = [];
    }
  };

  for (const line of lines) {
    const bullet = line.match(/^\s*[-*•]\s+(.*)$/);
    if (bullet) {
      listItems.push(bullet[1]);
    } else if (line.trim() === "") {
      flushList();
      // paragraph break marker
      blocks.push("");
    } else {
      flushList();
      blocks.push(`<p>${inlineFormat(escapeHtml(line)).replace(/  /g, " &nbsp;")}</p>`);
    }
  }
  flushList();
  // Collapse consecutive breaks into paragraph spacing
  return blocks.filter((b) => b !== "").join("\n");
}
