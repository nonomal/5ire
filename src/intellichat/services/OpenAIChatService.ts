// import Debug from 'debug';
import {
  IChatContext,
  IChatRequestMessage,
  IChatRequestPayload,
  IChatMessage,
  IChatRequestMessageContent,
  IAnthropicTool,
  IOpenAITool,
  IMCPTool,
  IGoogleTool,
} from 'intellichat/types';
import { isBlank } from 'utils/validators';
import { splitByImg, stripHtmlTags, urlJoin } from 'utils/util';
import OpenAIReader from 'intellichat/readers/OpenAIReader';
import { ITool } from 'intellichat/readers/IChatReader';
import Ollama from 'providers/Ollama';
import NextChatService from './NextChatService';
import INextChatService from './INextCharService';
import OpenAI from '../../providers/OpenAI';

// const debug = Debug('5ire:intellichat:OpenAIChatService');

export default class OpenAIChatService
  extends NextChatService
  implements INextChatService
{
  constructor(name: string, context: IChatContext) {
    super({
      name,
      context,
      provider: OpenAI,
    });
  }

  // eslint-disable-next-line class-methods-use-this
  protected getReaderType() {
    return OpenAIReader;
  }

  protected async convertPromptContent(
    content: string,
  ): Promise<
    string | IChatRequestMessageContent[] | Partial<IChatRequestMessageContent>
  > {
    if (this.context.getModel().capabilities.vision?.enabled) {
      const items = splitByImg(content);
      const result: IChatRequestMessageContent[] = [];
      items.forEach((item: any) => {
        if (item.type === 'image') {
          result.push({
            type: 'image_url',
            image_url: {
              url: item.data,
            },
          });
        } else if (item.type === 'text') {
          result.push({
            type: 'text',
            text: item.data,
          });
        } else {
          throw new Error('Unknown message type');
        }
      });
      return result;
    }
    return stripHtmlTags(content);
  }

  // eslint-disable-next-line class-methods-use-this
  protected async makeMessages(
    messages: IChatRequestMessage[],
    msgId?: string,
  ): Promise<IChatRequestMessage[]> {
    const result = [];
    const model = this.context.getModel();
    const systemMessage = this.context.getSystemMessage();
    let sysRole = this.getSystemRoleName();
    if (['o1', 'o3'].some((prefix) => model.name.startsWith(prefix))) {
      sysRole = 'user'; // right now, o1, o3 models are not compatible with the system message
    }
    if (!isBlank(systemMessage)) {
      result.push({
        role: sysRole,
        content: systemMessage,
      });
    }
    this.context.getCtxMessages(msgId).forEach((msg: IChatMessage) => {
      result.push({
        role: 'user',
        content: msg.prompt,
      });
      result.push({
        role: 'assistant',
        content: msg.reply,
      });
    });

    const processedMessages = await Promise.all(
      messages.map(async (msg) => {
        if (msg.role === 'tool') {
          // Helper function to format tool message content
          const formatToolMsgContent = (content: any): string => {
            if (typeof content === 'string') {
              return content;
            }

            if (Array.isArray(content)) {
              return content
                .map((item) => {
                  if (typeof item === 'string') return item;
                  if (item && typeof item === 'object') {
                    if (item.type === 'text' && typeof item.text === 'string') {
                      return item.text;
                    }
                    return JSON.stringify(item);
                  }

                  return String(item);
                })
                .join(' ');
            }

            if (content && typeof content === 'object') {
              if (
                'type' in content &&
                content.type === 'text' &&
                typeof content.text === 'string'
              ) {
                return content.text;
              }
            }

            return String(content);
          };

          return {
            role: 'tool',
            content: formatToolMsgContent(msg.content),
            name: msg.name,
            tool_call_id: msg.tool_call_id,
          };
        }
        if (msg.role === 'assistant' && msg.tool_calls) {
          return msg;
        }
        const { content } = msg;
        if (typeof content === 'string') {
          const formattedContent = await this.convertPromptContent(content);
          // Note: Ollama's API requires the content to be in a specific format
          if (this.name === Ollama.name) {
            return {
              role: 'user',
              ...(formattedContent as Partial<IChatRequestMessageContent>),
            };
          }
          return {
            role: 'user',
            content: formattedContent,
          };
        }
        return {
          role: 'user',
          content,
        };
      }),
    );
    result.push(...processedMessages);
    return result as IChatRequestMessage[];
  }

  // eslint-disable-next-line class-methods-use-this
  protected makeTool(
    tool: IMCPTool,
  ): IOpenAITool | IAnthropicTool | IGoogleTool {
    return {
      type: 'function',
      function: {
        name: tool.name,
        description: tool.description?.substring(0, 1000), // some models have a limit on the description length, like gpt series, so we truncate it
        parameters: {
          type: tool.inputSchema.type,
          properties: tool.inputSchema.properties || {},
          required: tool.inputSchema.required || [],
          additionalProperties: tool.inputSchema.additionalProperties || false,
        },
      },
    };
  }

  // eslint-disable-next-line class-methods-use-this
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
              arguments: JSON.stringify(tool.args),
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

  protected async makePayload(
    message: IChatRequestMessage[],
    msgId?: string,
  ): Promise<IChatRequestPayload> {
    const model = this.context.getModel();
    const payload: IChatRequestPayload = {
      model: model.name,
      messages: await this.makeMessages(message, msgId),
      temperature: this.context.getTemperature(),
      stream: !model.noStreaming,
    };
    if (this.isToolsEnabled()) {
      const tools = await window.electron.mcp.listTools();
      if (tools) {
        const $tools = tools.tools.map((tool: any) => {
          return this.makeTool(tool);
        });
        if ($tools.length > 0) {
          payload.tools = $tools;
          payload.tool_choice = 'auto';
        }
      }
    }
    const maxTokens = this.context.getMaxTokens();
    if (maxTokens) {
      // OpenAI's new API use max_completion_tokens, while others still use max_tokens
      if (this.name.toLocaleLowerCase() === 'openai') {
        payload.max_completion_tokens = maxTokens;
      } else {
        payload.max_tokens = maxTokens;
      }
    }

    if (model.name.startsWith('o1') || model.name.startsWith('o3')) {
      payload.temperature = 1; // o1 and o3 models require temperature to be 1
    }
    return payload;
  }

  protected async makeRequest(
    messages: IChatRequestMessage[],
    msgId?: string,
  ): Promise<Response> {
    const payload = await this.makePayload(messages, msgId);
    const provider = this.context.getProvider();
    const url = urlJoin('/chat/completions', provider.apiBase.trim());

    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${provider.apiKey.trim()}`,
    };
    const isStream = this.context.isStream();
    return this.makeHttpRequest(url, headers, payload, isStream);
  }
}
