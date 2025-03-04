import path from "path";
import { createWriteStream, existsSync } from "fs";
import { Readable } from "stream";
import { finished } from "stream/promises";
import { OpenAI } from 'openai';

const WEBHOOK_URL = "https://webhook.site/77636e0f-3633-4a05-bf85-37310e0b07f5";

declare let _STD_: any;

if (typeof _STD_ === "undefined") {
  // If _STD_ is not defined, we know it's not running in the Acurast Cloud.
  // Define _STD_ here for local testing.
  console.log("Running in local environment");
  (global as any)._STD_ = {
    app_info: { version: "local" },
    job: { getId: () => "local", storageDir: "./" },
    device: { getAddress: () => "local" },
  };
}

export const MODEL_URL =
  "https://huggingface.co/bartowski/Qwen2.5-0.5B-Instruct-GGUF/resolve/main/Qwen2.5-0.5B-Instruct-Q4_K_M.gguf";
export const MODEL_NAME = "Qwen2.5-0.5B-Instruct-Q4_K_M.gguf";

export const STORAGE_DIR = _STD_.job.storageDir;

const MODEL_FILE = path.resolve(STORAGE_DIR, MODEL_NAME);
async function downloadModel(url: string, destination: string) {
  console.log("Downloading model", MODEL_NAME);
  const res = await fetch(url);

  if (!res.body) {
    throw new Error("No response body");
  }

  console.log("Writing model to file:", destination);
  const writer = createWriteStream(destination);
  await finished(Readable.fromWeb(res.body as any).pipe(writer));
}
async function main() {
  await fetch(WEBHOOK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message: "starting",
      timestamp: Date.now(),
    }),
  })

  if (!existsSync(MODEL_FILE)) {
    await downloadModel(MODEL_URL, MODEL_FILE);
  } else {
    console.log("Using already downloaded model:", MODEL_FILE);
  }
  console.log("Model downloaded, starting server...");

  _STD_.llama.server.start(
    ["--model", MODEL_FILE, "--ctx-size", "2048", "--threads", "8"],
    () => {
      // onCompletion
      console.log("Llama server closed.");
    },
    (error: any) => {
      // onError
      console.log("Llama server error:", error);
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
    await fetch(WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        error: _e.toString(),
        timestamp: Date.now(),
      }),
    })
  }

  if (!openai)
    throw new Error('error init openai')

  const msg = openai.models.list();

  await fetch(WEBHOOK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message: "fetching ai",
      models: msg,
      timestamp: Date.now(),
    }),
  })

  const directive = `\nFor each question return the answer in the form of an array with the index of each answer which answer is yes`;
  const input = 'Is Paris the capital of France? Is Rome the capital of Germany?'
  
  const response = await openai.chat.completions.create({
    model: 'Qwen2.5-0.5B-Instruct-Q4_K_M',
    messages: [
      { role: 'system', content: directive },
      { role: 'user', content: input },
    ],
  });

  await fetch(WEBHOOK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      timestamp: Date.now(),
      response: response.choices[0].message.content
    }),
  })
}

main();
