import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Box,
  Button,
  TextField,
  Typography,
  Paper,
  Grid,
  MenuItem,
  FormControlLabel,
  Checkbox,
  InputAdornment,
} from '@mui/material';
import { useAppSelector } from '../store/hooks';
import { ledgerAccountApi, ledgerGroupApi } from '../services/api';

type Group = { _id: string; name: string; code: string; type: string; isReceivables?: boolean; isPayables?: boolean };

type UnderOption = { _id: string; name: string };

interface FormData {
  name: string;
  aliasName: string;
  code: string;
  groupId: string;
  address: string;
  location: string;
  pincode: string;
  mobile: string;
  TRN: string;
  state: string;
  stateCode: string;
  costCentre: string;
  creditLimit: string;
  creditDays: string;
  openingBalanceCr: string;
  openingBalanceDr: string;
  serviceItem: boolean;
  sacHsn: string;
  taxable: boolean;
  area: string;
  route: string;
  day: string;
  district: string;
  agency: string;
  regDate: string;
  discPercent: string;
  category: string;
  rateType: string;
  remarks: string;
  rating: string;
  story: string;
  empCode: string;
  salesMan: string;
  person: string;
  agent2: string;
  phone: string;
  email: string;
  paymentTerms: string;
}

export default function LedgerAccountCreate() {
  const [searchParams] = useSearchParams();
  const defaultType = searchParams.get('type') || '';
  const [underOptions, setUnderOptions] = useState<UnderOption[]>([]);
  const [receivablesId, setReceivablesId] = useState<string | null>(null);
  const [payablesId, setPayablesId] = useState<string | null>(null);
  const navigate = useNavigate();
  const companyId = useAppSelector((s) => s.app.selectedCompanyId);
  const financialYearId = useAppSelector((s) => s.app.selectedFinancialYearId);
  const underDisabled = defaultType === 'Customer' || defaultType === 'Supplier';
  const defaultGroupId =
    defaultType === 'Customer' ? receivablesId
    : defaultType === 'Supplier' ? payablesId
    : '';

  const { register, handleSubmit, formState: { errors }, reset, setValue, watch } = useForm<FormData>({
    defaultValues: {
      serviceItem: false,
      taxable: false,
      openingBalanceCr: '',
      openingBalanceDr: '',
      creditLimit: '',
      creditDays: '',
      discPercent: '',
      regDate: new Date().toISOString().slice(0, 10),
    },
  });

  const groupIdValue = watch('groupId');

  useEffect(() => {
    if (!companyId) return;
    ledgerGroupApi.list(companyId).then((res) => {
      const list = (res.data.data as Group[]) ?? [];
      const recv = list.find(
        (g) =>
          g.isReceivables === true ||
          (g.code && g.code.toUpperCase() === 'RECV') ||
          (g.name && g.name.toLowerCase().includes('receiv'))
      );
      const pay = list.find(
        (g) =>
          g.isPayables === true ||
          (g.code && g.code.toUpperCase() === 'PAY') ||
          (g.name && g.name.toLowerCase().includes('payab'))
      );
      const recvId = recv?._id ?? null;
      const payId = pay?._id ?? null;
      setReceivablesId(recvId);
      setPayablesId(payId);
      const options: UnderOption[] = [];
      if (recvId) options.push({ _id: recvId, name: 'Customer' });
      if (payId) options.push({ _id: payId, name: 'Supplier' });
      list.forEach((g) => {
        if (g._id !== recvId && g._id !== payId) options.push({ _id: g._id, name: g.name });
      });
      setUnderOptions(options);
      if (defaultType === 'Customer' && recvId) setValue('groupId', recvId);
      if (defaultType === 'Supplier' && payId) setValue('groupId', payId);
    });
  }, [companyId, defaultType, setValue]);

  const onSubmit = async (data: FormData) => {
    if (!companyId) return;
    await ledgerAccountApi.create({
      companyId,
      financialYearId: financialYearId || undefined,
      name: data.name,
      aliasName: data.aliasName || undefined,
      code: data.code || undefined,
      groupId: data.groupId,
      type: ['Customer', 'Supplier', 'Bank', 'Cash', 'Expense', 'Revenue', 'Other'].includes(defaultType) ? defaultType : 'Other',
      phone: data.phone || undefined,
      mobile: data.mobile || undefined,
      email: data.email || undefined,
      address: data.address || undefined,
      location: data.location || undefined,
      pincode: data.pincode || undefined,
      TRN: data.TRN || undefined,
      state: data.state || undefined,
      stateCode: data.stateCode || undefined,
      costCentre: data.costCentre || undefined,
      creditLimit: data.creditLimit ? Number(data.creditLimit) : undefined,
      creditDays: data.creditDays ? Number(data.creditDays) : undefined,
      paymentTerms: data.paymentTerms || undefined,
      openingBalanceDr: data.openingBalanceDr ? Number(data.openingBalanceDr) : undefined,
      openingBalanceCr: data.openingBalanceCr ? Number(data.openingBalanceCr) : undefined,
      serviceItem: data.serviceItem,
      sacHsn: data.sacHsn || undefined,
      taxable: data.taxable,
      area: data.area || undefined,
      route: data.route || undefined,
      day: data.day || undefined,
      district: data.district || undefined,
      agency: data.agency || undefined,
      regDate: data.regDate || undefined,
      discPercent: data.discPercent ? Number(data.discPercent) : undefined,
      category: data.category || undefined,
      rateType: data.rateType || undefined,
      remarks: data.remarks || undefined,
      rating: data.rating || undefined,
      story: data.story || undefined,
      empCode: data.empCode || undefined,
      salesMan: data.salesMan || undefined,
      person: data.person || undefined,
      agent2: data.agent2 || undefined,
    });
    navigate('/master/customers');
  };

  const handleClear = () => reset();

  if (!companyId) return <Typography color="error">Select a company first.</Typography>;

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h4">Ledger Registration</Typography>
        <Typography variant="body2" color="text.secondary">
          {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
        </Typography>
      </Box>
      <Paper sx={{ p: 3 }}>
        <form onSubmit={handleSubmit(onSubmit)}>
          <Grid container spacing={2}>
            {/* Left column */}
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>Ledger details</Typography>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <TextField fullWidth size="small" label="Led Name" required {...register('name', { required: 'Required' })} error={!!errors.name} helperText={errors.name?.message} />
                </Grid>
                <Grid item xs={12}>
                  <TextField fullWidth size="small" label="Alias Name" {...register('aliasName')} />
                </Grid>
                <Grid item xs={6}>
                  <TextField fullWidth size="small" label="Account Code" {...register('code')} placeholder="Auto" />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    fullWidth
                    select
                    size="small"
                    label="Under"
                    required
                    disabled={underDisabled}
                    {...register('groupId', { required: 'Required' })}
                    value={groupIdValue || defaultGroupId || ''}
                    onChange={(e) => setValue('groupId', e.target.value, { shouldValidate: true })}
                    error={!!errors.groupId}
                    helperText={errors.groupId?.message}
                  >
                    {underOptions.map((opt) => (
                      <MenuItem key={opt._id} value={opt._id}>{opt.name}</MenuItem>
                    ))}
                  </TextField>
                </Grid>
                <Grid item xs={12}>
                  <TextField fullWidth size="small" label="Address" multiline rows={2} {...register('address')} />
                </Grid>
                <Grid item xs={6}>
                  <TextField fullWidth size="small" label="Location" {...register('location')} />
                </Grid>
                <Grid item xs={6}>
                  <TextField fullWidth size="small" label="Pincode" {...register('pincode')} />
                </Grid>
                <Grid item xs={12}>
                  <TextField fullWidth size="small" label="Mobile" {...register('mobile')} />
                </Grid>
                <Grid item xs={12}>
                  <TextField fullWidth size="small" label="Vat No." {...register('TRN')} />
                </Grid>
                <Grid item xs={6}>
                  <TextField fullWidth size="small" label="State" {...register('state')} />
                </Grid>
                <Grid item xs={6}>
                  <TextField fullWidth size="small" label="Code" {...register('stateCode')} />
                </Grid>
                <Grid item xs={12}>
                  <TextField fullWidth size="small" label="Cost Centre" {...register('costCentre')} />
                </Grid>
                <Grid item xs={6}>
                  <TextField fullWidth size="small" type="number" label="Credit Limit" {...register('creditLimit')} inputProps={{ min: 0, step: 0.01 }} />
                </Grid>
                <Grid item xs={6}>
                  <TextField fullWidth size="small" type="number" label="Days" {...register('creditDays')} inputProps={{ min: 0 }} />
                </Grid>
                <Grid item xs={6}>
                  <TextField fullWidth size="small" type="number" label="Old Balance Cr" {...register('openingBalanceCr')} inputProps={{ min: 0, step: 0.01 }} InputProps={{ startAdornment: <InputAdornment position="start">AED</InputAdornment> }} />
                </Grid>
                <Grid item xs={6}>
                  <TextField fullWidth size="small" type="number" label="Old Balance Dr" {...register('openingBalanceDr')} inputProps={{ min: 0, step: 0.01 }} InputProps={{ startAdornment: <InputAdornment position="start">AED</InputAdornment> }} />
                </Grid>
                <Grid item xs={12}>
                  <FormControlLabel control={<Checkbox {...register('serviceItem')} />} label="Service Item" />
                  <TextField size="small" label="SAC/HSN" {...register('sacHsn')} sx={{ ml: 2, width: 160 }} />
                </Grid>
                <Grid item xs={12}>
                  <FormControlLabel control={<Checkbox {...register('taxable')} />} label="Taxable" />
                </Grid>
              </Grid>
            </Grid>

            {/* Right column */}
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>Additional details</Typography>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <TextField fullWidth size="small" label="Area" {...register('area')} />
                </Grid>
                <Grid item xs={6}>
                  <TextField fullWidth size="small" label="Route" {...register('route')} />
                </Grid>
                <Grid item xs={6}>
                  <TextField fullWidth size="small" label="Day" {...register('day')} />
                </Grid>
                <Grid item xs={12}>
                  <TextField fullWidth size="small" label="District" {...register('district')} />
                </Grid>
                <Grid item xs={12}>
                  <TextField fullWidth size="small" label="Agency" {...register('agency')} />
                </Grid>
                <Grid item xs={12}>
                  <TextField fullWidth size="small" type="date" label="Reg Date" InputLabelProps={{ shrink: true }} {...register('regDate')} />
                </Grid>
                <Grid item xs={6}>
                  <TextField fullWidth size="small" type="number" label="Disc %" {...register('discPercent')} inputProps={{ min: 0, max: 100, step: 0.01 }} />
                </Grid>
                <Grid item xs={6}>
                  <TextField fullWidth size="small" label="Category" {...register('category')} />
                </Grid>
                <Grid item xs={6}>
                  <TextField fullWidth size="small" label="Rate Type" {...register('rateType')} />
                </Grid>
                <Grid item xs={6}>
                  <TextField fullWidth size="small" label="Rating" {...register('rating')} />
                </Grid>
                <Grid item xs={12}>
                  <TextField fullWidth size="small" label="Remarks" {...register('remarks')} />
                </Grid>
                <Grid item xs={12}>
                  <TextField fullWidth size="small" label="Story" {...register('story')} />
                </Grid>
                <Grid item xs={6}>
                  <TextField fullWidth size="small" label="EmpCode" {...register('empCode')} />
                </Grid>
                <Grid item xs={6}>
                  <TextField fullWidth size="small" label="Sales Man" {...register('salesMan')} />
                </Grid>
                <Grid item xs={6}>
                  <TextField fullWidth size="small" label="Person" {...register('person')} />
                </Grid>
                <Grid item xs={6}>
                  <TextField fullWidth size="small" label="Agent2" {...register('agent2')} />
                </Grid>
                <Grid item xs={6}>
                  <TextField fullWidth size="small" label="Tel No" {...register('phone')} />
                </Grid>
                <Grid item xs={6}>
                  <TextField fullWidth size="small" label="E Mail" type="email" {...register('email')} />
                </Grid>
                <Grid item xs={12}>
                  <TextField fullWidth size="small" label="Payment Terms" {...register('paymentTerms')} />
                </Grid>
              </Grid>
            </Grid>
          </Grid>

          <Box sx={{ mt: 3, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <Button type="submit" variant="contained">Save</Button>
            <Button type="button" variant="outlined" onClick={handleClear}>Clear</Button>
            <Button type="button" variant="outlined" disabled>Edit</Button>
            <Button type="button" variant="outlined" color="error" disabled>Delete</Button>
            <Button type="button" variant="outlined" onClick={() => navigate('/master/customers')}>Search</Button>
          </Box>
        </form>
      </Paper>
    </Box>
  );
}
