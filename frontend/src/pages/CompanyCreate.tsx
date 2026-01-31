import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { Box, Button, TextField, Typography, Paper, Grid, MenuItem } from '@mui/material';
import { useAppDispatch } from '../store/hooks';
import { setCompany } from '../store/slices/appSlice';
import { companyApi } from '../services/api';

interface FormData {
  code: string;
  legalName: string;
  name: string;
  address1: string;
  address2: string;
  address3: string;
  address4: string;
  address5: string;
  location: string;
  pincode: string;
  phone: string;
  mobile: string;
  email: string;
  TRN: string;
  state: string;
  sCode: string;
  bankName: string;
  bankAccountNo: string;
  bankIFSC: string;
  country: string;
  financialYearStart: string;
  financialYearEnd: string;
}

const COUNTRIES = ['UAE', 'SAU', 'BHR', 'OMN', 'KWT', 'QAT', 'IND', 'OTHER'];

export default function CompanyCreate() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    defaultValues: {
      code: 'COM',
      country: 'UAE',
      pincode: '',
    },
  });

  const onSubmit = async (data: FormData) => {
    const res = await companyApi.create({
      code: data.code || undefined,
      legalName: data.legalName || undefined,
      name: data.name,
      address1: data.address1 || undefined,
      address2: data.address2 || undefined,
      address3: data.address3 || undefined,
      address4: data.address4 || undefined,
      address5: data.address5 || undefined,
      location: data.location || undefined,
      pincode: data.pincode || undefined,
      phone: data.phone || undefined,
      mobile: data.mobile || undefined,
      email: data.email || undefined,
      TRN: data.TRN || undefined,
      state: data.state || undefined,
      sCode: data.sCode || undefined,
      bankName: data.bankName || undefined,
      bankAccountNo: data.bankAccountNo || undefined,
      bankIFSC: data.bankIFSC || undefined,
      country: data.country || 'UAE',
      financialYearStart: data.financialYearStart,
      financialYearEnd: data.financialYearEnd,
    });
    const companyData = res.data.data as { _id: string };
    if (companyData?._id) dispatch(setCompany(companyData._id));
    navigate('/file/companies');
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>Company Details</Typography>
      <Paper sx={{ p: 3, maxWidth: 900 }}>
        <form onSubmit={handleSubmit(onSubmit)}>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={4}>
              <TextField fullWidth size="small" label="Company Code" {...register('code')} />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField fullWidth size="small" label="Legal Name" {...register('legalName')} />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField fullWidth size="small" label="Name" required {...register('name', { required: 'Required' })} error={!!errors.name} helperText={errors.name?.message} />
            </Grid>

            <Grid item xs={12}><TextField fullWidth size="small" label="Address 1" {...register('address1')} /></Grid>
            <Grid item xs={12}><TextField fullWidth size="small" label="Address 2" {...register('address2')} /></Grid>
            <Grid item xs={12}><TextField fullWidth size="small" label="Address 3" {...register('address3')} /></Grid>
            <Grid item xs={12}><TextField fullWidth size="small" label="Address 4" {...register('address4')} /></Grid>
            <Grid item xs={12}><TextField fullWidth size="small" label="Address 5" {...register('address5')} /></Grid>

            <Grid item xs={12} sm={6}>
              <TextField fullWidth size="small" label="Location" {...register('location')} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth size="small" label="Pincode" {...register('pincode')} />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField fullWidth size="small" label="Tel No" {...register('phone')} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth size="small" label="Mob" {...register('mobile')} />
            </Grid>

            <Grid item xs={12}>
              <TextField fullWidth size="small" label="E Mail" type="email" {...register('email')} />
            </Grid>

            <Grid item xs={12} sm={4}>
              <TextField fullWidth size="small" label="VAT NO." {...register('TRN')} />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField fullWidth size="small" label="State" {...register('state')} />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField fullWidth size="small" label="S Code" {...register('sCode')} />
            </Grid>

            <Grid item xs={12} sm={4}>
              <TextField fullWidth size="small" label="Bank A/c" {...register('bankName')} />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField fullWidth size="small" label="A/c No" {...register('bankAccountNo')} />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField fullWidth size="small" label="Bank IFSC" {...register('bankIFSC')} />
            </Grid>

            <Grid item xs={12} sm={4}>
              <TextField fullWidth select size="small" label="Country" {...register('country')}>
                {COUNTRIES.map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField fullWidth type="date" size="small" label="Start Date" required InputLabelProps={{ shrink: true }} {...register('financialYearStart', { required: 'Required' })} error={!!errors.financialYearStart} helperText={errors.financialYearStart?.message} />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField fullWidth type="date" size="small" label="End Date" required InputLabelProps={{ shrink: true }} {...register('financialYearEnd', { required: 'Required' })} error={!!errors.financialYearEnd} helperText={errors.financialYearEnd?.message} />
            </Grid>
          </Grid>
          <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
            <Button type="submit" variant="contained">Save</Button>
            <Button type="button" onClick={() => navigate('/file/companies')}>Cancel</Button>
          </Box>
        </form>
      </Paper>
    </Box>
  );
}
