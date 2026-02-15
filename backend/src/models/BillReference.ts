import mongoose, { Document, Schema } from 'mongoose';

/**
 * Tally-style bill-by-bill tracking.
 *
 * When a Sales/Purchase invoice is saved → a "New Ref" row is created.
 * When a Receipt/Payment voucher settles part/all of that bill → "Agst Ref" rows
 * are created, reducing the outstanding amount.
 */

export type BillRefType = 'New Ref' | 'Agst Ref';

export interface IBillReference extends Document {
    companyId: mongoose.Types.ObjectId;
    financialYearId: mongoose.Types.ObjectId;
    /** The ledger account of the Customer / Supplier */
    ledgerAccountId: mongoose.Types.ObjectId;
    /** 'New Ref' = invoice created outstanding, 'Agst Ref' = payment clearing it */
    refType: BillRefType;
    /** Invoice number (e.g. B2C-000001, PUR-0001) — the bill reference name */
    billNumber: string;
    /** Reference to the source invoice/voucher that created or settled this */
    referenceType: string; // 'SalesInvoice' | 'PurchaseInvoice' | 'Voucher'
    referenceId: mongoose.Types.ObjectId;
    /** Date of the transaction */
    date: Date;
    /** Amount of this reference entry (always positive) */
    amount: number;
    /** 'Dr' if money is owed TO us (receivable), 'Cr' if money is owed BY us (payable) */
    drCr: 'Dr' | 'Cr';
    /** Narration / description */
    narration?: string;
    createdAt: Date;
}

const BillReferenceSchema = new Schema<IBillReference>(
    {
        companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true },
        financialYearId: { type: Schema.Types.ObjectId, ref: 'FinancialYear', required: true },
        ledgerAccountId: { type: Schema.Types.ObjectId, ref: 'LedgerAccount', required: true },
        refType: { type: String, enum: ['New Ref', 'Agst Ref'], required: true },
        billNumber: { type: String, required: true },
        referenceType: { type: String, required: true },
        referenceId: { type: Schema.Types.ObjectId, required: true },
        date: { type: Date, required: true },
        amount: { type: Number, required: true },
        drCr: { type: String, enum: ['Dr', 'Cr'], required: true },
        narration: { type: String },
    },
    { timestamps: { createdAt: true, updatedAt: false } }
);

// Find all refs for a specific party
BillReferenceSchema.index({ companyId: 1, ledgerAccountId: 1, billNumber: 1 });
// Find by source document
BillReferenceSchema.index({ referenceType: 1, referenceId: 1 });
// Find outstanding bills for a party
BillReferenceSchema.index({ companyId: 1, ledgerAccountId: 1, refType: 1 });

export const BillReference = mongoose.model<IBillReference>(
    'BillReference',
    BillReferenceSchema
);
