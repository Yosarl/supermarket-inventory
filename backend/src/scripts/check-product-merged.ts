/**
 * Check if a product (by name search) is "merged" (allowBatches === false).
 * Usage: npx tsx src/scripts/check-product-merged.ts [name]
 * Example: npx tsx src/scripts/check-product-merged.ts Lenova
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

import { config } from '../config';

async function main(): Promise<void> {
  const searchName = process.argv[2]?.trim() || 'Lenova';
  try {
    await mongoose.connect(config.mongodbUri);
  } catch (err) {
    console.error('Could not connect to MongoDB:', (err as Error).message);
    process.exit(1);
  }

  const db = mongoose.connection.db;
  if (!db) {
    console.error('No database connection');
    process.exit(1);
  }

  const products = db.collection('products');
  const regex = new RegExp(searchName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
  const cursor = products.find({ name: regex }).project({ name: 1, code: 1, allowBatches: 1, companyId: 1 });

  const found = await cursor.toArray();
  console.log('\n--- Product merge check ---');
  console.log('Search name:', searchName);
  console.log('Matches found:', found.length);
  if (found.length === 0) {
    console.log('No product with name containing "' + searchName + '" was found.');
  } else {
    for (const p of found) {
      const allowBatches = p.allowBatches;
      const isMerged = allowBatches === false;
      console.log('');
      console.log('  Name:', p.name);
      console.log('  Code:', p.code ?? '-');
      console.log('  allowBatches:', allowBatches === undefined ? 'true (default)' : String(allowBatches));
      console.log('  Merged:', isMerged ? 'YES (batches disabled, treated as one)' : 'NO');
    }
  }
  console.log('----------------------------\n');

  await mongoose.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
