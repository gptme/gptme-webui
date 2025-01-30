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
      if (lang == "shell") lang = "bash";
      if (lang == "result") lang = "markdown";
      const language = hljs.getLanguage(lang) ? lang : "plaintext";
      return hljs.highlight(code, { language }).value;
    },
  })
);

export function processNestedCodeBlocks(content: string) {
    // If no code blocks or only one code block, return as-is
    if (content.split('```').length < 3) {
        const match = content.match(/```(\S*)/);
        return {
            processedContent: content,
            langtags: match ? [match[1]] : []
        };
    }

    const lines = content.split('\n');
    const langtags: string[] = [];
    const result: string[] = [];

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const strippedLine = line.trim();

        if (strippedLine.startsWith('```')) {
            if (strippedLine !== '```') {
                // Start of a code block with a language
                const lang = strippedLine.slice(3);
                langtags.push(lang);
            }
            result.push(line);
        } else {
            result.push(line);
        }
    }

    return {
        processedContent: result.join('\n'),
        langtags: langtags.filter(Boolean)
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
    const { processedContent: transformedContent, langtags } = processNestedCodeBlocks(processedContent);

    let parsedResult = marked.parse(transformedContent, {
        async: false,
    });

    parsedResult = parsedResult.replace(
        /<pre><code(?:\s+class="([^"]+)")?>([^]*?)<\/code><\/pre>/g,
        (_, classes = "", code) => {
            const langtag_fallback = ((classes || "").split(" ")[1] || "Code").replace("language-", "");
            const langtag = langtags?.shift() || langtag_fallback;
            const emoji = getCodeBlockEmoji(langtag);
            return `
            <details>
                <summary>${emoji} ${langtag}</summary>
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
    return ["ipython", "shell", "tmux"].includes(langtag.split(" ")[0].toLowerCase());
}

function isOutput(langtag: string): boolean {
    return ["stdout", "stderr", "result"].includes(langtag.toLowerCase());
}

function isWrite(langtag: string): boolean {
    return ["save", "patch", "append"].includes(langtag.split(" ")[0].toLowerCase());
}
