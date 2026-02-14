import { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { Box, Button, TextField, Typography, Paper, Grid, MenuItem, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { setCompany, setFinancialYear } from '../store/slices/appSlice';
import { logout, setCredentials } from '../store/slices/authSlice';
import { companyApi, authApi, financialYearApi } from '../services/api';
import DateInput from '../components/DateInput';

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

function getCurrentYearDateRange() {
  const year = new Date().getFullYear();
  return {
    financialYearStart: `${year}-01-01`,
    financialYearEnd: `${year}-12-31`,
  };
}

export default function CompanyCreate() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const token = useAppSelector((s) => s.auth.token);
  const hasCompany = (useAppSelector((s) => s.auth.user?.companyAccess?.length) ?? 0) > 0;
  const [errorDialogOpen, setErrorDialogOpen] = useState(false);
  const [errorDialogMessage, setErrorDialogMessage] = useState('');
  const { register, handleSubmit, formState: { errors }, setValue, control } = useForm<FormData>({
    defaultValues: {
      code: '',
      country: 'UAE',
      pincode: '',
      ...getCurrentYearDateRange(),
    },
  });

  useEffect(() => {
    companyApi.getNextCode().then((res) => {
      const code = (res.data.data as { code: string })?.code;
      if (code) setValue('code', code);
    }).catch(() => setValue('code', 'com'));
  }, [setValue]);

  const onSubmit = async (data: FormData) => {
    try {
      const res = await companyApi.create({
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
      if (!companyData?._id) return;
      dispatch(setCompany(companyData._id));
      const meRes = await authApi.me();
      const meData = meRes.data.data as { _id: string; username: string; fullName: string; roles: string[]; permissions: string[]; companyAccess: string[] };
      if (token && meData) {
        dispatch(setCredentials({ token, user: meData }));
      }
      try {
        const fyRes = await financialYearApi.getCurrent(companyData._id);
        const fy = fyRes.data.data as { _id: string };
        if (fy?._id) dispatch(setFinancialYear(fy._id));
      } catch {
        // ignore
      }
      navigate('/');
    } catch (err: any) {
      setErrorDialogMessage(err.response?.data?.message || 'Save failed');
      setErrorDialogOpen(true);
    }
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>Company Details</Typography>
      {!hasCompany && (
        <Typography color="text.secondary" sx={{ mb: 2 }}>
          No company is registered. Enter and save your company details to access the system. You can exit without saving.
        </Typography>
      )}
      <Paper sx={{ p: 3, maxWidth: 900 }}>
        <form onSubmit={handleSubmit(onSubmit)}>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={4}>
              <TextField
              fullWidth
              size="small"
              label="Company Code"
              {...register('code')}
              disabled
              InputLabelProps={{ shrink: true }}
              helperText="System generated (e.g. com, com1, com2). Not changeable."
            />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField fullWidth size="small" label="Legal Name" {...register('legalName')} InputLabelProps={{ shrink: true }} />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField fullWidth size="small" label="Name" required {...register('name', { required: 'Required' })} error={!!errors.name} helperText={errors.name?.message} InputLabelProps={{ shrink: true }} />
            </Grid>

            <Grid item xs={12}><TextField fullWidth size="small" label="Address 1" {...register('address1')} InputLabelProps={{ shrink: true }} /></Grid>
            <Grid item xs={12}><TextField fullWidth size="small" label="Address 2" {...register('address2')} InputLabelProps={{ shrink: true }} /></Grid>
            <Grid item xs={12}><TextField fullWidth size="small" label="Address 3" {...register('address3')} InputLabelProps={{ shrink: true }} /></Grid>
            <Grid item xs={12}><TextField fullWidth size="small" label="Address 4" {...register('address4')} InputLabelProps={{ shrink: true }} /></Grid>
            <Grid item xs={12}><TextField fullWidth size="small" label="Address 5" {...register('address5')} InputLabelProps={{ shrink: true }} /></Grid>

            <Grid item xs={12} sm={6}>
              <TextField fullWidth size="small" label="Location" {...register('location')} InputLabelProps={{ shrink: true }} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth size="small" label="Pincode" {...register('pincode')} InputLabelProps={{ shrink: true }} />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField fullWidth size="small" label="Tel No" {...register('phone')} InputLabelProps={{ shrink: true }} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth size="small" label="Mob" {...register('mobile')} InputLabelProps={{ shrink: true }} />
            </Grid>

            <Grid item xs={12}>
              <TextField fullWidth size="small" label="E Mail" type="email" {...register('email')} InputLabelProps={{ shrink: true }} />
            </Grid>

            <Grid item xs={12} sm={4}>
              <TextField fullWidth size="small" label="VAT NO." {...register('TRN')} InputLabelProps={{ shrink: true }} />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField fullWidth size="small" label="State" {...register('state')} InputLabelProps={{ shrink: true }} />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField fullWidth size="small" label="S Code" {...register('sCode')} InputLabelProps={{ shrink: true }} />
            </Grid>

            <Grid item xs={12} sm={4}>
              <TextField fullWidth size="small" label="Bank A/c" {...register('bankName')} InputLabelProps={{ shrink: true }} />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField fullWidth size="small" label="A/c No" {...register('bankAccountNo')} InputLabelProps={{ shrink: true }} />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField fullWidth size="small" label="Bank IFSC" {...register('bankIFSC')} InputLabelProps={{ shrink: true }} />
            </Grid>

            <Grid item xs={12} sm={4}>
              <TextField fullWidth select size="small" label="Country" {...register('country')} InputLabelProps={{ shrink: true }}>
                {COUNTRIES.map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Controller name="financialYearStart" control={control} rules={{ required: 'Required' }} render={({ field }) => <DateInput label="Start Date" value={field.value || ''} onChange={field.onChange} size="small" error={!!errors.financialYearStart} helperText={errors.financialYearStart?.message} />} />
            </Grid>
            <Grid item xs={12} sm={4}>
              <Controller name="financialYearEnd" control={control} rules={{ required: 'Required' }} render={({ field }) => <DateInput label="End Date" value={field.value || ''} onChange={field.onChange} size="small" error={!!errors.financialYearEnd} helperText={errors.financialYearEnd?.message} />} />
            </Grid>
          </Grid>
          <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
            <Button type="submit" variant="contained">Save</Button>
            <Button
              type="button"
              color="secondary"
              onClick={() => {
                if (!hasCompany) {
                  dispatch(logout());
                  navigate('/login');
                } else {
                  navigate('/file/company-details');
                }
              }}
            >
              {hasCompany ? 'Cancel' : 'Exit'}
            </Button>
          </Box>
        </form>
      </Paper>

      {/* Error Dialog */}
      <Dialog open={errorDialogOpen} onClose={() => setErrorDialogOpen(false)} PaperProps={{ sx: { borderRadius: 2, minWidth: 350 } }}>
        <DialogTitle sx={{ fontWeight: 700, fontSize: '1rem', color: '#dc2626' }}>Error</DialogTitle>
        <DialogContent>
          <Typography sx={{ fontSize: '0.9rem', color: '#475569' }}>{errorDialogMessage}</Typography>
        </DialogContent>
        <DialogActions sx={{ px: 2, pb: 2 }}>
          <Button variant="contained" onClick={() => setErrorDialogOpen(false)} autoFocus sx={{ textTransform: 'none', borderRadius: 1.5, bgcolor: '#dc2626', '&:hover': { bgcolor: '#b91c1c' }, boxShadow: 'none' }}>OK</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
