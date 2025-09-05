/* eslint-disable max-classes-per-file */
import fs from 'fs';
import path from 'node:path';
import pdf from 'pdf-parse';
import officeParser from 'officeparser';
import { app } from 'electron';
import * as logging from './logging';

abstract class BaseLoader {
  protected abstract read(filePath: string): Promise<string>;

  async load(filePath: string): Promise<string> {
    return this.read(filePath);
  }
}

class TextDocumentLoader extends BaseLoader {
  async read(filePath: fs.PathLike): Promise<string> {
    return fs.promises.readFile(filePath, 'utf-8');
  }
}

class OfficeLoader extends BaseLoader {
  async read(filePath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      officeParser.parseOffice(filePath, (text: string, error: any) => {
        if (error) {
          reject(error);
        } else {
          resolve(text);
        }
      });
    });
  }
}

class PdfLoader extends BaseLoader {
  async read(filePath: fs.PathLike): Promise<string> {
    const dataBuffer = fs.readFileSync(filePath);
    const data = await pdf(dataBuffer);
    return data.text;
  }
}

export async function loadDocument(
  filePath: string,
  fileType: string,
): Promise<string> {
  logging.info(`load file from  ${filePath} on ${process.platform}`);
  let Loader: new () => BaseLoader;
  switch (fileType) {
    case 'txt':
      Loader = TextDocumentLoader;
      break;
    case 'md':
      Loader = TextDocumentLoader;
      break;
    case 'csv':
      Loader = TextDocumentLoader;
      break;
    case 'pdf':
      Loader = PdfLoader;
      break;
    case 'docx':
      Loader = OfficeLoader;
      break;
    case 'pptx':
      Loader = OfficeLoader;
      break;
    case 'xlsx':
      Loader = OfficeLoader;
      break;
    default:
      throw new Error(`Miss Loader for: ${fileType}`);
  }
  const loader = new Loader();
  let result = await loader.load(filePath);
  result = result.replace(/ +/g, ' ');
  const paragraphs = result
    .split(/\r?\n\r?\n/)
    .map((i) => i.replace(/\s+/g, ' '))
    .filter((i) => i.trim() !== '');
  return paragraphs.join('\r\n\r\n');
}

export const loadDocumentFromBuffer = (
  buffer: Uint8Array,
  fileType: string,
) => {
  const filePath = path.resolve(app.getPath('temp'), crypto.randomUUID());
  fs.writeFileSync(filePath, buffer);
  return loadDocument(filePath, fileType);
};

export default loadDocument;
