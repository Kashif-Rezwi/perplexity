type AstNode = {
  type: string;
  value?: string;
  url?: string;
  children?: AstNode[];
};

/**
 * Converts numeric citation markers like [1] into mdast link nodes with
 * citation URLs that the markdown renderer can map to CitationBadge.
 */
export function remarkCitations() {
  return (tree: AstNode) => {
    const walk = (node: AstNode) => {
      if (!node) return;
      if (node.type === 'code' || node.type === 'inlineCode') return;

      if (node.children) {
        const newChildren: AstNode[] = [];

        for (const child of node.children) {
          if (child.type === 'text' && child.value) {
            newChildren.push(...splitCitationText(child));
          } else {
            walk(child);
            newChildren.push(child);
          }
        }

        node.children = newChildren;
      }
    };

    walk(tree);
  };
}

function splitCitationText(node: AstNode): AstNode[] {
  const text = node.value ?? '';
  const regex = /\[(\d+)\]/g;
  const parts: AstNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: 'text', value: text.substring(lastIndex, match.index) });
    }

    parts.push({
      type: 'link',
      url: `citation:${match[1]}`,
      children: [{ type: 'text', value: match[1] }],
    });

    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push({ type: 'text', value: text.substring(lastIndex) });
  }

  return parts.length > 0 ? parts : [node];
}
