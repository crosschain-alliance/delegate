import { config } from 'dotenv';
import { OpenAI } from 'openai';

const directive = `\nFor each question return the answer in the form of an array with the index of each answer which answer is yes`;
config();

export async function parseQuery(input: string): Promise<string> {
  // const openai = new OpenAI({
  // apiKey: process.env.OPENAI_API_KEY, // Ensure your API key is stored securely
  // });

  const openai = new OpenAI({
    baseURL: 'https://llm66.processor-proxy.sook.ch',
  });

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini', // Specify the o3-mini model
      messages: [
        { role: 'system', content: directive },
        { role: 'user', content: input },
      ],
    });

    console.log('Response:', response.choices[0].message.content);
    return response.choices[0].message.content || '';
  } catch (error: any) {
    console.error('Error:', error);
    return '';
  }
}
