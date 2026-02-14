import mongoose from 'mongoose';
import { config } from '../config';

async function main() {
  await mongoose.connect(config.mongodbUri);
  const db = mongoose.connection.db!;

  const txResult = await db.collection('inventorytransactions').deleteMany({});
  console.log('Deleted InventoryTransactions:', txResult.deletedCount);

  const piResult = await db.collection('purchaseinvoices').deleteMany({});
  console.log('Deleted PurchaseInvoices:', piResult.deletedCount);

  const siResult = await db.collection('salesinvoices').deleteMany({});
  console.log('Deleted SalesInvoices:', siResult.deletedCount);

  const siiResult = await db.collection('salesinvoiceitems').deleteMany({});
  console.log('Deleted SalesInvoiceItems:', siiResult.deletedCount);

  console.log('\nAll purchase and sales entries cleared.');
  await mongoose.disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
