import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const scriptPath = join(__dirname, 'seed-securities.ts');

try {
  console.log('Running securities seed script...\n');
  execSync(`npx tsx ${scriptPath}`, { stdio: 'inherit' });
} catch (error) {
  console.error('Failed to run seed script:', error.message);
  process.exit(1);
}
