import mongoose from 'mongoose';
import { Product } from '../models/Product';
import { InventoryTransaction } from '../models/InventoryTransaction';
import { PurchaseInvoice } from '../models/PurchaseInvoice';
import { LedgerAccount } from '../models/LedgerAccount';
import { LedgerGroup } from '../models/LedgerGroup';
import { AppError } from '../middlewares/errorHandler';
import * as voucherService from './voucherService';

export interface PurchaseBatchInput {
  productId: string;
  productCode?: string;
  productName?: string;
  purchasePrice: number;
  expiryDate?: string;
  quantity: number;
  discAmount?: number;
  retail?: number;
  wholesale?: number;
  specialPrice1?: number;
  specialPrice2?: number;
  batchNumber?: string;
  multiUnitId?: string;
}

export interface CreatePurchaseInput {
  companyId: string;
  financialYearId: string;
  invoiceNo: string;
  supplierInvoiceNo?: string;
  date?: string;
  supplierId?: string;
  supplierName?: string;
  vatType?: 'Vat' | 'NonVat';
  narration?: string;
  batches: PurchaseBatchInput[];
  itemsDiscount?: number;
  otherDiscount?: number;
  otherCharges?: number;
  freightCharge?: number;
  roundOff?: number;
  createdBy?: string;
}

// ─── Helpers ───────────────────────────────────────────────

async function findOrCreateGroup(companyId: string, type: string) {
  let group = await LedgerGroup.findOne({ companyId, type });
  if (group) return group;
  const lastGrp = await LedgerGroup.findOne({ companyId, code: /^GRP/ }).sort({ code: -1 }).lean();
  const num = lastGrp?.code ? parseInt(lastGrp.code.replace(/\D/g, ''), 10) + 1 : 1;
  const code = `GRP${num.toString().padStart(4, '0')}`;
  group = await LedgerGroup.create({ companyId, name: `${type} Group`, code, type });
  console.log(`[Auto-created] ${type} Group: ${code}`);
  return group;
}

async function findOrCreateSpecialLedger(
  companyId: string,
  name: string,
  type: 'Revenue' | 'Expense' | 'Other',
  groupType: string,
) {
  let ledger = await LedgerAccount.findOne({ companyId, name });
  if (ledger) return ledger;
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  ledger = await LedgerAccount.findOne({ companyId, name: new RegExp(`^${escaped}$`, 'i') });
  if (ledger) return ledger;
  const group = await findOrCreateGroup(companyId, groupType);
  const lastAcc = await LedgerAccount.findOne({ companyId, code: /^ACC/ }).sort({ code: -1 }).lean();
  const num = lastAcc?.code ? parseInt(lastAcc.code.replace(/\D/g, ''), 10) + 1 : 1;
  const code = `ACC${num.toString().padStart(4, '0')}`;
  ledger = await LedgerAccount.create({ companyId, name, code, type, groupId: group._id });
  console.log(`[Auto-created] ${name} ledger: ${code}`);
  return ledger;
}

async function findOrCreatePurchaseLedger(companyId: string) {
  let ledger = await LedgerAccount.findOne({ companyId, name: 'Purchase Account' });
  if (ledger) return ledger;
  ledger = await LedgerAccount.findOne({ companyId, name: /^purchase\s*account$/i });
  if (ledger) return ledger;
  ledger = await LedgerAccount.findOne({ companyId, type: 'Expense', name: /^purchase$/i });
  if (ledger) return ledger;
  const group = await findOrCreateGroup(companyId, 'Expense');
  const lastAcc = await LedgerAccount.findOne({ companyId, code: /^ACC/ }).sort({ code: -1 }).lean();
  const num = lastAcc?.code ? parseInt(lastAcc.code.replace(/\D/g, ''), 10) + 1 : 1;
  const code = `ACC${num.toString().padStart(4, '0')}`;
  ledger = await LedgerAccount.create({
    companyId, name: 'Purchase Account', code, type: 'Expense',
    groupId: group._id,
  });
  console.log(`[Auto-created] Purchase Account ledger: ${code}`);
  return ledger;
}

async function findOrCreateVatInputLedger(companyId: string) {
  let ledger = await LedgerAccount.findOne({ companyId, name: 'VAT Receivable' });
  if (ledger) return ledger;
  ledger = await LedgerAccount.findOne({ companyId, name: /^vat\s*(receivable|input)$/i });
  if (ledger) return ledger;
  const group = await findOrCreateGroup(companyId, 'Asset');
  const lastAcc = await LedgerAccount.findOne({ companyId, code: /^ACC/ }).sort({ code: -1 }).lean();
  const num = lastAcc?.code ? parseInt(lastAcc.code.replace(/\D/g, ''), 10) + 1 : 1;
  const code = `ACC${num.toString().padStart(4, '0')}`;
  ledger = await LedgerAccount.create({
    companyId, name: 'VAT Receivable', code, type: 'Other',
    groupId: group._id,
  });
  console.log(`[Auto-created] VAT Receivable ledger: ${code}`);
  return ledger;
}

// ─── Create ────────────────────────────────────────────────
export async function createPurchase(input: CreatePurchaseInput): Promise<{
  purchaseId: string;
  invoiceNo: string;
  batchCount: number;
}> {
  if (!input.batches || input.batches.length === 0) {
    throw new AppError('At least one batch/item is required', 400);
  }

  const purchaseDate = input.date ? new Date(input.date) : new Date();
  const purchaseId = new mongoose.Types.ObjectId();

  const itemsDiscount = input.itemsDiscount ?? 0;
  const otherDiscount = input.otherDiscount ?? 0;
  const otherCharges = input.otherCharges ?? 0;
  const freightCharge = input.freightCharge ?? 0;
  const roundOff = input.roundOff ?? 0;

  // 1. Save PurchaseInvoice header + batches
  let totalAmount = 0;
  const batchDocs = input.batches.map((b) => {
    const gross = b.quantity * b.purchasePrice;
    const disc = b.discAmount ?? 0;
    totalAmount += gross - disc;
    return {
      productId: new mongoose.Types.ObjectId(b.productId),
      productCode: b.productCode || '',
      productName: b.productName || '',
      batchNumber: b.batchNumber || '',
      purchasePrice: b.purchasePrice,
      quantity: b.quantity,
      discAmount: disc,
      expiryDate: b.expiryDate ? new Date(b.expiryDate) : undefined,
      retail: b.retail ?? 0,
      wholesale: b.wholesale ?? 0,
      specialPrice1: b.specialPrice1 ?? 0,
      specialPrice2: b.specialPrice2 ?? 0,
    };
  });

  await PurchaseInvoice.create({
    _id: purchaseId,
    companyId: input.companyId,
    financialYearId: input.financialYearId,
    invoiceNo: input.invoiceNo,
    supplierInvoiceNo: input.supplierInvoiceNo,
    date: purchaseDate,
    supplierId: input.supplierId ? new mongoose.Types.ObjectId(input.supplierId) : undefined,
    supplierName: input.supplierName,
    vatType: input.vatType || 'Vat',
    narration: input.narration,
    batches: batchDocs,
    totalAmount,
    itemsDiscount,
    otherDiscount,
    otherCharges,
    freightCharge,
    roundOff,
    createdBy: input.createdBy ? new mongoose.Types.ObjectId(input.createdBy) : undefined,
  });

  // 2. Create InventoryTransaction per batch + update product prices
  for (const batch of input.batches) {
    const product = await Product.findById(batch.productId).lean();
    if (!product || product.companyId.toString() !== input.companyId) {
      throw new AppError(`Product not found: ${batch.productId}`, 404);
    }

    // Calculate effective purchase rate: Price - (Discount / Qty)
    const batchDiscAmount = batch.discAmount ?? 0;
    const effectivePurchasePrice = batch.quantity > 0
      ? batch.purchasePrice - (batchDiscAmount / batch.quantity)
      : batch.purchasePrice;

    // For multi-unit purchases, add stock by conversion (pcs inside) instead of line qty
    // and calculate per-piece cost price
    let stockQtyIn = batch.quantity;
    let perPieceCost = effectivePurchasePrice;
    if (batch.multiUnitId && product.multiUnits) {
      const mu = product.multiUnits.find((m) => m.multiUnitId === batch.multiUnitId);
      if (mu && mu.conversion && mu.conversion > 0) {
        stockQtyIn = batch.quantity * mu.conversion;
        perPieceCost = effectivePurchasePrice / mu.conversion;
      }
    }
    perPieceCost = parseFloat(perPieceCost.toFixed(4));

    await InventoryTransaction.create({
      companyId: input.companyId,
      financialYearId: input.financialYearId,
      productId: batch.productId,
      date: purchaseDate,
      type: 'Purchase',
      quantityIn: stockQtyIn,
      quantityOut: 0,
      costPrice: perPieceCost,
      referenceType: 'Purchase',
      referenceId: purchaseId,
      narration: `Purchase ${input.invoiceNo}${batch.batchNumber ? ` Batch: ${batch.batchNumber}` : ''}`,
      createdBy: input.createdBy ? new mongoose.Types.ObjectId(input.createdBy) : undefined,
    });

    // Update product purchase price to effective rate (after discount)
    const priceUpdate: Record<string, unknown> = {};
    if (perPieceCost > 0) {
      priceUpdate.purchasePrice = perPieceCost;
    }
    if (batch.expiryDate) {
      priceUpdate.expiryDate = new Date(batch.expiryDate);
    }

    if (batch.multiUnitId && product.multiUnits) {
      const muUpdate: Record<string, unknown> = {};
      if (batch.wholesale !== undefined && batch.wholesale > 0) {
        muUpdate['multiUnits.$[mu].wholesale'] = batch.wholesale;
      }
      if (batch.retail !== undefined && batch.retail > 0) {
        muUpdate['multiUnits.$[mu].retail'] = batch.retail;
      }
      if (batch.specialPrice1 !== undefined && batch.specialPrice1 > 0) {
        muUpdate['multiUnits.$[mu].specialPrice1'] = batch.specialPrice1;
      }
      if (batch.specialPrice2 !== undefined && batch.specialPrice2 > 0) {
        muUpdate['multiUnits.$[mu].specialPrice2'] = batch.specialPrice2;
      }

      const allUpdates = { ...priceUpdate, ...muUpdate };
      if (Object.keys(allUpdates).length > 0) {
        await Product.updateOne(
          { _id: batch.productId, companyId: input.companyId },
          { $set: allUpdates },
          { arrayFilters: [{ 'mu.multiUnitId': batch.multiUnitId }] }
        );
      }
    } else {
      if (batch.retail !== undefined && batch.retail > 0) {
        priceUpdate.retailPrice = batch.retail;
        priceUpdate.sellingPrice = batch.retail;
      }
      if (batch.wholesale !== undefined && batch.wholesale > 0) {
        priceUpdate.wholesalePrice = batch.wholesale;
        priceUpdate.mrp = batch.wholesale;
      }
      if (batch.specialPrice1 !== undefined && batch.specialPrice1 > 0) {
        priceUpdate.specialPrice = batch.specialPrice1;
      }
      if (batch.specialPrice2 !== undefined && batch.specialPrice2 > 0) {
        priceUpdate.specialPrice2 = batch.specialPrice2;
      }

      if (Object.keys(priceUpdate).length > 0) {
        await Product.updateOne(
          { _id: batch.productId, companyId: input.companyId },
          { $set: priceUpdate }
        );
      }
    }
  }

  // 3. Create voucher/ledger entries for the purchase (same pattern as Sales B2C)
  try {
    await createPurchaseVoucher(input.companyId, input.financialYearId, purchaseId.toString(), input.invoiceNo, purchaseDate, input, totalAmount, itemsDiscount, otherDiscount, otherCharges, freightCharge, roundOff);
  } catch (err) {
    console.error(`[Purchase ${input.invoiceNo}] Voucher creation failed:`, err);
  }

  return {
    purchaseId: purchaseId.toString(),
    invoiceNo: input.invoiceNo,
    batchCount: input.batches.length,
  };
}

// ─── Update ────────────────────────────────────────────────
export async function updatePurchase(
  purchaseId: string,
  input: CreatePurchaseInput
): Promise<{ purchaseId: string; invoiceNo: string; batchCount: number }> {
  if (!input.batches || input.batches.length === 0) {
    throw new AppError('At least one batch/item is required', 400);
  }

  const existing = await PurchaseInvoice.findById(purchaseId);
  if (!existing) throw new AppError('Purchase invoice not found', 404);

  const purchaseDate = input.date ? new Date(input.date) : new Date();

  const itemsDiscount = input.itemsDiscount ?? 0;
  const otherDiscount = input.otherDiscount ?? 0;
  const otherCharges = input.otherCharges ?? 0;
  const freightCharge = input.freightCharge ?? 0;
  const roundOff = input.roundOff ?? 0;

  // 1. Delete old inventory transactions for this purchase
  await InventoryTransaction.deleteMany({
    referenceType: 'Purchase',
    referenceId: purchaseId,
  });

  // 1b. Delete old voucher if exists
  if (existing.voucherId) {
    try {
      await voucherService.deleteVoucher(existing.voucherId.toString());
    } catch (err) {
      console.error(`[Purchase ${input.invoiceNo}] Old voucher deletion failed:`, err);
    }
  }

  // 2. Update PurchaseInvoice header + batches
  let totalAmount = 0;
  const batchDocs = input.batches.map((b) => {
    const gross = b.quantity * b.purchasePrice;
    const disc = b.discAmount ?? 0;
    totalAmount += gross - disc;
    return {
      productId: new mongoose.Types.ObjectId(b.productId),
      productCode: b.productCode || '',
      productName: b.productName || '',
      batchNumber: b.batchNumber || '',
      purchasePrice: b.purchasePrice,
      quantity: b.quantity,
      discAmount: disc,
      expiryDate: b.expiryDate ? new Date(b.expiryDate) : undefined,
      retail: b.retail ?? 0,
      wholesale: b.wholesale ?? 0,
      specialPrice1: b.specialPrice1 ?? 0,
      specialPrice2: b.specialPrice2 ?? 0,
    };
  });

  await PurchaseInvoice.updateOne(
    { _id: purchaseId },
    {
      $set: {
        invoiceNo: input.invoiceNo,
        supplierInvoiceNo: input.supplierInvoiceNo,
        date: purchaseDate,
        supplierId: input.supplierId ? new mongoose.Types.ObjectId(input.supplierId) : undefined,
        supplierName: input.supplierName,
        vatType: input.vatType || 'Vat',
        narration: input.narration,
        batches: batchDocs,
        totalAmount,
        itemsDiscount,
        otherDiscount,
        otherCharges,
        freightCharge,
        roundOff,
      },
    }
  );

  // 3. Create new inventory transactions + update product prices
  for (const batch of input.batches) {
    const product = await Product.findById(batch.productId).lean();
    if (!product || product.companyId.toString() !== input.companyId) {
      throw new AppError(`Product not found: ${batch.productId}`, 404);
    }

    // Calculate effective purchase rate: Price - (Discount / Qty)
    const batchDiscAmount = batch.discAmount ?? 0;
    const effectivePurchasePrice = batch.quantity > 0
      ? batch.purchasePrice - (batchDiscAmount / batch.quantity)
      : batch.purchasePrice;

    let stockQtyIn = batch.quantity;
    let perPieceCost = effectivePurchasePrice;
    if (batch.multiUnitId && product.multiUnits) {
      const mu = product.multiUnits.find((m) => m.multiUnitId === batch.multiUnitId);
      if (mu && mu.conversion && mu.conversion > 0) {
        stockQtyIn = batch.quantity * mu.conversion;
        perPieceCost = effectivePurchasePrice / mu.conversion;
      }
    }
    perPieceCost = parseFloat(perPieceCost.toFixed(4));

    await InventoryTransaction.create({
      companyId: input.companyId,
      financialYearId: input.financialYearId,
      productId: batch.productId,
      date: purchaseDate,
      type: 'Purchase',
      quantityIn: stockQtyIn,
      quantityOut: 0,
      costPrice: perPieceCost,
      referenceType: 'Purchase',
      referenceId: purchaseId,
      narration: `Purchase ${input.invoiceNo}${batch.batchNumber ? ` Batch: ${batch.batchNumber}` : ''}`,
      createdBy: input.createdBy ? new mongoose.Types.ObjectId(input.createdBy) : undefined,
    });

    // Update product purchase price to effective rate (after discount)
    const priceUpdate: Record<string, unknown> = {};
    if (perPieceCost > 0) {
      priceUpdate.purchasePrice = perPieceCost;
    }
    if (batch.expiryDate) {
      priceUpdate.expiryDate = new Date(batch.expiryDate);
    }

    if (batch.multiUnitId && product.multiUnits) {
      const muUpdate: Record<string, unknown> = {};
      if (batch.wholesale !== undefined && batch.wholesale > 0) muUpdate['multiUnits.$[mu].wholesale'] = batch.wholesale;
      if (batch.retail !== undefined && batch.retail > 0) muUpdate['multiUnits.$[mu].retail'] = batch.retail;
      if (batch.specialPrice1 !== undefined && batch.specialPrice1 > 0) muUpdate['multiUnits.$[mu].specialPrice1'] = batch.specialPrice1;
      if (batch.specialPrice2 !== undefined && batch.specialPrice2 > 0) muUpdate['multiUnits.$[mu].specialPrice2'] = batch.specialPrice2;
      const allUpdates = { ...priceUpdate, ...muUpdate };
      if (Object.keys(allUpdates).length > 0) {
        await Product.updateOne(
          { _id: batch.productId, companyId: input.companyId },
          { $set: allUpdates },
          { arrayFilters: [{ 'mu.multiUnitId': batch.multiUnitId }] }
        );
      }
    } else {
      if (batch.retail !== undefined && batch.retail > 0) { priceUpdate.retailPrice = batch.retail; priceUpdate.sellingPrice = batch.retail; }
      if (batch.wholesale !== undefined && batch.wholesale > 0) { priceUpdate.wholesalePrice = batch.wholesale; priceUpdate.mrp = batch.wholesale; }
      if (batch.specialPrice1 !== undefined && batch.specialPrice1 > 0) priceUpdate.specialPrice = batch.specialPrice1;
      if (batch.specialPrice2 !== undefined && batch.specialPrice2 > 0) priceUpdate.specialPrice2 = batch.specialPrice2;
      if (Object.keys(priceUpdate).length > 0) {
        await Product.updateOne(
          { _id: batch.productId, companyId: input.companyId },
          { $set: priceUpdate }
        );
      }
    }
  }

  // 4. Create new voucher/ledger entries
  try {
    const voucherId = await createPurchaseVoucher(input.companyId, input.financialYearId, purchaseId, input.invoiceNo, purchaseDate, input, totalAmount, itemsDiscount, otherDiscount, otherCharges, freightCharge, roundOff);
    if (voucherId) {
      await PurchaseInvoice.updateOne({ _id: purchaseId }, { $set: { voucherId } });
    }
  } catch (err) {
    console.error(`[Purchase ${input.invoiceNo}] Voucher creation failed:`, err);
  }

  return {
    purchaseId,
    invoiceNo: input.invoiceNo,
    batchCount: input.batches.length,
  };
}

// ─── Create Purchase Voucher / Ledger Entries ──────────────
async function createPurchaseVoucher(
  companyId: string,
  financialYearId: string,
  purchaseId: string,
  invoiceNo: string,
  purchaseDate: Date,
  input: CreatePurchaseInput,
  totalAmount: number,
  itemsDiscount: number,
  otherDiscount: number,
  otherCharges: number,
  freightCharge: number,
  roundOff: number,
): Promise<string | null> {
  // Calculate VAT
  const VAT_RATE = 5;
  const isVat = (input.vatType || 'Vat') === 'Vat';
  const netAmountBeforeAdjustments = totalAmount; // gross - item discounts already deducted
  const grandTotal = netAmountBeforeAdjustments - otherDiscount + otherCharges + freightCharge + roundOff;
  let vatAmount = 0;
  if (isVat) {
    vatAmount = parseFloat((netAmountBeforeAdjustments * VAT_RATE / (100 + VAT_RATE)).toFixed(2));
  }

  // Find or create required ledger accounts
  const purchaseLedger = await findOrCreatePurchaseLedger(companyId);
  const supplierLedger = input.supplierId
    ? await LedgerAccount.findById(input.supplierId)
    : await findOrCreateSpecialLedger(companyId, 'Cash Account', 'Other', 'Asset');

  if (!supplierLedger) {
    console.error(`[Purchase ${invoiceNo}] Supplier ledger not found`);
    return null;
  }

  const vatLedger = isVat && vatAmount > 0
    ? await findOrCreateVatInputLedger(companyId) : null;

  // Look up special ledger accounts (only when non-zero)
  const discountOnPurchaseLedger = itemsDiscount > 0
    ? await findOrCreateSpecialLedger(companyId, 'Discount on Purchase', 'Revenue', 'Income') : null;
  const otherDiscountLedger = otherDiscount > 0
    ? await findOrCreateSpecialLedger(companyId, 'Other Discount on Purchase', 'Revenue', 'Income') : null;
  const otherChargesLedger = otherCharges > 0
    ? await findOrCreateSpecialLedger(companyId, 'Other Charges on Purchase', 'Expense', 'Expense') : null;
  const freightChargesLedger = freightCharge > 0
    ? await findOrCreateSpecialLedger(companyId, 'Freight Charges on Purchase', 'Expense', 'Expense') : null;
  const roundOffLedger = Math.abs(roundOff) > 0.001
    ? await findOrCreateSpecialLedger(companyId, 'Round Off on Purchase', 'Expense', 'Expense') : null;

  // Build voucher lines
  const voucherLines: { ledgerAccountId: string; debitAmount: number; creditAmount: number; narration: string }[] = [];

  // Debit: Purchase Account (net purchase amount excluding VAT)
  const purchaseNetAmount = isVat ? parseFloat((netAmountBeforeAdjustments - vatAmount).toFixed(2)) : netAmountBeforeAdjustments;
  voucherLines.push({
    ledgerAccountId: purchaseLedger._id.toString(),
    debitAmount: purchaseNetAmount,
    creditAmount: 0,
    narration: `Purchase ${invoiceNo}`,
  });

  // Debit: VAT Input/Receivable
  if (vatLedger && vatAmount > 0) {
    voucherLines.push({
      ledgerAccountId: vatLedger._id.toString(),
      debitAmount: vatAmount,
      creditAmount: 0,
      narration: `Purchase ${invoiceNo} - VAT Input`,
    });
  }

  // Credit: Supplier/Cash Account (grand total = what we owe/pay)
  voucherLines.push({
    ledgerAccountId: supplierLedger._id.toString(),
    debitAmount: 0,
    creditAmount: grandTotal,
    narration: `Purchase ${invoiceNo}`,
  });

  // Credit: Discount on Purchase (row-level discounts reduce cost)
  if (discountOnPurchaseLedger && itemsDiscount > 0) {
    voucherLines.push({
      ledgerAccountId: discountOnPurchaseLedger._id.toString(),
      debitAmount: 0,
      creditAmount: itemsDiscount,
      narration: `Purchase ${invoiceNo} - Row Discounts`,
    });
  }

  // Credit: Other Discount on Purchase
  if (otherDiscountLedger && otherDiscount > 0) {
    voucherLines.push({
      ledgerAccountId: otherDiscountLedger._id.toString(),
      debitAmount: 0,
      creditAmount: otherDiscount,
      narration: `Purchase ${invoiceNo} - Other Discount`,
    });
  }

  // Debit: Other Charges on Purchase (additional expense)
  if (otherChargesLedger && otherCharges > 0) {
    voucherLines.push({
      ledgerAccountId: otherChargesLedger._id.toString(),
      debitAmount: otherCharges,
      creditAmount: 0,
      narration: `Purchase ${invoiceNo} - Other Charges`,
    });
  }

  // Debit: Freight Charges on Purchase (additional expense)
  if (freightChargesLedger && freightCharge > 0) {
    voucherLines.push({
      ledgerAccountId: freightChargesLedger._id.toString(),
      debitAmount: freightCharge,
      creditAmount: 0,
      narration: `Purchase ${invoiceNo} - Freight Charges`,
    });
  }

  // Round Off on Purchase (debit if positive, credit if negative)
  if (roundOffLedger && Math.abs(roundOff) > 0.001) {
    voucherLines.push({
      ledgerAccountId: roundOffLedger._id.toString(),
      debitAmount: roundOff > 0 ? roundOff : 0,
      creditAmount: roundOff < 0 ? Math.abs(roundOff) : 0,
      narration: `Purchase ${invoiceNo} - Round Off`,
    });
  }

  // Create voucher
  const v = await voucherService.createAndPost({
    companyId,
    financialYearId,
    voucherType: 'Payment',
    date: purchaseDate,
    narration: `Purchase ${invoiceNo}`,
    lines: voucherLines,
    createdBy: input.createdBy,
  });
  console.log(`[Purchase ${invoiceNo}] Voucher created: ${v.voucherNo}`);

  await PurchaseInvoice.updateOne({ _id: purchaseId }, { $set: { voucherId: v._id } });

  return v._id.toString();
}

// ─── List purchase invoices (for navigation) ──────────────
export async function listPurchases(
  companyId: string,
  financialYearId?: string
): Promise<{ _id: string; invoiceNo: string; date: string; supplierName: string; totalAmount: number }[]> {
  const filter: Record<string, unknown> = { companyId };
  if (financialYearId) filter.financialYearId = financialYearId;

  const docs = await PurchaseInvoice.find(filter)
    .sort({ date: 1, createdAt: 1 })
    .select('invoiceNo date supplierName totalAmount')
    .lean();

  return docs.map((d) => ({
    _id: d._id.toString(),
    invoiceNo: d.invoiceNo,
    date: d.date.toISOString().split('T')[0],
    supplierName: d.supplierName || '',
    totalAmount: d.totalAmount,
  }));
}

// ─── Get single purchase invoice by ID ────────────────────
export async function getPurchaseById(id: string) {
  const doc = await PurchaseInvoice.findById(id)
    .populate('supplierId', 'name code')
    .lean();
  if (!doc) throw new AppError('Purchase invoice not found', 404);
  return formatPurchaseDoc(doc);
}

// ─── Get purchase invoice by invoice number ───────────────
export async function getPurchaseByInvoiceNo(companyId: string, invoiceNo: string) {
  const doc = await PurchaseInvoice.findOne({ companyId, invoiceNo })
    .populate('supplierId', 'name code')
    .lean();
  if (!doc) throw new AppError('Purchase invoice not found', 404);
  return formatPurchaseDoc(doc);
}

// ─── Get next invoice number ──────────────────────────────
export async function getNextInvoiceNo(companyId: string): Promise<string> {
  const last = await PurchaseInvoice.findOne({ companyId })
    .sort({ createdAt: -1 })
    .select('invoiceNo')
    .lean();

  if (!last) return 'PUR-0001';

  const match = last.invoiceNo.match(/PUR-(\d+)/);
  if (match) {
    const next = parseInt(match[1], 10) + 1;
    return `PUR-${String(next).padStart(4, '0')}`;
  }
  return `PUR-${Date.now().toString(36).toUpperCase()}`;
}

// ─── Helper: format Mongo doc for API response ────────────
function formatPurchaseDoc(doc: any) {
  const supplier = doc.supplierId as any;
  return {
    _id: doc._id.toString(),
    companyId: doc.companyId.toString(),
    financialYearId: doc.financialYearId.toString(),
    invoiceNo: doc.invoiceNo,
    supplierInvoiceNo: doc.supplierInvoiceNo || '',
    date: doc.date.toISOString().split('T')[0],
    supplierId: supplier && typeof supplier === 'object' ? supplier._id?.toString() : (doc.supplierId?.toString() || ''),
    supplierName: doc.supplierName || (supplier && typeof supplier === 'object' ? supplier.name : '') || '',
    vatType: doc.vatType || 'Vat',
    narration: doc.narration || '',
    totalAmount: doc.totalAmount,
    itemsDiscount: doc.itemsDiscount ?? 0,
    otherDiscount: doc.otherDiscount ?? 0,
    otherCharges: doc.otherCharges ?? 0,
    freightCharge: doc.freightCharge ?? 0,
    roundOff: doc.roundOff ?? 0,
    batches: (doc.batches || []).map((b: any) => ({
      productId: b.productId.toString(),
      productCode: b.productCode || '',
      productName: b.productName || '',
      batchNumber: b.batchNumber || '',
      purchasePrice: b.purchasePrice,
      quantity: b.quantity,
      discAmount: b.discAmount ?? 0,
      expiryDate: b.expiryDate ? new Date(b.expiryDate).toISOString().split('T')[0] : '',
      retail: b.retail ?? 0,
      wholesale: b.wholesale ?? 0,
      specialPrice1: b.specialPrice1 ?? 0,
      specialPrice2: b.specialPrice2 ?? 0,
    })),
  };
}

// ─── Get batches for a specific product across all purchases ─
// Returns only batches with actual available stock > 0,
// using FIFO to distribute sold quantities across batches.
export async function getBatchesByProduct(
  companyId: string,
  productId: string
): Promise<{
  batchNumber: string;
  productId: string;
  productName: string;
  purchasePrice: number;
  expiryDate: string;
  quantity: number;
  retail: number;
  wholesale: number;
}[]> {
  const companyOid = new mongoose.Types.ObjectId(companyId);
  const productOid = new mongoose.Types.ObjectId(productId);

  // 1. Get raw purchase batches sorted oldest first
  const docs = await PurchaseInvoice.find({
    companyId,
    'batches.productId': productId,
  })
    .select('batches date createdAt')
    .sort({ date: 1, createdAt: 1 })
    .lean();

  const rawBatches: {
    batchNumber: string;
    productId: string;
    productName: string;
    purchasePrice: number;
    expiryDate: string;
    purchasedQty: number;
    retail: number;
    wholesale: number;
    date: Date;
  }[] = [];

  for (const doc of docs) {
    for (const b of doc.batches) {
      if (b.productId.toString() === productId) {
        rawBatches.push({
          batchNumber: b.batchNumber || '',
          productId: b.productId.toString(),
          productName: b.productName || '',
          purchasePrice: b.purchasePrice ?? 0,
          expiryDate: b.expiryDate ? new Date(b.expiryDate).toISOString().split('T')[0] : '',
          purchasedQty: b.quantity ?? 0,
          retail: b.retail ?? 0,
          wholesale: b.wholesale ?? 0,
          date: doc.date,
        });
      }
    }
  }

  if (rawBatches.length === 0) return [];

  // 2. Get net stock from InventoryTransaction (totalIn - totalOut)
  const stockAgg = await InventoryTransaction.aggregate([
    { $match: { companyId: companyOid, productId: productOid } },
    {
      $group: {
        _id: null,
        totalIn: { $sum: '$quantityIn' },
        totalOut: { $sum: '$quantityOut' },
      },
    },
  ]);
  const netStock = stockAgg.length > 0 ? stockAgg[0].totalIn - stockAgg[0].totalOut : 0;
  const totalPurchased = rawBatches.reduce((sum, b) => sum + b.purchasedQty, 0);
  const totalSold = totalPurchased - netStock;

  // 3. Distribute sold qty across batches using FIFO (oldest first)
  let soldRemaining = Math.max(totalSold, 0);
  const result: {
    batchNumber: string;
    productId: string;
    productName: string;
    purchasePrice: number;
    expiryDate: string;
    quantity: number;
    retail: number;
    wholesale: number;
  }[] = [];

  for (const b of rawBatches) {
    const soldFromBatch = Math.min(b.purchasedQty, soldRemaining);
    const availableQty = b.purchasedQty - soldFromBatch;
    soldRemaining -= soldFromBatch;

    // Only include batches that still have stock
    if (availableQty > 0) {
      result.push({
        batchNumber: b.batchNumber,
        productId: b.productId,
        productName: b.productName,
        purchasePrice: b.purchasePrice,
        expiryDate: b.expiryDate,
        quantity: availableQty,
        retail: b.retail,
        wholesale: b.wholesale,
      });
    }
  }

  return result;
}
