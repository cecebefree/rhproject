/**
 * RichTextService — Lightweight markdown/HTML conversion for contact notes.
 * Supports: bold, italic, lists, links, code blocks, blockquotes, headings, @mentions.
 */

// ═══════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════

export interface RichTextBlock {
  type: 'paragraph' | 'heading' | 'list' | 'code' | 'blockquote';
  level?: number;
  content: string;
  items?: string[];
}

export interface RichTextDocument {
  blocks: RichTextBlock[];
  mentions: string[];
  links: string[];
}

// ═══════════════════════════════════════════════════════════
// PARSE MARKDOWN → JSON
// ═══════════════════════════════════════════════════════════

export function parseMarkdown(markdown: string): RichTextDocument {
  const lines = markdown.split('\n');
  const blocks: RichTextBlock[] = [];
  const mentions: string[] = [];
  const links: string[] = [];

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];

    // Code block
    if (line.startsWith('```')) {
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      blocks.push({ type: 'code', content: codeLines.join('\n') });
      i++;
      continue;
    }

    // Blockquote
    if (line.startsWith('> ')) {
      const quoteLines: string[] = [];
      while (i < lines.length && lines[i].startsWith('> ')) {
        quoteLines.push(lines[i].slice(2));
        i++;
      }
      blocks.push({ type: 'blockquote', content: quoteLines.join('\n') });
      continue;
    }

    // Heading
    const headingMatch = line.match(/^(#{1,6})\s+(.+)/);
    if (headingMatch) {
      blocks.push({
        type: 'heading',
        level: headingMatch[1].length,
        content: headingMatch[2],
      });
      i++;
      continue;
    }

    // Unordered list
    if (line.match(/^[-*]\s+/)) {
      const items: string[] = [];
      while (i < lines.length && lines[i].match(/^[-*]\s+/)) {
        items.push(lines[i].replace(/^[-*]\s+/, ''));
        i++;
      }
      blocks.push({ type: 'list', content: '', items });
      continue;
    }

    // Ordered list
    if (line.match(/^\d+\.\s+/)) {
      const items: string[] = [];
      while (i < lines.length && lines[i].match(/^\d+\.\s+/)) {
        items.push(lines[i].replace(/^\d+\.\s+/, ''));
        i++;
      }
      blocks.push({ type: 'list', content: '', items });
      continue;
    }

    // Empty line
    if (line.trim() === '') {
      i++;
      continue;
    }

    // Paragraph
    blocks.push({ type: 'paragraph', content: line });
    i++;
  }

  // Extract mentions and links from all content
  const allContent = blocks.map((b) => b.content + ' ' + (b.items || []).join(' ')).join(' ');
  extractMentions(allContent).forEach((m) => mentions.push(m));
  extractLinks(allContent).forEach((l) => links.push(l));

  return { blocks, mentions: [...new Set(mentions)], links: [...new Set(links)] };
}

// ═══════════════════════════════════════════════════════════
// RENDER JSON → HTML
// ═══════════════════════════════════════════════════════════

export function renderHTML(doc: RichTextDocument): string {
  return doc.blocks.map((block) => renderBlock(block)).join('\n');
}

function renderBlock(block: RichTextBlock): string {
  const content = inlineFormat(block.content);

  switch (block.type) {
    case 'heading': {
      const tag = `h${block.level || 1}`;
      return `<${tag}>${content}</${tag}>`;
    }
    case 'list': {
      const items = (block.items || []).map((item) => `<li>${inlineFormat(item)}</li>`).join('\n');
      return `<ul>\n${items}\n</ul>`;
    }
    case 'code':
      return `<pre><code>${escapeHtml(block.content)}</code></pre>`;
    case 'blockquote':
      return `<blockquote>${content}</blockquote>`;
    case 'paragraph':
    default:
      return `<p>${content}</p>`;
  }
}

function inlineFormat(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code>$1</code>')
    .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
    .replace(/@(\w+)/g, '<span class="mention" data-user="$1">@$1</span>');
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// ═══════════════════════════════════════════════════════════
// EXTRACT MENTIONS
// ═══════════════════════════════════════════════════════════

export function extractMentions(content: string): string[] {
  const matches = content.match(/@(\w+)/g) || [];
  return matches.map((m) => m.slice(1));
}

// ═══════════════════════════════════════════════════════════
// EXTRACT LINKS
// ═══════════════════════════════════════════════════════════

export function extractLinks(content: string): string[] {
  const matches = content.match(/https?:\/\/[^\s)]+/g) || [];
  return matches;
}

// ═══════════════════════════════════════════════════════════
// SANITIZE HTML
// ═══════════════════════════════════════════════════════════

export function sanitizeHTML(html: string): string {
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/ on\w+="[^"]*"/gi, '')
    .replace(/ on\w+='[^']*'/gi, '')
    .replace(/javascript:/gi, '');
}

// ═══════════════════════════════════════════════════════════
// SIMPLE MARKDOWN RENDERER (for quick display)
// ═══════════════════════════════════════════════════════════

export function renderMarkdownSimple(markdown: string): string {
  const doc = parseMarkdown(markdown);
  return renderHTML(doc);
}
