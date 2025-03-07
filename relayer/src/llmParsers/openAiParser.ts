import { config } from 'dotenv';
import { OpenAI } from 'openai';
import { encodeAbiParameters, parseAbiParameters } from 'viem';

config();

export async function parseQuery(input: string): Promise<string> {
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
      { role: 'system', content: process.env.DIRECTIVE || '' },
      { role: 'user', content: input },
      ],
    });

    console.log('Response:', response.choices[0].message.content);

    const encodedResponse = encodeAbiParameters(
      parseAbiParameters('string'),
      [response.choices[0].message.content || '']
    );

    return encodedResponse;
  } catch (error: any) {
    console.error('Error:', error);
    return '';
  }
}
