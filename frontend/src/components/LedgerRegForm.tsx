import { useEffect, useState, useCallback } from 'react';
import { useForm } from 'react-hook-form';
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
  Autocomplete,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import { useAppSelector } from '../store/hooks';
import { ledgerAccountApi, ledgerGroupApi } from '../services/api';

type Group = { _id: string; name: string; code: string; type: string; isReceivables?: boolean; isPayables?: boolean };
type UnderOption = { _id: string; name: string };
type LedgerOption = { _id: string; name: string; code: string };

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

const defaultFormValues: Partial<FormData> = {
  serviceItem: false,
  taxable: false,
  openingBalanceCr: '',
  openingBalanceDr: '',
  creditLimit: '',
  creditDays: '',
  discPercent: '',
  regDate: new Date().toISOString().slice(0, 10),
};

export default function LedgerRegForm({
  ledgerType,
  title = 'Ledger Registration',
}: {
  ledgerType: 'Customer' | 'Supplier' | null;
  title?: string;
}) {
  const companyId = useAppSelector((s) => s.app.selectedCompanyId);
  const financialYearId = useAppSelector((s) => s.app.selectedFinancialYearId);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [ledgerOptions, setLedgerOptions] = useState<LedgerOption[]>([]);
  const [ledgerSearch, setLedgerSearch] = useState('');
  const [underOptions, setUnderOptions] = useState<UnderOption[]>([]);
  const [receivablesId, setReceivablesId] = useState<string | null>(null);
  const [payablesId, setPayablesId] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [successDialog, setSuccessDialog] = useState<'edited' | 'deleted' | null>(null);
  const underDisabled = ledgerType === 'Customer' || ledgerType === 'Supplier';
  const defaultGroupId =
    ledgerType === 'Customer' ? receivablesId
    : ledgerType === 'Supplier' ? payablesId
    : '';

  const { register, handleSubmit, formState: { errors }, reset, setValue, watch } = useForm<FormData>({
    defaultValues: defaultFormValues as FormData,
  });

  const groupIdValue = watch('groupId');
  const isEditMode = !!selectedId;

  const listType = ledgerType === null ? undefined : ledgerType;

  useEffect(() => {
    if (!companyId) return;
    const search = ledgerSearch.trim() || undefined;
    ledgerAccountApi.list(companyId, listType, search).then((res) => {
      const list = (res.data.data as LedgerOption[]) ?? [];
      setLedgerOptions(list);
    });
  }, [companyId, listType, ledgerSearch]);

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
      if (ledgerType === 'Customer' && recvId) setValue('groupId', recvId);
      if (ledgerType === 'Supplier' && payId) setValue('groupId', payId);
    });
  }, [companyId, ledgerType, setValue]);

  const populateForm = useCallback(
    (ledger: Record<string, unknown>) => {
      const gid = (ledger.groupId as { _id?: string })?._id ?? ledger.groupId;
      const ob = Array.isArray(ledger.openingBalances) && financialYearId
        ? (ledger.openingBalances as Array<{ financialYearId: string; amount: number; isDebit: boolean }>).find(
            (b) => String(b.financialYearId) === financialYearId
          )
        : null;
      setValue('name', String(ledger.name ?? ''));
      setValue('aliasName', String(ledger.aliasName ?? ''));
      setValue('code', String(ledger.code ?? ''));
      setValue('groupId', String(gid ?? ''));
      setValue('address', String(ledger.address ?? ''));
      setValue('location', String(ledger.location ?? ''));
      setValue('pincode', String(ledger.pincode ?? ''));
      setValue('mobile', String(ledger.mobile ?? ''));
      setValue('TRN', String(ledger.TRN ?? ''));
      setValue('state', String(ledger.state ?? ''));
      setValue('stateCode', String(ledger.stateCode ?? ''));
      setValue('costCentre', String(ledger.costCentre ?? ''));
      setValue('creditLimit', ledger.creditLimit != null ? String(ledger.creditLimit) : '');
      setValue('creditDays', ledger.creditDays != null ? String(ledger.creditDays) : '');
      setValue('openingBalanceCr', ob && !ob.isDebit ? String(ob.amount) : '');
      setValue('openingBalanceDr', ob && ob.isDebit ? String(ob.amount) : '');
      setValue('serviceItem', Boolean(ledger.serviceItem));
      setValue('sacHsn', String(ledger.sacHsn ?? ''));
      setValue('taxable', Boolean(ledger.taxable));
      setValue('area', String(ledger.area ?? ''));
      setValue('route', String(ledger.route ?? ''));
      setValue('day', String(ledger.day ?? ''));
      setValue('district', String(ledger.district ?? ''));
      setValue('agency', String(ledger.agency ?? ''));
      setValue('regDate', ledger.regDate ? new Date(ledger.regDate as string).toISOString().slice(0, 10) : '');
      setValue('discPercent', ledger.discPercent != null ? String(ledger.discPercent) : '');
      setValue('category', String(ledger.category ?? ''));
      setValue('rateType', String(ledger.rateType ?? ''));
      setValue('remarks', String(ledger.remarks ?? ''));
      setValue('rating', String(ledger.rating ?? ''));
      setValue('story', String(ledger.story ?? ''));
      setValue('empCode', String(ledger.empCode ?? ''));
      setValue('salesMan', String(ledger.salesMan ?? ''));
      setValue('person', String(ledger.person ?? ''));
      setValue('agent2', String(ledger.agent2 ?? ''));
      setValue('phone', String(ledger.phone ?? ''));
      setValue('email', String(ledger.email ?? ''));
      setValue('paymentTerms', String(ledger.paymentTerms ?? ''));
    },
    [financialYearId, setValue]
  );

  const clearForm = useCallback(() => {
    setSelectedId(null);
    setMessage('');
    reset(defaultFormValues as FormData);
    if (ledgerType === 'Customer' && receivablesId) setValue('groupId', receivablesId);
    if (ledgerType === 'Supplier' && payablesId) setValue('groupId', payablesId);
  }, [reset, setValue, ledgerType, receivablesId, payablesId]);

  const onLedgerSelect = (_: unknown, value: LedgerOption | null) => {
    if (!value || !companyId) {
      clearForm();
      return;
    }
    ledgerAccountApi.get(value._id, companyId).then((res) => {
      const ledger = res.data.data as Record<string, unknown>;
      if (ledger) {
        setSelectedId(value._id);
        populateForm(ledger);
      }
    });
  };

  const onSubmit = async (data: FormData) => {
    if (!companyId) return;
    setMessage('');
    try {
      await ledgerAccountApi.create({
        companyId,
        financialYearId: financialYearId || undefined,
        name: data.name,
        aliasName: data.aliasName || undefined,
        code: data.code || undefined,
        groupId: data.groupId,
        type: ledgerType ?? 'Other',
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
      setMessage('Saved.');
      clearForm();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      setMessage(err?.response?.data?.message ?? 'Failed');
    }
  };

  const onEdit = async (data: FormData) => {
    if (!companyId || !selectedId) return;
    setMessage('');
    try {
      await ledgerAccountApi.update(selectedId, {
        companyId,
        name: data.name,
        aliasName: data.aliasName || undefined,
        groupId: data.groupId,
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
      setSuccessDialog('edited');
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      setMessage(err?.response?.data?.message ?? 'Failed');
    }
  };

  const onDelete = async () => {
    if (!companyId || !selectedId) return;
    if (!window.confirm('Delete this ledger?')) return;
    setMessage('');
    try {
      await ledgerAccountApi.delete(selectedId, companyId);
      setSuccessDialog('deleted');
      clearForm();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      setMessage(err?.response?.data?.message ?? 'Failed');
    }
  };

  const closeSuccessDialog = () => {
    const wasEdited = successDialog === 'edited';
    setSuccessDialog(null);
    if (wasEdited) clearForm();
  };

  if (!companyId) return <Typography color="error">Select a company first.</Typography>;

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h4">{title}</Typography>
        <Typography variant="body2" color="text.secondary">
          {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
        </Typography>
      </Box>
      <Paper sx={{ p: 3 }}>
        {message && (
          <Typography color={message.includes('Failed') ? 'error' : 'primary'} sx={{ mb: 2 }}>
            {message}
          </Typography>
        )}
        <form onSubmit={handleSubmit(isEditMode ? onEdit : onSubmit)}>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>Ledger details</Typography>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <Autocomplete
                    size="small"
                    options={ledgerOptions}
                    getOptionLabel={(opt) => (opt ? `${opt.name} (${opt.code})` : '')}
                    value={ledgerOptions.find((o) => o._id === selectedId) ?? null}
                    onChange={onLedgerSelect}
                    onInputChange={(_, v) => setLedgerSearch(v)}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Led Name"
                        placeholder="Search or select ledger"
                        sx={{ '& .MuiInputBase-input': { fontSize: '0.95rem' } }}
                      />
                    )}
                    renderOption={(props, option) => (
                      <li {...props} key={option._id} style={{ padding: '10px 14px', fontSize: '0.95rem', minHeight: 40 }}>
                        <Box>
                          <Typography variant="body1" fontWeight={500}>{option.name}</Typography>
                          <Typography variant="body2" color="text.secondary">{option.code}</Typography>
                        </Box>
                      </li>
                    )}
                    slotProps={{
                      paper: {
                        sx: {
                          fontSize: '0.95rem',
                          '& .MuiAutocomplete-listbox': { maxHeight: 320 },
                        },
                      },
                    }}
                    sx={{
                      '& .MuiOutlinedInput-root': { fontSize: '0.95rem' },
                    }}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField fullWidth size="small" label="Alias Name" {...register('aliasName')} disabled={isEditMode} />
                </Grid>
                <Grid item xs={6}>
                  <TextField fullWidth size="small" label="Account Code" {...register('code')} placeholder="Auto" disabled={isEditMode} />
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
                  <TextField fullWidth size="small" label="Name" required {...register('name', { required: 'Required' })} error={!!errors.name} helperText={errors.name?.message} disabled={isEditMode} />
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
                  <TextField fullWidth size="small" type="number" label="Credit Limit" {...register('creditLimit')} inputProps={{ min: 0, step: 0.01 }} InputLabelProps={{ shrink: true }} />
                </Grid>
                <Grid item xs={6}>
                  <TextField fullWidth size="small" type="number" label="Days" {...register('creditDays')} inputProps={{ min: 0 }} InputLabelProps={{ shrink: true }} />
                </Grid>
                <Grid item xs={6}>
                  <TextField fullWidth size="small" type="number" label="Old Balance Cr (AED)" {...register('openingBalanceCr')} inputProps={{ min: 0, step: 0.01 }} disabled={isEditMode} InputLabelProps={{ shrink: true }} />
                </Grid>
                <Grid item xs={6}>
                  <TextField fullWidth size="small" type="number" label="Old Balance Dr (AED)" {...register('openingBalanceDr')} inputProps={{ min: 0, step: 0.01 }} disabled={isEditMode} InputLabelProps={{ shrink: true }} />
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
            <Button type="submit" variant="contained" disabled={isEditMode}>
              Save
            </Button>
            <Button type="button" variant="outlined" onClick={clearForm}>
              Clear
            </Button>
            <Button type="button" variant="contained" disabled={!isEditMode} onClick={() => handleSubmit(onEdit)()}>
              Edit
            </Button>
            <Button type="button" variant="outlined" color="error" disabled={!isEditMode} onClick={onDelete}>
              Delete
            </Button>
          </Box>
        </form>
      </Paper>

      <Dialog open={!!successDialog} onClose={closeSuccessDialog}>
        <DialogTitle>{successDialog === 'edited' ? 'Edited' : 'Deleted'}</DialogTitle>
        <DialogContent>
          <Typography>
            {successDialog === 'edited' ? 'Ledger has been updated successfully.' : 'Ledger has been deleted successfully.'}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeSuccessDialog} variant="contained" autoFocus>
            OK
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
