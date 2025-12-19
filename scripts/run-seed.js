import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const securitiesSeedPath = join(__dirname, 'seed-securities.ts');
const rseSeedPath = join(__dirname, 'add-rse-companies.ts');

try {
  console.log('Running securities seed script...\n');
  execSync(`npx tsx ${securitiesSeedPath}`, { stdio: 'inherit' });

  console.log('\nRunning RSE companies seed script...\n');
  execSync(`npx tsx ${rseSeedPath}`, { stdio: 'inherit' });
} catch (error) {
  console.error('Failed to run seed script:', error.message);
  process.exit(1);
}
