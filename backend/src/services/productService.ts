import mongoose from 'mongoose';
import { Product, IProduct } from '../models/Product';
import { UnitOfMeasure } from '../models/UnitOfMeasure';
import { AppError } from '../middlewares/errorHandler';

export interface CreateProductInput {
  companyId: string;
  name: string;
  sku?: string;
  internationalBarcode?: string;
  categoryId?: string;
  defaultVendorId?: string;
  purchasePrice?: number;
  sellingPrice?: number;
  mrp?: number;
  vatCategory?: 'standard' | 'zero' | 'exempt';
  unitOfMeasureId: string;
  minStockLevel?: number;
  reorderLevel?: number;
  createdBy?: string;
}

function generateSystemBarcode(companyId: string): string {
  return `SYS-${companyId.slice(-6)}-${Date.now().toString(36).toUpperCase()}`;
}

export async function createProduct(input: CreateProductInput): Promise<IProduct> {
  const companyId = input.companyId;
  const sku = input.sku || `SKU-${Date.now()}`;
  let systemBarcode = `SYS-${Date.now()}`;
  const lastProduct = await Product.findOne({ companyId }).sort({ systemBarcode: -1 });
  if (lastProduct?.systemBarcode) {
    const match = lastProduct.systemBarcode.match(/-(\d+)$/);
    const num = match ? parseInt(match[1], 10) + 1 : 1;
    systemBarcode = `SYS-${companyId.slice(-6)}-${num}`;
  } else {
    systemBarcode = generateSystemBarcode(companyId);
  }

  if (input.internationalBarcode) {
    const existing = await Product.findOne({ companyId, internationalBarcode: input.internationalBarcode });
    if (existing) throw new AppError('International barcode already exists', 400);
  }

  const product = await Product.create({
    companyId,
    name: input.name,
    sku,
    internationalBarcode: input.internationalBarcode,
    systemBarcode,
    categoryId: input.categoryId,
    defaultVendorId: input.defaultVendorId,
    purchasePrice: input.purchasePrice ?? 0,
    sellingPrice: input.sellingPrice ?? 0,
    mrp: input.mrp,
    vatCategory: input.vatCategory ?? 'standard',
    unitOfMeasureId: input.unitOfMeasureId,
    minStockLevel: input.minStockLevel,
    reorderLevel: input.reorderLevel,
    status: 'active',
    createdBy: input.createdBy,
  });
  return product.toObject();
}

export async function findByBarcode(
  companyId: string,
  barcode: string
): Promise<IProduct | null> {
  return Product.findOne({
    companyId,
    status: 'active',
    $or: [{ internationalBarcode: barcode }, { systemBarcode: barcode }, { sku: barcode }],
  })
    .populate('unitOfMeasureId', 'name shortCode')
    .populate('categoryId', 'name code')
    .lean();
}

export async function list(
  companyId: string,
  opts: { search?: string; categoryId?: string; page?: number; limit?: number } = {}
): Promise<{ products: IProduct[]; total: number }> {
  const filter: Record<string, unknown> = { companyId };
  if (opts.categoryId) filter.categoryId = opts.categoryId;
  if (opts.search) {
    filter.$or = [
      { name: new RegExp(opts.search, 'i') },
      { sku: new RegExp(opts.search, 'i') },
      { internationalBarcode: opts.search },
      { systemBarcode: opts.search },
    ];
  }
  const total = await Product.countDocuments(filter);
  const page = opts.page ?? 1;
  const limit = Math.min(opts.limit ?? 20, 100);
  const products = await Product.find(filter)
    .populate('unitOfMeasureId', 'name shortCode')
    .populate('categoryId', 'name code')
    .sort({ name: 1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .lean();
  return { products, total };
}

export async function getById(productId: string, companyId: string): Promise<IProduct | null> {
  return Product.findOne({ _id: productId, companyId })
    .populate('unitOfMeasureId')
    .populate('categoryId')
    .populate('defaultVendorId', 'name code')
    .lean();
}

export async function getUnitOfMeasures(companyId: string) {
  return UnitOfMeasure.find({ companyId }).sort({ shortCode: 1 }).lean();
}
