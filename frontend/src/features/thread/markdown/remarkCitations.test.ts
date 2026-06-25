import { describe, expect, it } from 'vitest';
import { remarkCitations } from './remarkCitations';

type TestAstNode = {
  type: string;
  value?: string;
  url?: string;
  children?: TestAstNode[];
};

function runRemarkCitations(tree: TestAstNode): TestAstNode {
  const transform = remarkCitations();
  transform(tree);
  return tree;
}

describe('remarkCitations', () => {
  it('converts numeric citation markers into citation links', () => {
    const tree = runRemarkCitations({
      type: 'root',
      children: [
        {
          type: 'paragraph',
          children: [
            {
              type: 'text',
              value: 'Prisma supports relations [1] and migrations [2].',
            },
          ],
        },
      ],
    });

    expect(tree.children?.[0].children).toEqual([
      { type: 'text', value: 'Prisma supports relations ' },
      {
        type: 'link',
        url: 'citation:1',
        children: [{ type: 'text', value: '1' }],
      },
      { type: 'text', value: ' and migrations ' },
      {
        type: 'link',
        url: 'citation:2',
        children: [{ type: 'text', value: '2' }],
      },
      { type: 'text', value: '.' },
    ]);
  });

  it('does not convert markers inside code or inline code nodes', () => {
    const tree = runRemarkCitations({
      type: 'root',
      children: [
        { type: 'code', value: 'const citation = [1];' },
        {
          type: 'paragraph',
          children: [
            { type: 'inlineCode', value: '[2]' },
            { type: 'text', value: ' outside [3]' },
          ],
        },
      ],
    });

    expect(tree.children?.[0]).toEqual({
      type: 'code',
      value: 'const citation = [1];',
    });
    expect(tree.children?.[1].children).toEqual([
      { type: 'inlineCode', value: '[2]' },
      { type: 'text', value: ' outside ' },
      {
        type: 'link',
        url: 'citation:3',
        children: [{ type: 'text', value: '3' }],
      },
    ]);
  });
});
