import mongoose from 'mongoose';
import { Product } from '../models/Product';
import { InventoryTransaction } from '../models/InventoryTransaction';
import { Company } from '../models/Company';
import { LedgerAccount } from '../models/LedgerAccount';
import { UnitOfMeasure } from '../models/UnitOfMeasure';
import { AuditLog } from '../models/AuditLog';
import { AppError } from '../middlewares/errorHandler';
import * as voucherService from './voucherService';
import * as ledgerService from './ledgerService';
import * as productService from './productService';

export interface OpeningStockItem {
  productId: string;
  quantity: number;
  costPrice: number;
}

export async function postOpeningStock(
  companyId: string,
  financialYearId: string,
  items: OpeningStockItem[],
  userId?: string
): Promise<{ inventoryCount: number; voucherId?: string }> {
  const company = await Company.findById(companyId);
  if (!company) throw new AppError('Company not found', 404);

  const stockAccount = await LedgerAccount.findOne({
    companyId,
    code: /STOCK|INVENTORY/i,
    type: 'Other',
  });
  const equityGroup = await LedgerAccount.findOne({ companyId, code: /EQUITY|CAPITAL/i });
  const stockLedgerId = stockAccount?._id.toString();
  const equityLedgerId = equityGroup?._id.toString();

  let totalStockValue = 0;
  const invTxns: Array<{
    companyId: string;
    financialYearId: string;
    productId: mongoose.Types.ObjectId;
    date: Date;
    type: 'Opening';
    quantityIn: number;
    quantityOut: number;
    costPrice: number;
    createdBy?: string;
  }> = [];

  const date = new Date();

  for (const item of items) {
    const product = await Product.findOne({ _id: item.productId, companyId });
    if (!product) throw new AppError(`Product not found: ${item.productId}`, 404);
    const value = item.quantity * item.costPrice;
    totalStockValue += value;
    invTxns.push({
      companyId,
      financialYearId,
      productId: product._id,
      date,
      type: 'Opening',
      quantityIn: item.quantity,
      quantityOut: 0,
      costPrice: item.costPrice,
      createdBy: userId,
    });
  }

  await InventoryTransaction.insertMany(invTxns);

  let voucherId: string | undefined;
  if (stockLedgerId && equityLedgerId && totalStockValue > 0) {
    const voucher = await voucherService.createAndPost({
      companyId,
      financialYearId,
      voucherType: 'Opening',
      date,
      narration: 'Opening stock',
      lines: [
        { ledgerAccountId: stockLedgerId, debitAmount: totalStockValue, creditAmount: 0 },
        { ledgerAccountId: equityLedgerId, debitAmount: 0, creditAmount: totalStockValue },
      ],
      createdBy: userId,
    });
    voucherId = voucher._id.toString();
  } else if (totalStockValue > 0) {
    const cashAccount = await LedgerAccount.findOne({ companyId, type: 'Cash' });
    const equityAccount = await LedgerAccount.findOne({ companyId, type: 'Other' }).populate('groupId');
    const g = equityAccount?.groupId as { type?: string } | null;
    const equity = g?.type === 'Equity' ? equityAccount : await LedgerAccount.findOne({ companyId, code: 'EQUITY001' });
    if (cashAccount && equity) {
      const v = await voucherService.createAndPost({
        companyId,
        financialYearId,
        voucherType: 'Journal',
        date,
        narration: 'Opening stock (no stock ledger – post to equity)',
        lines: [
          { ledgerAccountId: cashAccount._id.toString(), debitAmount: totalStockValue, creditAmount: 0 },
          { ledgerAccountId: equity._id.toString(), debitAmount: 0, creditAmount: totalStockValue },
        ],
        createdBy: userId,
      });
      voucherId = v._id.toString();
    }
  }

  return { inventoryCount: invTxns.length, voucherId };
}

export interface ImportRowMapping {
  productCode?: number;
  productName?: number;
  barcode?: number;
  category?: number;
  quantity: number;
  cost: number;
  vendor?: number;
}

export async function importProductsAndOpeningStock(
  companyId: string,
  financialYearId: string,
  mapping: ImportRowMapping,
  rows: string[][],
  userId?: string
): Promise<{ created: number; updated: number; errors: string[] }> {
  const company = await Company.findById(companyId);
  if (!company) throw new AppError('Company not found', 404);

  const defaultUnit = await UnitOfMeasure.findOne({ companyId }).sort({ shortCode: 1 });
  if (!defaultUnit) throw new AppError('No unit of measure found. Create units first.', 400);

  const errors: string[] = [];
  let created = 0;
  let updated = 0;
  const items: OpeningStockItem[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const get = (col?: number) => (col !== undefined && col >= 0 && row[col] !== undefined ? String(row[col]).trim() : '');
    const productCode = get(mapping.productCode);
    const productName = get(mapping.productName) || productCode;
    const barcode = get(mapping.barcode);
    const qty = Number(get(mapping.quantity));
    const cost = Number(get(mapping.cost));

    if (!productCode && !barcode) {
      errors.push(`Row ${i + 2}: Product code or barcode required`);
      continue;
    }
    if (isNaN(qty) || qty < 0) {
      errors.push(`Row ${i + 2}: Invalid quantity`);
      continue;
    }
    if (isNaN(cost) || cost < 0) {
      errors.push(`Row ${i + 2}: Invalid cost`);
      continue;
    }

    let product = await Product.findOne({
      companyId,
      $or: [
        { sku: productCode },
        { systemBarcode: productCode },
        ...(barcode ? [{ internationalBarcode: barcode }, { systemBarcode: barcode }] : []),
      ],
    });

    if (!product) {
      const newProduct = await productService.createProduct({
        companyId,
        name: productName || productCode || 'Imported',
        sku: productCode || `IMP-${Date.now()}-${i}`,
        internationalBarcode: barcode || undefined,
        purchasePrice: cost,
        sellingPrice: cost,
        unitOfMeasureId: defaultUnit._id.toString(),
        vatCategory: 'standard',
        createdBy: userId,
      });
      product = await Product.findById(newProduct._id);
      created++;
    } else {
      updated++;
    }

    if (product) {
      items.push({
        productId: product._id.toString(),
        quantity: qty,
        costPrice: cost,
      });
    }
  }

  if (items.length > 0) {
    await postOpeningStock(companyId, financialYearId, items, userId);
  }

  if (userId) {
    await AuditLog.create({
      userId: new mongoose.Types.ObjectId(userId),
      companyId: new mongoose.Types.ObjectId(companyId),
      action: 'Import',
      entityType: 'OpeningStock',
      details: `Import opening stock: ${created} products created, ${updated} existing, ${items.length} stock lines`,
    });
  }

  return { created, updated, errors };
}
