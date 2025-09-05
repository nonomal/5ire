import { basename } from 'node:path';

import type { URILoader, URIResource } from './DocumentLoader';

export class HttpURILoader implements URILoader {
  load = async (url: URL): Promise<URIResource> => {
    let response: Response;

    try {
      response = await fetch(url);
    } catch (error) {
      throw new Error(`Failed to load resource: ${url}`);
    }

    if (response.status !== 200) {
      throw new Error(`Failed to load resource: ${url}`);
    }

    const contentType = response.headers.get('content-type');
    const contentLength = response.headers.get('content-length');

    // If body is null, treat it as an empty stream.
    if (!response.body) {
      return {
        mimeType: 'text/plain',
        size: 0,
        stream: new ReadableStream<Uint8Array>({
          start(controller) {
            controller.close();
          },
        }),
      };
    }

    return {
      mimeType:
        // If the Content-Type is 'application/octet-stream', treat it as unknown
        // and return undefined. Otherwise, use the provided Content-Type if available.
        contentType === 'application/octet-stream'
          ? undefined
          : contentType || undefined,
      fileName: basename(url.pathname),
      size: contentLength ? parseInt(contentLength, 10) : undefined,
      stream: response.body,
    };
  };

  getSupportedProtocols = () => {
    return ['http', 'https'];
  };
}

export default HttpURILoader;
