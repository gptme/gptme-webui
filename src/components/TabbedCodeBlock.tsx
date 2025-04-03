import { useState, useRef, useEffect } from 'react';
import { getCodeBlockEmoji } from '@/utils/markdownUtils';
import * as smd from '@/utils/smd';
import { customRenderer } from '@/utils/markdownRenderer';

/**
 * Props for the TabbedCodeBlock component
 */
interface TabbedCodeBlockProps {
  /** The language or file extension of the code */
  language?: string;
  /** The raw code content to display */
  codeText: string;
  /** The code element to display */
  code: HTMLElement;
}

/**
 * TabbedCodeBlock renders a code block with tabs for switching between
 * code view and preview. Preview is only available for markdown and HTML content.
 *
 * For markdown content, it uses the streaming markdown parser to render the preview.
 * For HTML content, it directly sets the innerHTML.
 */
export const TabbedCodeBlock: React.FC<TabbedCodeBlockProps> = ({ language, codeText, code }) => {
  const [activeTab, setActiveTab] = useState<'code' | 'preview'>('code');
  const previewRef = useRef<HTMLDivElement>(null);
  const [renderError, setRenderError] = useState<string | null>(null);

  const emoji = getCodeBlockEmoji(language || '');

  // Check if this is a markdown code block
  const isMarkdown = language === 'md' || language === 'markdown';

  // Determine if preview should be available - only for markdown or HTML
  const hasPreview = isMarkdown || language === 'html';

  // Handle markdown rendering when the preview tab is selected
  useEffect(() => {
    if (previewRef.current && codeText) {
      try {
        // Clear previous content and error state
        previewRef.current.innerHTML = '';
        setRenderError(null);

        if (isMarkdown) {
          // Use streaming markdown parser for markdown content
          const renderer = customRenderer(previewRef.current);
          const parser = smd.parser(renderer);
          smd.parser_write(parser, codeText);
          smd.parser_end(parser);
        } else if (language === 'html') {
          // For HTML content, just set the innerHTML
          previewRef.current.innerHTML = codeText;
        }
      } catch (error) {
        console.error('Error rendering preview:', error);
        setRenderError('Failed to render preview');
      }
    }
  }, [codeText, language, isMarkdown]);

  return (
    <div>
      <div className="flex bg-gray-50 !p-0 dark:bg-gray-900">
        <button
          className={`px-4 py-2 text-xs font-normal transition-colors ${
            activeTab === 'code'
              ? 'border-b-2 border-blue-500 bg-white dark:bg-gray-800'
              : 'hover:bg-gray-100 dark:hover:bg-gray-800'
          }`}
          onClick={() => setActiveTab('code')}
        >
          {emoji} Code
        </button>
        {hasPreview && (
          <button
            className={`px-4 py-2 text-xs font-normal transition-colors ${
              activeTab === 'preview'
                ? 'border-b-2 border-blue-500 bg-white dark:bg-gray-800'
                : 'hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
            onClick={() => setActiveTab('preview')}
          >
            👁️ Preview
          </button>
        )}
      </div>

      <div className="overflow-auto">
        <pre
          className={`m-0 overflow-auto ${activeTab === 'preview' ? '!hidden' : ''}`}
          dangerouslySetInnerHTML={{ __html: code.outerHTML }}
        />
        {renderError && activeTab === 'preview' && (
          <div className="rounded-md bg-red-50 p-4 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
            {renderError}
          </div>
        )}
        <div
          ref={previewRef}
          className={`preview-content prose prose-sm dark:prose-invert mx-4 !mt-[-10px] mb-4 max-w-none ${
            activeTab === 'code' && !renderError ? '!hidden' : ''
          }`}
        ></div>
      </div>
    </div>
  );
};
