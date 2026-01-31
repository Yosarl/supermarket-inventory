import { useEffect, useState } from 'react';
import { Box, Button, TextField, Typography, Paper } from '@mui/material';
import { useAppSelector } from '../store/hooks';
import { productApi, openingStockApi } from '../services/api';

export default function OpeningStock() {
  const [products, setProducts] = useState<Array<{ _id: string; name: string }>>([]);
  const [productId, setProductId] = useState('');
  const [quantity, setQuantity] = useState(0);
  const [costPrice, setCostPrice] = useState(0);
  const [message, setMessage] = useState('');
  const companyId = useAppSelector((s) => s.app.selectedCompanyId);
  const financialYearId = useAppSelector((s) => s.app.selectedFinancialYearId);

  useEffect(() => {
    if (!companyId) return;
    productApi.list(companyId, { limit: 500 }).then((res) => {
      const d = res.data.data as { products: typeof products };
      setProducts(d?.products ?? []);
    });
  }, [companyId]);

  const onSubmit = async () => {
    if (!companyId || !financialYearId || !productId || quantity <= 0) {
      setMessage('Select product and enter quantity.');
      return;
    }
    try {
      await openingStockApi.post({
        companyId,
        financialYearId,
        items: [{ productId, quantity, costPrice: costPrice || 0 }],
      });
      setMessage('Opening stock posted.');
      setProductId('');
      setQuantity(0);
      setCostPrice(0);
    } catch {
      setMessage('Failed to post.');
    }
  };

  if (!companyId) return <Typography color="error">Select a company first.</Typography>;
  if (!financialYearId) return <Typography color="error">Select a financial year first.</Typography>;

  return (
    <Box>
      <Typography variant="h4" gutterBottom>Opening Stock</Typography>
      {message && <Typography color="primary" sx={{ mb: 2 }}>{message}</Typography>}
      <Paper sx={{ p: 3, maxWidth: 500 }}>
        <TextField select fullWidth label="Product" value={productId} onChange={(e) => setProductId(e.target.value)} size="small" sx={{ mb: 2 }}>
          <option value="">Select product</option>
          {products.map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}
        </TextField>
        <TextField type="number" fullWidth label="Quantity" value={quantity || ''} onChange={(e) => setQuantity(Number(e.target.value))} size="small" sx={{ mb: 2 }} />
        <TextField type="number" fullWidth label="Cost Price (AED)" value={costPrice || ''} onChange={(e) => setCostPrice(Number(e.target.value))} size="small" sx={{ mb: 2 }} />
        <Button variant="contained" onClick={onSubmit}>Post Opening Stock</Button>
      </Paper>
    </Box>
  );
}
