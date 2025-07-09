import Debug from 'debug';
import {
  IChatContext,
  IChatRequestMessage,
  IChatRequestMessageContent,
} from 'intellichat/types';
import OllamaReader from 'intellichat/readers/OllamaChatReader';
import { ITool } from 'intellichat/readers/IChatReader';
import { splitByImg, stripHtmlTags, urlJoin } from 'utils/util';
import OpenAIChatService from './OpenAIChatService';
import INextChatService from './INextCharService';
import Ollama from '../../providers/Ollama';

const debug = Debug('5ire:intellichat:OllamaChatService');
export default class OllamaChatService
  extends OpenAIChatService
  implements INextChatService
{
  constructor(name: string, context: IChatContext) {
    super(name, context);
    this.provider = Ollama;
  }

  protected getReaderType() {
    return OllamaReader;
  }

  protected async convertPromptContent(
    content: string,
  ): Promise<
    string | IChatRequestMessageContent[] | Partial<IChatRequestMessageContent>
  > {
    if (this.context.getModel().capabilities.vision?.enabled) {
      const items = splitByImg(content);
      console.log('items', items);
      const textItems = items.filter((item: any) => item.type === 'text');
      const textContent = textItems.map((item: any) => item.data).join('\n');
      const result: { content: string; images?: string[] } = {
        content: textContent || '',
      };
      const imageItems = items.filter((item: any) => item.type === 'image');
      const localImages =
        imageItems
          .filter((item: any) => item.dataType === 'base64')
          .map((i) => {
            const base64Data = i.data.split(',');
            if (base64Data.length < 2) {
              return i.data;
            }
            // remove data:image/png;base64,
            return base64Data[1];
          }) || [];
      const remoteImageItems = items.filter(
        (item: any) => item.dataType === 'URL',
      );
      if (remoteImageItems.length > 0) {
        const base64Images = await Promise.all(
          remoteImageItems.map(async (item: any) => {
            try {
              const response = await fetch(item.data);
              const blob = await response.blob();
              const base64 = await new Promise((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result);
                reader.readAsDataURL(blob);
              });
              return (base64 as string).split(',')[1]; // remove data:image/png;base64,
            } catch (error) {
              console.error('Failed to convert image to base64:', error);
              return null;
            }
          }),
        );
        const validBase64Images = base64Images.filter((img) => img !== null);
        if (validBase64Images.length > 0) {
          result.images = [...localImages, ...validBase64Images];
        }
      } else if (localImages.length > 0) {
        result.images = localImages;
      }
      return result;
    }
    return {
      content: stripHtmlTags(content),
    };
  }

  protected makeToolMessages(
    tool: ITool,
    toolResult: any,
  ): IChatRequestMessage[] {
    return [
      {
        role: 'assistant',
        tool_calls: [
          {
            id: tool.id,
            type: 'function',
            function: {
              arguments: tool.args, // unlike openai, ollama tool args is not a string
              name: tool.name,
            },
          },
        ],
      },
      {
        role: 'tool',
        name: tool.name,
        content:
          typeof toolResult === 'string' ? toolResult : toolResult.content,
        tool_call_id: tool.id,
      },
    ];
  }

  protected async makeRequest(
    messages: IChatRequestMessage[],
    msgId?: string,
  ): Promise<Response> {
    const payload = await this.makePayload(messages, msgId);
    debug('Send Request, payload:\r\n', payload);
    const provider = this.context.getProvider();
    const url = urlJoin('/api/chat', provider.apiBase.trim());
    const headers = {
      'Content-Type': 'application/json',
    };
    const isStream = this.context.isStream();
    return this.makeHttpRequest(url, headers, payload, isStream);
  }
}
