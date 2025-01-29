import { processNestedCodeBlocks, transformThinkingTags } from '../ChatMessage';

describe('processNestedCodeBlocks', () => {
  it('should handle nested code blocks', () => {
    const input = `\`\`\`markdown
Here's a nested block
\`\`\`python
print("hello")
\`\`\`
\`\`\``;

    const expected = `~~~markdown
Here's a nested block
\`\`\`python
print("hello")
\`\`\`
~~~`;

    expect(processNestedCodeBlocks(input)).toEqual({
      processedContent: expected,
      fences: ['markdown']
    });
  });

  it('should not modify single code blocks', () => {
    const input = `\`\`\`python
print("hello")
\`\`\``;

    expect(processNestedCodeBlocks(input)).toEqual({
      processedContent: input,
      fences: []
    });
  });

  it('should handle multiple nested blocks', () => {
    const input = `\`\`\`markdown
First block
\`\`\`python
print("hello")
\`\`\`
Second block
\`\`\`javascript
console.log("world")
\`\`\`
\`\`\``;

    const expected = `~~~markdown
First block
\`\`\`python
print("hello")
\`\`\`
Second block
\`\`\`javascript
console.log("world")
\`\`\`
~~~`;

    expect(processNestedCodeBlocks(input)).toEqual({
      processedContent: expected,
      fences: ['markdown']
    });
  });
});

describe('transformThinkingTags', () => {
  it('should transform thinking tags to details/summary', () => {
    const input = 'Before <thinking>Some thoughts</thinking> After';
    const expected = 'Before <details><summary>💭 Thinking</summary>\n\nSome thoughts\n\n</details> After';

    expect(transformThinkingTags(input)).toBe(expected);
  });

  it('should handle multiple thinking tags', () => {
    const input = '<thinking>First thought</thinking> Middle <thinking>Second thought</thinking>';
    const expected = '<details><summary>💭 Thinking</summary>\n\nFirst thought\n\n</details> Middle <details><summary>💭 Thinking</summary>\n\nSecond thought\n\n</details>';

    expect(transformThinkingTags(input)).toBe(expected);
  });

  it('should not transform thinking tags within code blocks', () => {
    const input = '`<thinking>Code block</thinking>`';
    expect(transformThinkingTags(input)).toBe(input);
  });
});
