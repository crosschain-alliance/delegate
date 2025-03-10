import path from "path";
import { createWriteStream, existsSync } from "fs";
import { Readable } from "stream";
import { finished } from "stream/promises";
import { OpenAI } from 'openai';
import { exec } from 'child_process';

declare let _STD_: any;

const WEBHOOK_URL = _STD_.env['WEBHOOK_URL'];
const PROMPT_ID = _STD_.env['PROMPT_ID'];
const directive = _STD_.env['LLM_DIRECTIVE'];
const input = _STD_.env['LLM_PROMPT'];
// const MODEL_URL = "https://huggingface.co/bartowski/Qwen_QwQ-32B-GGUF/resolve/main/Qwen_QwQ-32B-Q4_0.gguf" // NOT WORKING
// const MODEL_URL = "https://huggingface.co/bartowski/Qwen2.5-14B-Instruct-GGUF/resolve/main/Qwen2.5-14B-Instruct-Q4_0_4_4.gguf"
const MODEL_URL = "https://huggingface.co/bartowski/Meta-Llama-3.1-8B-Instruct-GGUF/resolve/main/Meta-Llama-3.1-8B-Instruct-Q4_0_4_4.gguf"
// const MODEL_URL = "https://huggingface.co/bartowski/Qwen2.5.1-Coder-7B-Instruct-GGUF/resolve/main/Qwen2.5.1-Coder-7B-Instruct-Q4_0_4_4.gguf"
// const MODEL_URL = "https://huggingface.co/bartowski/Llama-3.2-3B-Instruct-GGUF/resolve/main/Llama-3.2-3B-Instruct-Q4_0_4_4.gguf"
// const MODEL_URL = "https://huggingface.co/bartowski/Qwen2.5-0.5B-Instruct-GGUF/resolve/main/Qwen2.5-0.5B-Instruct-Q4_K_M.gguf";
const STORAGE_DIR = _STD_.job.storageDir;
// const MODEL = "Qwen_QwQ-32B-Q4_0.gguf" // NOT WORKING
// const MODEL = "Qwen2.5-14B-Instruct-Q4_0_4_4"
const MODEL = "Meta-Llama-3.1-8B-Instruct-Q4_0_4_4"
// const MODEL = "Qwen2.5.1-Coder-7B-Instruct-Q4_0_4_4"
// const MODEL = "Llama-3.2-3B-Instruct-Q4_0_4_4"
// const MODEL = "Qwen2.5-0.5B-Instruct-Q4_K_M"
const MODEL_NAME = `${MODEL}.gguf`;
const MODEL_FILE = path.resolve(STORAGE_DIR, MODEL_NAME);

async function log(message: string, additionalData: object = {}) {
  const body = {
    message,
    timestamp: Date.now(),
    ...additionalData,
  };

  await fetch(WEBHOOK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function downloadModel(url: string, destination: string) {
  await log(`Preparing model: ${MODEL_NAME}`, {promptId: PROMPT_ID});
  const res = await fetch(url);

  if (!res.body) {
    throw new Error("No response body");
  }

  const writer = createWriteStream(destination);
  const totalSize = parseInt(res.headers.get('content-length') || '0', 10);
  let downloadedSize = 0;

  const readable = Readable.fromWeb(res.body as any);
  let lastLogTime = Date.now();
  readable.on('data', (chunk: Buffer) => {
    downloadedSize += chunk.length;
    const progress = ((downloadedSize / totalSize) * 100).toFixed(2);
    const currentTime = Date.now();
    if (currentTime - lastLogTime >= 20000) {
      log("Download", {promptId: PROMPT_ID, progress: progress});
      lastLogTime = currentTime;
    }
  });

  await finished(readable.pipe(writer));
  await log(`Downloaded`, {promptId: PROMPT_ID})
}

async function main() {
  await log(`Started`, {promptId: PROMPT_ID})

  if (!existsSync(MODEL_FILE)) {
    try {
      await downloadModel(MODEL_URL, MODEL_FILE);
    } catch (_e: any) {
      await log(_e.toString(), {promptId: PROMPT_ID})
    }
  } else {
    // await log(`Using already downloaded model: ${MODEL_FILE}`);
  }
  // await log("Model downloaded, starting server...");

  _STD_.llama.server.start(
    ["--model", MODEL_FILE, "--ctx-size", "2048", "--threads", "8"],
    async () => {
      // onCompletion
      await log("Llama server closed.", {promptId: PROMPT_ID});
    },
    async (error: any) => {
      // onError
      await log(`Llama server error: ${error.toString()}`, {promptId: PROMPT_ID});
      throw error;
    }
  );

  let openai;
  try {
    openai = new OpenAI({
      baseURL: 'http://localhost:8080/v1',
      apiKey: "lm-studio",
      maxRetries: 5,
      timeout: 300 * 1000,
    });
  } catch (_e: any) {
    await log(`Openai error: ${_e.toString()}`, {promptId: PROMPT_ID});
  }

  if (!openai) {
    await log('error: openai undefined', {promptId: PROMPT_ID});
    throw new Error('openai undefined')
  }

  try {
    const modelList = openai.models.list();

    await log("llm chat starting ...");
  
    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        { role: 'system' as const, content: directive},
        { role: 'user' as const, content: input },
      ],
    });
    await log("llm response", {promptId: PROMPT_ID, response: response.choices[0].message.content});
  } catch (error: any) {
    await log(`OpenAI completion error: ${error.toString()}`, {promptId: PROMPT_ID});
    throw error;
  }
}

main();
