import mongoose from 'mongoose';
import { SalesInvoice } from '../models/SalesInvoice';
import { SalesInvoiceItem } from '../models/SalesInvoiceItem';
import { AppError } from '../middlewares/errorHandler';

// ─── Interfaces ─────────────────────────────────────────────

export interface QuotationLineItem {
  productId: string;
  productCode?: string;
  imei?: string;
  multiUnitId?: string;
  unitId?: string;
  unitName?: string;
  description?: string;
  quantity: number;
  unitPrice: number;
  discountPercent?: number;
  discount?: number;
  vatRate?: number;
}

export interface CreateQuotationInput {
  companyId: string;
  financialYearId: string;
  date?: string;
  items: QuotationLineItem[];
  customerId?: string;
  customerName?: string;
  customerAddress?: string;
  customerPhone?: string;
  salesmanId?: string;
  rateType?: 'Retail' | 'WSale' | 'Special1' | 'Special2';
  vatType?: 'Vat' | 'NonVat';
  otherDiscount?: number;
  otherCharges?: number;
  freightCharge?: number;
  roundOff?: number;
  narration?: string;
  shippingName?: string;
  shippingAddress?: string;
  shippingPhone?: string;
  shippingContactPerson?: string;
  createdBy?: string;
}

// ─── Next Invoice Number ────────────────────────────────────
// Fixed: match last invoice number by sorting invoiceNo desc
export async function getNextQuotationInvoiceNo(
  companyId: string,
  financialYearId: string
): Promise<string> {
  const lastInvoice = await SalesInvoice.findOne({
    companyId,
    financialYearId,
    type: 'Quotation',
  })
    .sort({ invoiceNo: -1 }) // Sort by invoiceNo, not createdAt
    .select('invoiceNo')
    .lean();

  if (!lastInvoice || !lastInvoice.invoiceNo) return 'QTN-000001';

  // Extract numeric part from end of string (QTN-123 or QTN123)
  const match = lastInvoice.invoiceNo.match(/(\d+)$/);
  if (!match) return 'QTN-000001';

  const nextNum = parseInt(match[1], 10) + 1;
  return `QTN-${nextNum.toString().padStart(6, '0')}`;
}

// ─── Create Quotation ───────────────────────────────────────

export async function createQuotation(
  input: CreateQuotationInput
): Promise<{ invoiceId: string; invoiceNo: string }> {
  if (!input.items || input.items.length === 0) {
    throw new AppError('At least one item is required', 400);
  }

  const invoiceNo = await getNextQuotationInvoiceNo(input.companyId, input.financialYearId);
  const saleDate = input.date ? new Date(input.date) : new Date();

  const VAT_RATE = 5;
  const isVat = (input.vatType || 'Vat') === 'Vat';

  // Calculate line items
  let grossAmount = 0;
  let discountAmount = 0;
  let vatAmount = 0;

  const lineItems = input.items.map((item) => {
    const lineGross = parseFloat((item.quantity * item.unitPrice).toFixed(2));
    const lineDisc = item.discount ?? 0;
    const lineNet = parseFloat((lineGross - lineDisc).toFixed(2));
    let lineVat = 0;
    if (isVat) {
      lineVat = parseFloat((lineNet * VAT_RATE / (100 + VAT_RATE)).toFixed(2));
    }

    grossAmount += lineGross;
    discountAmount += lineDisc;
    vatAmount += lineVat;

    return {
      productId: item.productId,
      productCode: item.productCode || '',
      imei: item.imei || '',
      multiUnitId: item.multiUnitId || '',
      unitId: item.unitId || '',
      unitName: item.unitName || '',
      description: item.description || '',
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      grossAmount: lineGross,
      discountPercent: item.discountPercent ?? 0,
      discount: lineDisc,
      netAmount: lineNet,
      vatRate: isVat ? VAT_RATE : 0,
      vatAmount: lineVat,
      totalAmount: lineNet, // For quotation, total = net (inclusive tax)
    };
  });

  const otherDiscount = input.otherDiscount ?? 0;
  const otherCharges = input.otherCharges ?? 0;
  const freightCharge = input.freightCharge ?? 0;
  const roundOff = input.roundOff ?? 0;

  const taxableAmount = parseFloat((grossAmount - discountAmount).toFixed(2));
  const totalAmount = parseFloat((taxableAmount - otherDiscount + otherCharges + freightCharge + roundOff).toFixed(2));

  // Create the invoice header
  const invoice = await SalesInvoice.create({
    companyId: input.companyId,
    financialYearId: input.financialYearId,
    invoiceNo,
    date: saleDate,
    type: 'Quotation',
    customerId: input.customerId ? new mongoose.Types.ObjectId(input.customerId) : undefined,
    customerName: input.customerName || '',
    customerAddress: input.customerAddress || '',
    rateType: input.rateType || 'WSale',
    paymentType: 'Cash',
    vatType: input.vatType || 'Vat',
    grossAmount,
    discountAmount,
    taxableAmount,
    vatAmount,
    otherDiscount,
    otherCharges,
    freightCharge,
    lendAddLess: 0,
    roundOff,
    totalAmount,
    cashReceived: 0,
    balance: 0,
    oldBalance: 0,
    netBalance: 0,
    paymentDetails: [],
    narration: input.narration || '',
    shippingName: input.shippingName || '',
    shippingAddress: input.shippingAddress || '',
    shippingPhone: input.shippingPhone || '',
    shippingContactPerson: input.shippingContactPerson || '',
    status: 'Final',
    createdBy: input.createdBy ? new mongoose.Types.ObjectId(input.createdBy) : undefined,
  });

  // Create line items (in SalesInvoiceItem collection)
  for (const line of lineItems) {
    await SalesInvoiceItem.create({
      invoiceId: invoice._id,
      productId: line.productId,
      productCode: line.productCode,
      imei: line.imei,
      multiUnitId: line.multiUnitId,
      unitId: line.unitId,
      unitName: line.unitName,
      description: line.description,
      quantity: line.quantity,
      unitPrice: line.unitPrice,
      grossAmount: line.grossAmount,
      discountPercent: line.discountPercent,
      discount: line.discount,
      netAmount: line.netAmount,
      vatRate: line.vatRate,
      vatAmount: line.vatAmount,
      totalAmount: line.totalAmount,
      costPriceAtSale: 0, // No cost tracking for quotations
    });
  }

  // No stock deduction for quotations
  // No voucher/ledger entries for quotations

  return { invoiceId: invoice._id.toString(), invoiceNo };
}

// ─── Update Quotation ───────────────────────────────────────

export async function updateQuotation(
  invoiceId: string,
  companyId: string,
  input: Partial<CreateQuotationInput>,
  userId: string
): Promise<{ invoiceId: string; invoiceNo: string } | null> {
  const existing = await SalesInvoice.findOne({
    _id: invoiceId,
    companyId,
    type: 'Quotation',
  });
  if (!existing) return null;

  const saleDate = input.date ? new Date(input.date) : existing.date;
  const VAT_RATE = 5;
  const isVat = (input.vatType || existing.vatType || 'Vat') === 'Vat';

  if (input.items && input.items.length > 0) {
    // Delete old items
    await SalesInvoiceItem.deleteMany({ invoiceId });

    let grossAmount = 0;
    let discountAmount = 0;
    let vatAmount = 0;

    const lineItems = input.items.map((item) => {
      const lineGross = parseFloat((item.quantity * item.unitPrice).toFixed(2));
      const lineDisc = item.discount ?? 0;
      const lineNet = parseFloat((lineGross - lineDisc).toFixed(2));
      let lineVat = 0;
      if (isVat) {
        lineVat = parseFloat((lineNet * VAT_RATE / (100 + VAT_RATE)).toFixed(2));
      }

      grossAmount += lineGross;
      discountAmount += lineDisc;
      vatAmount += lineVat;

      return {
        productId: item.productId,
        productCode: item.productCode || '',
        imei: item.imei || '',
        multiUnitId: item.multiUnitId || '',
        unitId: item.unitId || '',
        unitName: item.unitName || '',
        description: item.description || '',
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        grossAmount: lineGross,
        discountPercent: item.discountPercent ?? 0,
        discount: lineDisc,
        netAmount: lineNet,
        vatRate: isVat ? VAT_RATE : 0,
        vatAmount: lineVat,
        totalAmount: lineNet,
      };
    });

    const otherDiscount = input.otherDiscount ?? existing.otherDiscount ?? 0;
    const otherCharges = input.otherCharges ?? existing.otherCharges ?? 0;
    const freightCharge = input.freightCharge ?? existing.freightCharge ?? 0;
    const roundOff = input.roundOff ?? existing.roundOff ?? 0;

    const taxableAmount = parseFloat((grossAmount - discountAmount).toFixed(2));
    const totalAmount = parseFloat((taxableAmount - otherDiscount + otherCharges + freightCharge + roundOff).toFixed(2));

    // Create new items
    for (const line of lineItems) {
      await SalesInvoiceItem.create({
        invoiceId: existing._id,
        productId: line.productId,
        productCode: line.productCode,
        imei: line.imei,
        multiUnitId: line.multiUnitId,
        unitId: line.unitId,
        unitName: line.unitName,
        description: line.description,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        grossAmount: line.grossAmount,
        discountPercent: line.discountPercent,
        discount: line.discount,
        netAmount: line.netAmount,
        vatRate: line.vatRate,
        vatAmount: line.vatAmount,
        totalAmount: line.totalAmount,
        costPriceAtSale: 0,
      });
    }

    await SalesInvoice.updateOne(
      { _id: invoiceId },
      {
        $set: {
          date: saleDate,
          customerId: input.customerId ? new mongoose.Types.ObjectId(input.customerId) : existing.customerId,
          customerName: input.customerName ?? existing.customerName,
          customerAddress: input.customerAddress ?? existing.customerAddress,
          rateType: input.rateType ?? existing.rateType,
          vatType: input.vatType ?? existing.vatType,
          grossAmount,
          discountAmount,
          taxableAmount,
          vatAmount,
          otherDiscount,
          otherCharges,
          freightCharge,
          roundOff,
          totalAmount,
          narration: input.narration ?? existing.narration,
          shippingName: input.shippingName ?? existing.shippingName,
          shippingAddress: input.shippingAddress ?? existing.shippingAddress,
          shippingPhone: input.shippingPhone ?? existing.shippingPhone,
          shippingContactPerson: input.shippingContactPerson ?? existing.shippingContactPerson,
          updatedBy: new mongoose.Types.ObjectId(userId),
        },
      }
    );
  }

  return { invoiceId, invoiceNo: existing.invoiceNo };
}

// ─── Delete Quotation ───────────────────────────────────────

export async function deleteQuotation(
  invoiceId: string,
  companyId: string
): Promise<boolean> {
  const invoice = await SalesInvoice.findOne({
    _id: invoiceId,
    companyId,
    type: 'Quotation',
  });
  if (!invoice) return false;

  // Delete line items
  await SalesInvoiceItem.deleteMany({ invoiceId });
  // Delete the invoice
  await SalesInvoice.deleteOne({ _id: invoiceId });

  return true;
}

// ─── List Quotations ────────────────────────────────────────

export async function listQuotations(
  companyId: string,
  financialYearId: string,
  opts: { search?: string; fromDate?: string; toDate?: string; page?: number; limit?: number } = {}
) {
  const filter: Record<string, unknown> = {
    companyId,
    financialYearId,
    type: 'Quotation',
  };

  if (opts.search) {
    filter.invoiceNo = { $regex: opts.search, $options: 'i' };
  }
  if (opts.fromDate || opts.toDate) {
    const dateFilter: Record<string, Date> = {};
    if (opts.fromDate) dateFilter.$gte = new Date(opts.fromDate);
    if (opts.toDate) dateFilter.$lte = new Date(opts.toDate);
    filter.date = dateFilter;
  }

  const page = opts.page || 1;
  const limit = opts.limit || 20;
  const skip = (page - 1) * limit;

  const [invoices, total] = await Promise.all([
    SalesInvoice.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select('invoiceNo date customerName totalAmount status')
      .lean(),
    SalesInvoice.countDocuments(filter),
  ]);

  return {
    invoices: invoices.map((inv) => ({
      _id: inv._id.toString(),
      invoiceNo: inv.invoiceNo,
      date: inv.date.toISOString().split('T')[0],
      customerName: inv.customerName || '',
      totalAmount: inv.totalAmount,
      status: inv.status,
    })),
    total,
    page,
    limit,
  };
}

// ─── Get Quotation by ID ────────────────────────────────────

export async function getQuotation(invoiceId: string, companyId: string) {
  const inv = await SalesInvoice.findOne({
    _id: invoiceId,
    companyId,
    type: 'Quotation',
  })
    .populate('customerId', 'name code')
    .lean();

  if (!inv) return null;

  const items = await SalesInvoiceItem.find({ invoiceId })
    .populate({
      path: 'productId',
      select: 'name code retailPrice wholesalePrice purchasePrice multiUnits unitOfMeasureId allowBatches imei',
      populate: { path: 'unitOfMeasureId', select: 'name shortCode' },
    })
    .lean();

  return {
    _id: inv._id.toString(),
    companyId: inv.companyId.toString(),
    financialYearId: inv.financialYearId.toString(),
    invoiceNo: inv.invoiceNo,
    date: inv.date.toISOString().split('T')[0],
    customerId: (inv.customerId as any)?._id?.toString() || inv.customerId?.toString() || '',
    customerName: inv.customerName || '',
    customerAddress: inv.customerAddress || '',
    rateType: inv.rateType,
    vatType: inv.vatType,
    grossAmount: inv.grossAmount,
    discountAmount: inv.discountAmount,
    taxableAmount: inv.taxableAmount,
    vatAmount: inv.vatAmount,
    otherDiscount: inv.otherDiscount,
    otherCharges: inv.otherCharges,
    freightCharge: inv.freightCharge,
    roundOff: inv.roundOff,
    totalAmount: inv.totalAmount,
    narration: inv.narration || '',
    shippingName: inv.shippingName || '',
    shippingAddress: inv.shippingAddress || '',
    shippingPhone: inv.shippingPhone || '',
    shippingContactPerson: inv.shippingContactPerson || '',
    status: inv.status,
    items: items.map((item: any) => ({
      _id: item._id.toString(),
      productId: item.productId?._id?.toString() || item.productId?.toString() || '',
      product: item.productId,
      productCode: item.productCode || '',
      imei: item.imei || '',
      multiUnitId: item.multiUnitId || '',
      unitId: item.unitId || '',
      unitName: item.unitName || '',
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      grossAmount: item.grossAmount || 0,
      discountPercent: item.discountPercent || 0,
      discount: item.discount || 0,
      netAmount: item.netAmount || 0,
      vatRate: item.vatRate || 0,
      vatAmount: item.vatAmount || 0,
      totalAmount: item.totalAmount || 0,
    })),
  };
}

// ─── Search by Invoice Number ───────────────────────────────

export async function searchQuotationByInvoiceNo(
  companyId: string,
  invoiceNo: string
) {
  const inv = await SalesInvoice.findOne({
    companyId,
    invoiceNo: { $regex: `^${invoiceNo}$`, $options: 'i' },
    type: 'Quotation',
  }).lean();

  if (!inv) return null;

  return getQuotation(inv._id.toString(), companyId);
}
