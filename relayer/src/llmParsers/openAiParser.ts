import { config } from 'dotenv';
import { OpenAI } from 'openai';
import { encodeAbiParameters, parseAbiParameters } from 'viem';

config();

export async function parseQuery(promptId: string, input: string): Promise<string> {
  console.log('Getting response for:', promptId);
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4.5-preview-2025-02-27',
      messages: [
      { role: 'system', content: process.env.DIRECTIVE || '' },
      { role: 'user', content: input },
      ],
    });

    console.log('Response:', response.choices[0].message.content);

    // const encodedResponse = encodeAbiParameters(
    //   parseAbiParameters('string'),
    //   [response.choices[0].message.content || '']
    // );

    return response.choices[0].message.content || '';
  } catch (error: any) {
    console.error('Error:', error);
    return '';
  }
}
