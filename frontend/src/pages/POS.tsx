import { useState, useRef, useEffect } from 'react';
import { Box, Button, TextField, Typography, Paper, Table, TableBody, TableCell, TableHead, TableRow, Alert } from '@mui/material';
import { useAppSelector } from '../store/hooks';
import { productApi, salesApi } from '../services/api';

type Line = { productId: string; name: string; quantity: number; unitPrice: number; totalAmount: number };

export default function POS() {
  const [barcode, setBarcode] = useState('');
  const [lines, setLines] = useState<Line[]>([]);
  const [billDiscount, setBillDiscount] = useState(0);
  const [message, setMessage] = useState('');
  const barcodeRef = useRef<HTMLInputElement>(null);
  const companyId = useAppSelector((s) => s.app.selectedCompanyId);
  const financialYearId = useAppSelector((s) => s.app.selectedFinancialYearId);

  useEffect(() => { barcodeRef.current?.focus(); }, []);

  const addByBarcode = async () => {
    if (!companyId || !barcode.trim()) return;
    try {
      const res = await productApi.getByBarcode(companyId, barcode.trim());
      const p = res.data.data as { _id: string; name: string; sellingPrice: number } | null;
      if (!p) { setMessage('Product not found'); return; }
      const existing = lines.find((l) => l.productId === p._id);
      const qty = existing ? existing.quantity + 1 : 1;
      const unitPrice = p.sellingPrice ?? 0;
      const totalAmount = qty * unitPrice;
      const line: Line = { productId: p._id, name: p.name, quantity: qty, unitPrice, totalAmount };
      if (existing) setLines(lines.map((l) => l.productId === p._id ? line : l));
      else setLines([...lines, line]);
      setBarcode('');
      setMessage('');
    } catch { setMessage('Product not found'); }
  };

  const removeLine = (idx: number) => setLines(lines.filter((_, i) => i !== idx));
  const totalAmount = lines.reduce((s, l) => s + l.totalAmount, 0) - billDiscount;

  const completeSale = async () => {
    if (!companyId || !financialYearId || lines.length === 0) { setMessage('Add items and ensure company/FY selected.'); return; }
    try {
      const res = await salesApi.createPOS({
        companyId,
        financialYearId,
        items: lines.map((l) => ({ productId: l.productId, quantity: l.quantity, unitPrice: l.unitPrice })),
        paymentDetails: [{ mode: 'Cash', amount: totalAmount }],
        billDiscount,
      });
      const data = res.data.data as { invoiceNo: string };
      setMessage('Sale complete. Invoice: ' + (data?.invoiceNo ?? ''));
      setLines([]);
      setBillDiscount(0);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      setMessage(err?.response?.data?.message ?? 'Sale failed');
    }
  };

  if (!companyId) return <Typography color="error">Select a company first.</Typography>;
  if (!financialYearId) return <Typography color="error">Select a financial year first.</Typography>;

  return (
    <Box>
      <Typography variant="h4" gutterBottom>POS Sales</Typography>
      {message && <Alert severity={message.includes('complete') ? 'success' : 'error'} onClose={() => setMessage('')} sx={{ mb: 2 }}>{message}</Alert>}
      <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
        <TextField inputRef={barcodeRef} label="Barcode" value={barcode} onChange={(e) => setBarcode(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addByBarcode())} size="small" sx={{ width: 280 }} />
        <Button variant="contained" onClick={addByBarcode}>Add</Button>
      </Box>
      <Paper sx={{ p: 2, mb: 2 }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Product</TableCell>
              <TableCell align="right">Qty</TableCell>
              <TableCell align="right">Price</TableCell>
              <TableCell align="right">Total</TableCell>
              <TableCell width={60} />
            </TableRow>
          </TableHead>
          <TableBody>
            {lines.map((l, i) => (
              <TableRow key={i}>
                <TableCell>{l.name}</TableCell>
                <TableCell align="right">{l.quantity}</TableCell>
                <TableCell align="right">{l.unitPrice.toFixed(2)}</TableCell>
                <TableCell align="right">{l.totalAmount.toFixed(2)}</TableCell>
                <TableCell><Button size="small" color="error" onClick={() => removeLine(i)}>Remove</Button></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 2 }}>
          <TextField type="number" label="Discount (AED)" value={billDiscount} onChange={(e) => setBillDiscount(Number(e.target.value) || 0)} size="small" sx={{ width: 120 }} />
          <Typography variant="h6">Total: AED {totalAmount.toFixed(2)}</Typography>
        </Box>
      </Paper>
      <Button variant="contained" size="large" onClick={completeSale} disabled={lines.length === 0}>Complete Sale</Button>
    </Box>
  );
}
