import { marked } from "marked";
import { markedHighlight } from "marked-highlight";
import hljs from "highlight.js";

marked.setOptions({
  gfm: true,
  breaks: true,
  silent: true,
});

marked.use(
  markedHighlight({
    langPrefix: "hljs language-",
    highlight(code, lang, info) {
      lang = info.split(".").pop() || lang;
      const language = hljs.getLanguage(lang) ? lang : "plaintext";
      return hljs.highlight(code, { language }).value;
    },
  })
);

export function processNestedCodeBlocks(content: string) {
    if (content.split('```').length < 3) {
        return { processedContent: content, fences: [] };
    }

    const lines = content.split('\n');
    const stack: string[] = [];
    let result = '';
    let currentBlock: string[] = [];
    const fences: string[] = [];

    for (const line of lines) {
        const strippedLine = line.trim();
        if (strippedLine.startsWith('```')) {
            const lang = strippedLine.slice(3);
            if (stack.length === 0) {
                const remainingContent = lines.slice(lines.indexOf(line) + 1).join('\n');
                if (remainingContent.includes('```') && remainingContent.split('```').length > 2) {
                    stack.push(lang);
                    fences.push(lang);
                    result += '~~~' + lang + '\n';
                } else {
                    result += line + '\n';
                }
            } else if (lang && stack[stack.length - 1] !== lang) {
                currentBlock.push(line);
                stack.push(lang);
            } else {
                if (stack.length === 1) {
                    result += currentBlock.join('\n') + '\n~~~\n';
                    currentBlock = [];
                } else {
                    currentBlock.push(line);
                }
                stack.pop();
            }
        } else if (stack.length > 0) {
            currentBlock.push(line);
        } else {
            result += line + '\n';
        }
    }

    return {
        processedContent: result.trim(),
        fences
    };
}

export function transformThinkingTags(content: string) {
    if (content.startsWith('`') && content.endsWith('`')) {
        return content;
    }

    return content.replace(
        /<thinking>([\s\S]*?)<\/thinking>/g,
        (_match: string, thinkingContent: string) =>
            `<details><summary>💭 Thinking</summary>\n\n${thinkingContent}\n\n</details>`
    );
}

export function parseMarkdownContent(content: string) {
    const processedContent = transformThinkingTags(content);
    const { processedContent: transformedContent, fences } = processNestedCodeBlocks(processedContent);

    let parsedResult = marked.parse(transformedContent, {
        async: false,
    });

    parsedResult = parsedResult.replace(
        /<pre><code(?:\s+class="([^"]+)")?>([^]*?)<\/code><\/pre>/g,
        (_, classes = "", code) => {
            const langtag = ((classes || "").split(" ")[1] || "Code").replace("language-", "");
            const args = fences?.shift() || "";

            const emoji = getCodeBlockEmoji(langtag);
            return `
            <details>
                <summary>${emoji} ${args || langtag}</summary>
                <pre><code class="${classes}">${code}</code></pre>
            </details>
            `;
        }
    );

    return parsedResult;
}

function getCodeBlockEmoji(langtag: string): string {
    if (isPath(langtag)) return "📄";
    if (isTool(langtag)) return "🛠️";
    if (isOutput(langtag)) return "📤";
    if (isWrite(langtag)) return "📝";
    return "💻";
}

function isPath(langtag: string): boolean {
    return (langtag.includes("/") || langtag.includes("\\") || langtag.includes(".")) && langtag.split(" ").length === 1;
}

function isTool(langtag: string): boolean {
    return ["ipython", "shell"].includes(langtag.split(" ")[0]);
}

function isOutput(langtag: string): boolean {
    return ["stdout", "stderr", "result"].includes(langtag.toLowerCase());
}

function isWrite(langtag: string): boolean {
    return ["save", "patch", "append"].includes(langtag.toLowerCase());
}
