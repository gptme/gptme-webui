import { getCodeBlockEmoji } from '@/utils/markdownUtils';
import * as smd from '@/utils/smd';
import { highlightCode } from '@/utils/highlightUtils';

export type CustomRendererData = smd.Default_Renderer_Data & {
  summary: HTMLElement | null;
  code: HTMLElement | null;
  lang: string | null;
};

export type CustomRenderer = Omit<
  smd.Default_Renderer,
  'add_token' | 'end_token' | 'set_attr' | 'add_text'
> & {
  add_token: (data: CustomRendererData, type: smd.Token) => void;
  end_token: (data: CustomRendererData) => void;
  set_attr: (data: CustomRendererData, type: smd.Attr, value: string) => void;
  add_text: (data: CustomRendererData, text: string) => void;
  data: CustomRendererData;
};

export function customRenderer(root: HTMLElement): CustomRenderer {
  return {
    add_token: (data: CustomRendererData, type: smd.Token) => {
      let parent = data.nodes[data.index];
      let slot;

      switch (type) {
        case smd.CODE_BLOCK:
        case smd.CODE_FENCE: {
          parent = parent.appendChild(document.createElement('details'));
          parent.setAttribute('open', 'true');
          data.summary = parent.appendChild(document.createElement('summary'));
          data.summary.textContent = '💻 Code';
          parent = parent.appendChild(document.createElement('pre'));
          slot = document.createElement('code');
          data.code = slot;
          slot.setAttribute('class', 'hljs');
          break;
        }
        default:
          smd.default_add_token(data, type);
          return;
      }
      data.nodes[++data.index] = parent.appendChild(slot);
    },
    end_token: (data: CustomRendererData) => {
      data.summary = null;
      data.lang = null;
      data.code = null;
      smd.default_end_token(data);
    },
    add_text: (data: CustomRendererData, text: string) => {
      // Highlight code blocks
      if (data.lang) {
        const previousText = data.nodes[data.index].textContent;
        const newText = previousText + text;
        const langFromInfo = data.lang ? data.lang.split('.').pop() : undefined;
        const highlighted = highlightCode(newText, langFromInfo, true);
        data.nodes[data.index].innerHTML = highlighted;
      } else {
        smd.default_add_text(data, text);
      }
    },
    set_attr: (data: CustomRendererData, type: smd.Attr, value: string) => {
      // Set the language in the summary tag
      if (type === smd.LANG) {
        if (data.summary) {
          const emoji = getCodeBlockEmoji(value);
          data.summary.textContent = `${emoji} ${value}`;
        }
        if (data.code) {
          const langFromInfo = value ? value.split('.').pop() : undefined;
          data.code.setAttribute('class', `hljs ${langFromInfo ? `language-${langFromInfo}` : ''}`);
        }
        data.lang = value;
      } else {
        smd.default_set_attr(data, type, value);
      }
    },
    data: {
      nodes: [root],
      index: 0,
      summary: null,
      lang: null,
      code: null,
    },
  };
}
