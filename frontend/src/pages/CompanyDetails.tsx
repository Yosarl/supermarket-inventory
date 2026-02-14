import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  TextField,
  Typography,
  Paper,
  Grid,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
} from '@mui/material';
import { useAppSelector } from '../store/hooks';
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
}

interface Company {
  _id: string;
  code?: string;
  legalName?: string;
  name: string;
  address1?: string;
  address2?: string;
  address3?: string;
  address4?: string;
  address5?: string;
  location?: string;
  pincode?: string;
  phone?: string;
  mobile?: string;
  email?: string;
  TRN?: string;
  state?: string;
  sCode?: string;
  bankName?: string;
  bankAccountNo?: string;
  bankIFSC?: string;
  country?: string;
}

const COUNTRIES = ['UAE', 'SAU', 'BHR', 'OMN', 'KWT', 'QAT', 'IND', 'OTHER'];

export default function CompanyDetails() {
  const navigate = useNavigate();
  const user = useAppSelector((s) => s.auth.user);
  const hasCompany = (user?.companyAccess?.length ?? 0) > 0;
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingData, setPendingData] = useState<FormData | null>(null);
  const [successDialogOpen, setSuccessDialogOpen] = useState(false);
  const [successDialogMessage, setSuccessDialogMessage] = useState('');
  const [errorDialogOpen, setErrorDialogOpen] = useState(false);
  const [errorDialogMessage, setErrorDialogMessage] = useState('');
  const { register, handleSubmit, formState: { errors }, reset: resetForm, watch, setValue } = useForm<FormData>({
    defaultValues: { country: 'UAE' },
  });
  const countryValue = watch('country');

  useEffect(() => {
    if (!hasCompany) {
      navigate('/file/companies/create', { replace: true });
      return;
    }
    const companyId = user!.companyAccess![0];
    companyApi.get(companyId).then((res) => {
      const data = res.data.data as Company;
      setCompany(data);
      resetForm({
        code: data.code ?? '',
        legalName: data.legalName ?? '',
        name: data.name ?? '',
        address1: data.address1 ?? '',
        address2: data.address2 ?? '',
        address3: data.address3 ?? '',
        address4: data.address4 ?? '',
        address5: data.address5 ?? '',
        location: data.location ?? '',
        pincode: data.pincode ?? '',
        phone: data.phone ?? '',
        mobile: data.mobile ?? '',
        email: data.email ?? '',
        TRN: data.TRN ?? '',
        state: data.state ?? '',
        sCode: data.sCode ?? '',
        bankName: data.bankName ?? '',
        bankAccountNo: data.bankAccountNo ?? '',
        bankIFSC: data.bankIFSC ?? '',
        country: data.country ?? 'UAE',
      });
    }).catch(() => {
      setCompany(null);
    }).finally(() => setLoading(false));
  }, [hasCompany, user?.companyAccess, navigate, resetForm]);

  const performSave = async (data: FormData) => {
    if (!company) return;
    await companyApi.update(company._id, {
      name: data.name,
      legalName: data.legalName ?? '',
      address1: data.address1 ?? '',
      address2: data.address2 ?? '',
      address3: data.address3 ?? '',
      address4: data.address4 ?? '',
      address5: data.address5 ?? '',
      location: data.location ?? '',
      pincode: data.pincode ?? '',
      phone: data.phone ?? '',
      mobile: data.mobile ?? '',
      email: data.email ?? '',
      TRN: data.TRN ?? '',
      state: data.state ?? '',
      sCode: data.sCode ?? '',
      bankName: data.bankName ?? '',
      bankAccountNo: data.bankAccountNo ?? '',
      bankIFSC: data.bankIFSC ?? '',
      country: data.country ?? 'UAE',
    });
  };

  const handleSaveClick = () => {
    handleSubmit((data) => {
      setPendingData(data);
      setConfirmOpen(true);
    })();
  };

  const handleConfirmOk = async () => {
    if (!pendingData) return;
    setConfirmOpen(false);
    try {
      await performSave(pendingData);
      setPendingData(null);
      setSuccessDialogMessage('Company details saved successfully');
      setSuccessDialogOpen(true);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Save failed';
      setErrorDialogMessage(msg);
      setErrorDialogOpen(true);
    }
  };

  const handleConfirmCancel = () => {
    setConfirmOpen(false);
    setPendingData(null);
  };

  if (loading || !company) {
    return <Typography>Loading...</Typography>;
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>Company Details</Typography>
      <Paper sx={{ p: 3, maxWidth: 900 }}>
        <form onSubmit={(e) => e.preventDefault()}>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                size="small"
                label="Company Code"
                {...register('code')}
                disabled
                InputLabelProps={{ shrink: true }}
                helperText="System generated. Not changeable."
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
              <TextField
                fullWidth
                select
                size="small"
                label="Country"
                value={countryValue ?? 'UAE'}
                onChange={(e) => setValue('country', e.target.value, { shouldValidate: true })}
                InputLabelProps={{ shrink: true }}
              >
                {COUNTRIES.map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
              </TextField>
            </Grid>
          </Grid>
          <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
            <Button type="button" variant="contained" onClick={handleSaveClick}>Save</Button>
          </Box>
        </form>
      </Paper>

      <Dialog open={confirmOpen} onClose={handleConfirmCancel}>
        <DialogTitle>Save company details?</DialogTitle>
        <DialogContent>
          <DialogContentText>Do you want to save the details?</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleConfirmCancel}>Cancel</Button>
          <Button onClick={handleConfirmOk} variant="contained" autoFocus>OK</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={successDialogOpen} onClose={() => setSuccessDialogOpen(false)}>
        <DialogTitle sx={{ color: '#16a34a' }}>Success</DialogTitle>
        <DialogContent>
          <DialogContentText>{successDialogMessage}</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSuccessDialogOpen(false)} variant="contained" autoFocus sx={{ backgroundColor: '#16a34a', '&:hover': { backgroundColor: '#15803d' } }}>OK</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={errorDialogOpen} onClose={() => setErrorDialogOpen(false)}>
        <DialogTitle sx={{ color: '#dc2626' }}>Error</DialogTitle>
        <DialogContent>
          <DialogContentText>{errorDialogMessage}</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setErrorDialogOpen(false)} variant="contained" autoFocus sx={{ backgroundColor: '#dc2626', '&:hover': { backgroundColor: '#b91c1c' } }}>OK</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
