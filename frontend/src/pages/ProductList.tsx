import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Button, TextField, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { useAppSelector } from '../store/hooks';
import { productApi } from '../services/api';

export default function ProductList() {
  const [products, setProducts] = useState<Array<{ _id: string; name: string; sku: string; systemBarcode: string; sellingPrice: number; purchasePrice: number }>>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const companyId = useAppSelector((s) => s.app.selectedCompanyId);

  useEffect(() => {
    if (!companyId) return;
    productApi.list(companyId, { search: search || undefined, limit: 50 }).then((res) => {
      const d = res.data.data as { products: typeof products; total: number };
      setProducts(d?.products ?? []);
    }).finally(() => setLoading(false));
  }, [companyId, search]);

  if (!companyId) return <Typography color="error">Select a company first.</Typography>;

  return (
    <Box>
      <Typography variant="h4" gutterBottom>Products</Typography>
      <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
        <TextField size="small" placeholder="Search" value={search} onChange={(e) => setSearch(e.target.value)} />
        <Button startIcon={<AddIcon />} variant="contained" onClick={() => navigate('/master/products/create')}>Add Product</Button>
      </Box>
      {loading ? <Typography>Loading...</Typography> : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>SKU</TableCell>
                <TableCell>Barcode</TableCell>
                <TableCell align="right">Selling (AED)</TableCell>
                <TableCell align="right">Purchase (AED)</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {products.map((p) => (
                <TableRow key={p._id}>
                  <TableCell>{p.name}</TableCell>
                  <TableCell>{p.sku}</TableCell>
                  <TableCell>{p.systemBarcode}</TableCell>
                  <TableCell align="right">{p.sellingPrice?.toFixed(2)}</TableCell>
                  <TableCell align="right">{p.purchasePrice?.toFixed(2)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
}
