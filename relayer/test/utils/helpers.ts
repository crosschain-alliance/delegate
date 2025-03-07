import { exec } from 'child_process';
import { promisify } from 'util';

const killExistingAnvil = async () => {
  console.log('Checking for existing Anvil processes...');
  try {
    await promisify(exec)('pkill -f anvil');
    // Give it a moment to fully close
    await new Promise(resolve => setTimeout(resolve, 1000));
    console.log('Killed existing Anvil processes');
  } catch (error) {
    // No existing process found - this is fine
    console.log('No existing Anvil processes found');
  }
};

export const startAnvil = async (verbose = false) => {
  if (verbose) console.log('Starting Anvil...');
  await killExistingAnvil();
  const anvil = exec('anvil --block-time 1');

  return new Promise((resolve, reject) => {
    let output = '';
    const READY_PATTERNS = ['Listening on', 'Press Ctrl+C to stop the node', 'Available Accounts'];

    // Capture stdout
    anvil.stdout?.on('data', data => {
      const dataStr = data.toString();
      output += dataStr;
      if (verbose) console.log('Anvil output:', dataStr);

      if (READY_PATTERNS.some(pattern => dataStr.includes(pattern))) {
        if (verbose) console.log('Anvil ready signal detected');
        setTimeout(() => {
          if (verbose) console.log('Anvil is ready!');
          resolve({
            close: () => {
              if (verbose) console.log('Shutting down Anvil...');
              anvil.kill('SIGINT');
            },
            process: anvil,
          });
        }, 1000);
      }
    });

    // Capture stderr
    anvil.stderr?.on('data', data => {
      const errorStr = data.toString();
      if (verbose) console.error('Anvil error:', errorStr);
      if (errorStr.includes('Address already in use')) {
        reject(new Error('Port 8545 is already in use. Is another Anvil instance running?'));
      }
    });

    // Handle process errors
    anvil.on('error', error => {
      if (verbose) console.error('Failed to start Anvil:', error);
      reject(error);
    });

    // Prevent hanging
    setTimeout(() => {
      if (!READY_PATTERNS.some(pattern => output.includes(pattern))) {
        if (verbose) console.error('Anvil startup timed out. Full output:', output);
        anvil.kill('SIGINT');
        reject(new Error('Anvil startup timed out after 15 seconds'));
      }
    }, 5000);
  });
};

export const deployContract = async () => {
  const privateKey = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';
  const address = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';

  try {
    // First build the contract
    console.log('Building contract...');
    await promisify(exec)('cd ../contracts && forge build');

    console.log('Deploying contract...');
    const { stdout, stderr } = await promisify(exec)(
      `cd ../contracts && forge create src/adapters/LLMAdapter.sol:LLMAdapter --rpc-url http://localhost:8545 --private-key ${privateKey} --broadcast --constructor-args ${address}`
    );

    // Try to match the address
    const addressMatch = stdout.match(/[Dd]eployed.*?(0x[a-fA-F0-9]{40})/);
    if (!addressMatch) {
      console.error('Full deployment output:', stdout);
      throw new Error('Could not find deployed contract address in output');
    }

    const contractAddress = addressMatch[1];
    console.log('Contract deployed at:', contractAddress);

    // Verify the address format
    if (!contractAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
      throw new Error(`Invalid contract address format: ${contractAddress}`);
    }

    return contractAddress;
  } catch (error) {
    console.error('Contract deployment failed:', error);
    throw error;
  }
};
