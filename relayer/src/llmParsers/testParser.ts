import { encodeAbiParameters } from 'viem';

export function parseQuery(answer: string): Promise<string> {
  const types = [
    { name: 'governorAddress', type: 'address' },
    { name: 'proposalId', type: 'uint256' },
    { name: 'support', type: 'uint8' },
  ];
  
  const values = ['0xf07DeD9dC292157749B6Fd268E37DF6EA38395B9', '27831845498978337986467036886891836384283300266814708262424272663046958396151', 1n];
  const encodedData = encodeAbiParameters(types, values);
  console.log(encodedData)
  return Promise.resolve(encodedData);
}
