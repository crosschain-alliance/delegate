import path from "path";
import { createWriteStream, existsSync } from "fs";
import { Readable } from "stream";
import { finished } from "stream/promises";
import { OpenAI } from 'openai';

declare let _STD_: any;

const WEBHOOK_URL = _STD_.env['WEBHOOK_URL'];
const PROMPT_ID = _STD_.env['PROMPT_ID'];
const directive = _STD_.env['LLM_DIRECTIVE'];
const input = _STD_.env['LLM_PROMPT'];
// const MODEL_URL = "https://huggingface.co/bartowski/Qwen2.5-0.5B-Instruct-GGUF/resolve/main/Qwen2.5-0.5B-Instruct-Q4_K_M.gguf";
const MODEL_URL = "https://huggingface.co/bartowski/Qwen2.5-Coder-3B-Instruct-GGUF/resolve/main/Qwen2.5-Coder-3B-Instruct-Q4_0_4_4.gguf"
const STORAGE_DIR = _STD_.job.storageDir;
// const MODEL = "Qwen2.5-0.5B-Instruct-Q4_K_M"
const MODEL = "Qwen2.5-Coder-3B-Instruct-Q4_0_4_4"
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
  // log(`Downloading model: ${MODEL_NAME}`);
  const res = await fetch(url);

  if (!res.body) {
    throw new Error("No response body");
  }

  // log(`Writing model to file: ${destination}`);
  const writer = createWriteStream(destination);
  await finished(Readable.fromWeb(res.body as any).pipe(writer));
}

async function main() {
  await log(`starting ${MODEL_URL}, ${WEBHOOK_URL}`)

  if (!existsSync(MODEL_FILE)) {
    await downloadModel(MODEL_URL, MODEL_FILE);
  } else {
    // await log(`Using already downloaded model: ${MODEL_FILE}`);
  }
  // await log("Model downloaded, starting server...");

  _STD_.llama.server.start(
    ["--model", MODEL_FILE, "--ctx-size", "2048", "--threads", "8"],
    async () => {
      // onCompletion
      await log("Llama server closed.");
    },
    async (error: any) => {
      // onError
      await log(`Llama server error: ${error.toString()}`);
      throw error;
    }
  );

  let openai;
  try {
    openai = new OpenAI({
      baseURL: 'http://localhost:8080/v1',
      apiKey: "lm-studio"
    });
  } catch (_e: any) {
    await log(`Openai error: ${_e.toString()}`);
  }

  if (!openai) {
    await log('error: openai undefined');
    throw new Error('openai undefined')
  }

  try {
    const modelList = openai.models.list();

    // await log("fetching llm", {models: modelList, model: MODEL});

    // await log("llm request info", {directive: directive, input: input});

  // const chatConfig = {
  //   model: "Qwen2.5-0.5B-Instruct-Q4_K_M",
  //   messages: [
  //     { role: 'system' as const, content: directive},
  //     { role: 'user' as const, content: input },
  //   ],
  // }

  // await log("llm chat config", {config: chatConfig});

  
    const response = await openai.chat.completions.create({
      model: "Qwen2.5-Coder-3B-Instruct-Q4_0_4_4",
      messages: [
        { role: 'system' as const, content: directive},
        { role: 'user' as const, content: input },
      ],
    });
    await log("llm response", {promptId: PROMPT_ID, response: response.choices[0].message.content});
  } catch (error: any) {
    await log(`OpenAI completion error: ${error.toString()}`);
    throw error;
  }
}

main();
