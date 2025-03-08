import { config } from 'dotenv';
import { encodeAbiParameters, parseAbiParameters } from 'viem';
import { exec } from 'child_process';
import { promisify } from 'util';
import axios from 'axios';
import fs from 'fs';

config();

const execAsync = promisify(exec);
const ACURAST_MNEMONIC = process.env.ACURAST_MNEMONIC;
const WEBHOOK_SITE_API = process.env.WEBHOOK_SITE_API;
const DIRECTIVE = process.env.DIRECTIVE;
const TIMEOUT_MS = 60 * 60 * 1000; // 60 minutes
const RETRY_MS = 30000; // 30 seconds

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchWebhookData(_promptId: string): Promise<string | null> {
  const startTime = Date.now();

  console.log(`Waiting response for request ${_promptId} ...`);
  while (true) {
    try {
      const response = await axios.get(`https://webhook.site/token/${WEBHOOK_SITE_API}/requests`);
      const requests = response.data.data;

      if (requests.length === 0) {
        // console.log('No requests found');
      } else {
        // Find the request with the target promptId
        for (const request of requests) {
          const requestData = JSON.parse(request.content);

          if (requestData.promptId === _promptId) {
            console.log('Response collected')
            return requestData.response;
          }
        }
      }

      await delay(RETRY_MS);

      // Check if the timeout has been reached
      if (Date.now() - startTime > TIMEOUT_MS) {
        console.log('Timeout reached. Stopping fetch.');
        return null;
      }
    } catch (error) {
      console.error('Error fetching webhook data:', error);
      throw error;
    }
  }
}

export async function parseQuery(promptId: string, input: string): Promise<string> {
  try {
    const envFilePath = '/home/envin/Work/substance_labs/delegate/acurast_llm/.env';
    if (fs.existsSync(envFilePath)) {
      fs.unlinkSync(envFilePath);
    }
    const envVariables = `ACURAST_MNEMONIC=${ACURAST_MNEMONIC}\nPROMPT_ID=${promptId}\nLLM_PROMPT=${input}\nWEBHOOK_URL=https://webhook.site/${WEBHOOK_SITE_API}\nLLM_DIRECTIVE=${DIRECTIVE}`;
    fs.appendFileSync(envFilePath, envVariables);


    console.log('Starting Acurast ...')
    await execAsync('npm run acurast');
    console.log('Acurast started')

    // Fetch the target response from Webhook.site
    const targetResponse = await fetchWebhookData(promptId);

    if (!targetResponse) {
      console.log('Target response not found within the timeout period.');
      return '';
    }

    console.log('Target Response:', targetResponse);

    const encodedResponse = encodeAbiParameters(
      parseAbiParameters('string'),
      [targetResponse || '']
    );

    return encodedResponse;
  } catch (error: any) {
    console.error('Error:', error);
    return '';
  }
}