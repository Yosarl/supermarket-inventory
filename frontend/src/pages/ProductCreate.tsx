import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { Box, Button, TextField, Typography, Paper, Grid, MenuItem } from '@mui/material';
import { useAppSelector } from '../store/hooks';
import { productApi } from '../services/api';

export default function ProductCreate() {
  const [units, setUnits] = useState<Array<{ _id: string; shortCode: string }>>([]);
  const navigate = useNavigate();
  const companyId = useAppSelector((s) => s.app.selectedCompanyId);
  const { register, handleSubmit, formState: { errors } } = useForm();

  useEffect(() => {
    if (!companyId) return;
    productApi.getUnits(companyId).then((res) => setUnits((res.data.data as typeof units) ?? []));
  }, [companyId]);

  const onSubmit = async (data: Record<string, unknown>) => {
    if (!companyId) return;
    await productApi.create({
      companyId,
      name: data.name,
      sku: data.sku,
      internationalBarcode: data.internationalBarcode,
      purchasePrice: Number(data.purchasePrice) || 0,
      sellingPrice: Number(data.sellingPrice) || 0,
      unitOfMeasureId: data.unitOfMeasureId,
      vatCategory: (data.vatCategory as string) || 'standard',
    });
    navigate('/master/products');
  };

  if (!companyId) return <Typography color="error">Select a company first.</Typography>;

  return (
    <Box>
      <Typography variant="h4" gutterBottom>Add Product</Typography>
      <Paper sx={{ p: 3, maxWidth: 700 }}>
        <form onSubmit={handleSubmit(onSubmit)}>
          <Grid container spacing={2}>
            <Grid item xs={12}><TextField fullWidth label="Product Name" required {...register('name', { required: true })} error={!!errors.name} /></Grid>
            <Grid item xs={6}><TextField fullWidth label="SKU" {...register('sku')} /></Grid>
            <Grid item xs={6}><TextField fullWidth label="Barcode" {...register('internationalBarcode')} /></Grid>
            <Grid item xs={6}><TextField fullWidth type="number" label="Purchase Price" {...register('purchasePrice', { valueAsNumber: true })} /></Grid>
            <Grid item xs={6}><TextField fullWidth type="number" label="Selling Price" {...register('sellingPrice', { valueAsNumber: true })} /></Grid>
            <Grid item xs={6}>
              <TextField fullWidth select label="Unit" required {...register('unitOfMeasureId', { required: true })}>
                {units.map((u) => <MenuItem key={u._id} value={u._id}>{u.shortCode}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth select label="VAT" {...register('vatCategory')}>
                <MenuItem value="standard">Standard</MenuItem>
                <MenuItem value="zero">Zero</MenuItem>
                <MenuItem value="exempt">Exempt</MenuItem>
              </TextField>
            </Grid>
          </Grid>
          <Box sx={{ mt: 3 }}><Button type="submit" variant="contained">Create</Button><Button type="button" onClick={() => navigate('/master/products')} sx={{ ml: 2 }}>Cancel</Button></Box>
        </form>
      </Paper>
    </Box>
  );
}
