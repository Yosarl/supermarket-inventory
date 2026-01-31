import mongoose from 'mongoose';
import { SalesInvoice } from '../models/SalesInvoice';
import { SalesInvoiceItem } from '../models/SalesInvoiceItem';
import { InventoryTransaction } from '../models/InventoryTransaction';
import { Product } from '../models/Product';
import { Company } from '../models/Company';
import { LedgerAccount } from '../models/LedgerAccount';
import { Voucher } from '../models/Voucher';
import { AppError } from '../middlewares/errorHandler';
import * as ledgerService from './ledgerService';
import * as voucherService from './voucherService';

export interface POSLineItem {
  productId: string;
  quantity: number;
  unitPrice: number;
  discount?: number;
  vatRate?: number;
}

export interface POSPayment {
  mode: string;
  amount: number;
  reference?: string;
}

export interface CreatePOSSaleInput {
  companyId: string;
  financialYearId: string;
  items: POSLineItem[];
  billDiscount?: number;
  paymentDetails: POSPayment[];
  customerId?: string;
  customerName?: string;
  customerTRN?: string;
  createdBy?: string;
}

function getVatRate(vatCategory: string, companyVatRate: number): number {
  if (vatCategory === 'exempt' || vatCategory === 'zero') return 0;
  return companyVatRate;
}

export async function getNextInvoiceNo(
  companyId: string,
  financialYearId: string,
  type: string
): Promise<string> {
  const prefix = 'INV';
  const last = await SalesInvoice.findOne({ companyId, financialYearId, type })
    .sort({ invoiceNo: -1 })
    .lean();
  const num = last?.invoiceNo ? parseInt(last.invoiceNo.replace(/\D/g, ''), 10) + 1 : 1;
  return `${prefix}-${num.toString().padStart(6, '0')}`;
}

export async function createPOSSale(input: CreatePOSSaleInput): Promise<{ invoiceId: string; invoiceNo: string }> {
  const company = await Company.findById(input.companyId);
  if (!company) throw new AppError('Company not found', 404);
  const vatRatePct = company.vatConfig?.standardRate ?? 5;
  const date = new Date();

  let grossAmount = 0;
  let discountAmount = input.billDiscount ?? 0;
  const lineItems: Array<{
    productId: mongoose.Types.ObjectId;
    description: string;
    quantity: number;
    unitPrice: number;
    discount: number;
    netAmount: number;
    vatRate: number;
    vatAmount: number;
    totalAmount: number;
    costPriceAtSale: number;
  }> = [];

  for (const item of input.items) {
    const product = await Product.findById(item.productId).lean();
    if (!product || product.companyId.toString() !== input.companyId) {
      throw new AppError(`Product not found: ${item.productId}`, 404);
    }
    const lineDiscount = item.discount ?? 0;
    const netBeforeVat = item.quantity * item.unitPrice - lineDiscount;
    const vatRate = (item.vatRate ?? getVatRate(product.vatCategory, vatRatePct)) / 100;
    const vatAmount = netBeforeVat * vatRate;
    const totalAmount = netBeforeVat + vatAmount;
    grossAmount += item.quantity * item.unitPrice;
    discountAmount += lineDiscount;
    lineItems.push({
      productId: product._id,
      description: product.name,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      discount: lineDiscount,
      netAmount: netBeforeVat,
      vatRate: vatRate * 100,
      vatAmount,
      totalAmount,
      costPriceAtSale: product.purchasePrice ?? 0,
    });
  }

  const taxableAmount = grossAmount - discountAmount;
  const vatAmount = lineItems.reduce((s, l) => s + l.vatAmount, 0);
  const totalAmount = taxableAmount + vatAmount;

  const invoiceNo = await getNextInvoiceNo(
    input.companyId,
    input.financialYearId,
    'POS'
  );

  const invoice = await SalesInvoice.create({
    companyId: input.companyId,
    financialYearId: input.financialYearId,
    invoiceNo,
    date,
    time: date.toTimeString().slice(0, 8),
    type: 'POS',
    customerId: input.customerId,
    customerName: input.customerName ?? 'Walk-in',
    customerTRN: input.customerTRN,
    grossAmount,
    discountAmount,
    taxableAmount,
    vatAmount,
    totalAmount,
    paymentDetails: input.paymentDetails,
    status: 'Final',
    createdBy: input.createdBy,
  });

  for (const line of lineItems) {
    await SalesInvoiceItem.create({
      invoiceId: invoice._id,
      productId: line.productId,
      description: line.description,
      quantity: line.quantity,
      unitPrice: line.unitPrice,
      discount: line.discount,
      netAmount: line.netAmount,
      vatRate: line.vatRate,
      vatAmount: line.vatAmount,
      totalAmount: line.totalAmount,
      costPriceAtSale: line.costPriceAtSale,
    });
  }

  const cashLedger = await LedgerAccount.findOne({
    companyId: input.companyId,
    type: 'Cash',
  });
  const salesLedger = await LedgerAccount.findOne({
    companyId: input.companyId,
    code: /SALES/i,
  });
  const vatLedger = await LedgerAccount.findOne({
    companyId: input.companyId,
    name: /VAT|Output/i,
  });

  const voucherLines: Array<{ ledgerAccountId: string; debitAmount: number; creditAmount: number; narration?: string }> = [];
  if (cashLedger) {
    voucherLines.push({
      ledgerAccountId: cashLedger._id.toString(),
      debitAmount: totalAmount,
      creditAmount: 0,
      narration: `POS ${invoiceNo}`,
    });
  }
  if (salesLedger) {
    const salesCredit = vatLedger && vatAmount > 0 ? taxableAmount : totalAmount - (vatAmount || 0);
    voucherLines.push({
      ledgerAccountId: salesLedger._id.toString(),
      debitAmount: 0,
      creditAmount: salesCredit,
      narration: `POS ${invoiceNo}`,
    });
  }
  if (vatLedger && vatAmount > 0) {
    voucherLines.push({
      ledgerAccountId: vatLedger._id.toString(),
      debitAmount: 0,
      creditAmount: vatAmount,
      narration: `POS ${invoiceNo}`,
    });
  }

  if (voucherLines.length >= 2) {
    const totalDebit = voucherLines.reduce((s, l) => s + l.debitAmount, 0);
    const totalCredit = voucherLines.reduce((s, l) => s + l.creditAmount, 0);
    const diff = totalDebit - totalCredit;
    if (Math.abs(diff) > 0.01 && salesLedger) {
      voucherLines.push({
        ledgerAccountId: salesLedger._id.toString(),
        debitAmount: diff > 0 ? 0 : Math.abs(diff),
        creditAmount: diff > 0 ? diff : 0,
        narration: 'Round',
      });
    }
    const v = await voucherService.createAndPost({
      companyId: input.companyId,
      financialYearId: input.financialYearId,
      voucherType: 'Receipt',
      date,
      narration: `POS Sale ${invoiceNo}`,
      lines: voucherLines,
      createdBy: input.createdBy,
    });
    await SalesInvoice.updateOne(
      { _id: invoice._id },
      { $set: { voucherId: v._id } }
    );
  }

  for (const line of lineItems) {
    await InventoryTransaction.create({
      companyId: input.companyId,
      financialYearId: input.financialYearId,
      productId: line.productId,
      date,
      type: 'Sales',
      quantityIn: 0,
      quantityOut: line.quantity,
      costPrice: line.costPriceAtSale,
      referenceType: 'SalesInvoice',
      referenceId: invoice._id,
      createdBy: input.createdBy,
    });
  }

  return {
    invoiceId: invoice._id.toString(),
    invoiceNo: invoice.invoiceNo,
  };
}

export async function getInvoice(invoiceId: string, companyId: string) {
  const invoice = await SalesInvoice.findOne({ _id: invoiceId, companyId })
    .populate('customerId', 'name code')
    .lean();
  if (!invoice) return null;
  const items = await SalesInvoiceItem.find({ invoiceId }).populate('productId', 'name sku systemBarcode').lean();
  return { ...invoice, items };
}
