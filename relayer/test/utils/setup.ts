import { beforeAll, afterAll } from 'vitest';
import { startAnvil, deployContract } from './helpers';

let anvil: any;

beforeAll(async () => {
  anvil = await startAnvil();
  const contractAddress = await deployContract();
  process.env.CONTRACT_ADDRESS = contractAddress!;
});

afterAll(async () => {
  if (anvil) {
    await anvil.close();
  }
});
