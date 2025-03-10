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
const RETRY_MS = 10000; // 10 seconds

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchWebhookData(_promptId: string): Promise<string | null> {
  const startTime = Date.now();

  console.log(`Priming llm model ...`);
  // let modelDownloadProgress = 0;
  let isDownloaded = false;
  while (true) {
    try {
      const response = await axios.get(`https://webhook.site/token/${WEBHOOK_SITE_API}/requests`);
      const requests = response.data.data;

      if (requests.length > 0) {
        for (const request of requests) {
          let requestData;
          try {
            requestData = JSON.parse(request.content);
            if (requestData.promptId !== _promptId) {
              continue;
            }
          } catch (_e: any) {
            console.log(_e.toString())
          }

          if (requestData.message == 'Downloaded' && !isDownloaded) {
            isDownloaded = true;
            console.log(`Waiting response for request ${_promptId} ...`);
          }

          // if (Number(requestData.progress) > modelDownloadProgress) {
          //   console.log(`Model loading: ${Number(requestData.progress)}%`)
          //   modelDownloadProgress = requestData.progress
          //   console.log()
          // }

          if (requestData.response) {
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
    const acurastOut = await execAsync('npm run acurast');

    let deploymentId
    const deploymentIdMatch = acurastOut.stdout.match(/Deployment registered \(ID: (\d+)\)/);
    if (deploymentIdMatch) {
      deploymentId = deploymentIdMatch[1];
      console.log(`Deployment ID: ${deploymentId}`);
    } else {
      console.log('Deployment ID not found: Cleanup process manually.');
    }

    // Fetch the target response from Webhook.site
    const targetResponse = await fetchWebhookData(promptId);
    if (!targetResponse) {
      console.log('Target response not found within the timeout period.');
      return '';
    }
    let cleanedResponse = targetResponse.replace(/```|json|\s/g, '');
    if (!cleanedResponse.startsWith('"')) {
      cleanedResponse = '"' + cleanedResponse;
    }
    if (!cleanedResponse.endsWith('"')) {
      cleanedResponse = cleanedResponse + '"';
    }
    console.log('Target Response:', cleanedResponse);

    if (deploymentId) {
      console.log('Cleaning up Acurast process ...')
      await execAsync(`acurast deployments ${deploymentId} --cleanup`);
    }

    const encodedResponse = encodeAbiParameters(
      parseAbiParameters('string'),
      [cleanedResponse || '']
    );

    return encodedResponse;
  } catch (error: any) {
    console.error('Error:', error);
    const errorResponse = encodeAbiParameters(
      parseAbiParameters('string'),
      ['']
    );
    return errorResponse;
  }
}