import { app } from 'electron';
import fs from 'fs';
import path from 'path';
import url from 'url';
import * as logging from './logging';

const BASE_DIR = path.join(app.getPath('userData'), 'transformers-models');

const BGE_MODEL_DIR = path.join(BASE_DIR, 'Xenova', 'bge-m3');

const FILES: { [key: string]: string } = {
  'model_quantized.onnx': path.join(
    BGE_MODEL_DIR,
    'onnx',
    'model_quantized.onnx',
  ),
  'config.json': path.join(BGE_MODEL_DIR, 'config.json'),
  'tokenizer_config.json': path.join(BGE_MODEL_DIR, 'tokenizer_config.json'),
  'tokenizer.json': path.join(BGE_MODEL_DIR, 'tokenizer.json'),
};

export class Embedder {
  static task: any = 'feature-extraction';

  static model = 'Xenova/bge-m3';
  static instance: any = null;
  private static instancePromise: Promise<any> | null = null;

  public static getFileStatus(): { [key: string]: boolean } {
    const status: { [key: string]: boolean } = {};
    for (const key in FILES) {
      status[key] = fs.existsSync(FILES[key]);
    }
    return status;
  }

  public static removeModel(): void {
    Object.keys(FILES).forEach((key)=>{
      if (fs.existsSync(FILES[key])) {
        fs.unlinkSync(FILES[key]);
      }
    });
  }

  public static saveModelFile(fileName: string, filePath: string): void {
    const modelPath = FILES[fileName];
    const modelDir = path.dirname(modelPath);

    try {
      if (!fs.existsSync(modelDir)) {
        fs.mkdirSync(modelDir, { recursive: true });
      }
      if (fs.existsSync(modelPath)) {
        fs.unlinkSync(modelPath);
      }
      fs.copyFileSync(filePath, modelPath);
      fs.unlinkSync(filePath);

    } catch (err) {
      logging.captureException(err as Error);
      throw err
    }
  }

  public static async getInstance(): Promise<any> {
    if (!Embedder.instancePromise) {
      // use a promise to ensure that the instance is created only once
      Embedder.instancePromise = (async () => {
        if (Embedder.instance) {
          return Embedder.instance;
        }

        let transformers = null;
        if (process.env.NODE_ENV === 'production') {
          // In production, we need to use dynamic import to load the transformers
          const basePath = path.dirname(path.dirname(path.dirname(__dirname)));
          const modelPath = path.join(
            basePath,
            'app.asar.unpacked',
            'node_modules',
            '@xenova',
            'transformers',
            'src',
            'transformers.js',
          );
          const modelUrl = url.pathToFileURL(modelPath).href.replace(/\\/g, '/');
          logging.debug(`Import transformers.js from ${modelUrl}`);
          const dynamicImport = Function(`return import("${modelUrl}")`);
          transformers = await dynamicImport();
        } else {
          transformers = await import('@xenova/transformers');
        }
        const { pipeline, env } = transformers;
        env.allowRemoteModels = false;
        env.localModelPath = BASE_DIR;
        Embedder.instance = await pipeline(Embedder.task, Embedder.model);
        return Embedder.instance;
      })();
    }
    return Embedder.instancePromise;
  }
}

function sleep(ms = 10) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// The run function is used by the `transformers:run` event handler.
export async function embed(
  texts: string[],
  progressCallback?: (total: number, done: number) => void,
): Promise<any[]> {
  const embedder = await Embedder.getInstance();
  let completed = 0;
  const batchSize = 3;
  const results: any[] = [];

  const updateProgress = () => {
    if (progressCallback) {
      completed += 1;
      progressCallback(texts.length, completed);
    }
  };

  const processBatch = async (batch: string[]) => {
    const batchResults = [];
    for (const text of batch) {
      try {
        const res = await embedder(text, { pooling: 'mean', normalize: true });
        updateProgress();
        batchResults.push(res.data);
      } catch (error) {
        logging.captureException(error as Error);
      }
    }
    return batchResults;
  };

  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);
    const batchResults = await processBatch(batch);
    results.push(...batchResults);
    await sleep(50);
  }

  return results;
}
