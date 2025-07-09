import Debug from 'debug';
import { IChatResponseMessage } from 'intellichat/types';
import { extractFirstLevelBrackets } from 'utils/util';
import BaseReader from './BaseReader';
import { IReadResult, ITool } from './IChatReader';

const debug = Debug('5ire:intellichat:GoogleReader');

export default class GoogleReader extends BaseReader {
  protected parseReply(chunk: string): IChatResponseMessage {
    const _chunk = chunk.trim();
    try {
      const data = JSON.parse(_chunk);
      if (data.candidates) {
        const firstCandidate = data.candidates[0];
        return {
          content: firstCandidate.content.parts[0].text || '',
          isEnd: firstCandidate.finishReason,
          inputTokens: data.usageMetadata.promptTokenCount,
          outputTokens: data.usageMetadata.candidatesTokenCount,
          toolCalls: firstCandidate.content.parts[0].functionCall,
        };
      }
      return {
        content: '',
        isEnd: false,
        inputTokens: data.usageMetadata?.promptTokenCount,
        outputTokens: data.usageMetadata?.candidatesTokenCount,
      };
    } catch (err) {
      console.error('Error parsing JSON:', err);
      return {
        content: '',
        isEnd: false,
      };
    }
  }

  protected parseTools(respMsg: IChatResponseMessage): ITool | null {
    if (respMsg.toolCalls) {
      return {
        id: '',
        name: respMsg.toolCalls.name,
        args: respMsg.toolCalls.args,
      };
    }
    return null;
  }

  protected parseToolArgs(respMsg: IChatResponseMessage): {
    index: number;
    args: string;
  } | null {
    if (respMsg.toolCalls) {
      return {
        index: 0,
        args: respMsg.toolCalls.args,
      };
    }
    return null;
  }

  public async read({
    onError,
    onProgress,
    onToolCalls,
  }: {
    onError: (error: any) => void;
    onProgress: (chunk: string) => void;
    onToolCalls: (toolCalls: any) => void;
  }): Promise<IReadResult> {
    const decoder = new TextDecoder('utf-8');
    let content = '';
    let inputTokens = 0;
    let outputTokens = 0;
    let done = false;
    let tool = null;
    let buffer = ''; // 用于累积接收到的数据

    try {
      while (!done) {
        /* eslint-disable no-await-in-loop */
        const data = await this.streamReader.read();

        done = data.done || false;
        const value = decoder.decode(data.value);

        // put the received value into the buffer
        buffer += value;

        // try to extract JSON objects from the buffer
        try {
          const items = extractFirstLevelBrackets(buffer);
          if (items.length > 0) {
            for (const item of items) {
              const response = this.parseReply(item);
              content += response.content;
              if (response.inputTokens) {
                inputTokens = response.inputTokens;
              }
              if (response.outputTokens) {
                outputTokens += response.outputTokens;
              }
              if (response.toolCalls) {
                tool = this.parseTools(response);
                onToolCalls(response.toolCalls.name);
              }
              onProgress(response.content || '');
            }

            // Extracting successful, clear processed parts
            // Find the end position of the last complete JSON object
            const lastItemEnd = buffer.lastIndexOf('}') + 1;
            if (lastItemEnd > 0) {
              // Keep the unprocessed part
              buffer = buffer.substring(lastItemEnd);
            }
          }
        } catch (parseErr) {
          debug('JSON parsing incomplete, continuing to collect more data', parseErr);
          // Parsing failed indicates incomplete JSON data, continue accumulating data
        }
      }

      // Process any remaining data at the end of the stream
      if (buffer.trim()) {
        debug('Processing remaining buffer at end of stream');
        try {
          const items = extractFirstLevelBrackets(buffer);
          for (const item of items) {
            const response = this.parseReply(item);
            content += response.content;
            if (response.inputTokens) {
              inputTokens = response.inputTokens;
            }
            if (response.outputTokens) {
              outputTokens += response.outputTokens;
            }
            if (response.toolCalls) {
              tool = this.parseTools(response);
              onToolCalls(response.toolCalls.name);
            }
            onProgress(response.content || '');
          }
        } catch (finalParseErr) {
          debug('Failed to parse remaining buffer', finalParseErr);
        }
      }
    } catch (err) {
      console.error('Read error:', err);
      onError(err);
    } finally {
      return {
        content,
        tool,
        inputTokens,
        outputTokens,
      };
    }
  }
}
