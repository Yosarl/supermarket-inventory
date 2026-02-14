import { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { Box, Button, TextField, Typography, Paper, Table, TableBody, TableCell, TableHead, TableRow, MenuItem, IconButton, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import { useAppSelector } from '../store/hooks';
import { voucherApi, ledgerAccountApi } from '../services/api';

type Account = { _id: string; name: string; code: string };

const VOUCHER_TYPES = ['Receipt', 'Payment', 'Journal', 'ChequePayment', 'ChequeReceipt'] as const;
const VOUCHER_LABELS: Record<string, string> = { Receipt: 'Receipt', Payment: 'Payment', Journal: 'Journal', ChequePayment: 'Cheque Payment', ChequeReceipt: 'Cheque Receipt' };

export default function VoucherEntry({ defaultVoucherType = 'Receipt' }: { defaultVoucherType?: string }) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [successDialogOpen, setSuccessDialogOpen] = useState(false);
  const [successDialogMessage, setSuccessDialogMessage] = useState('');
  const [errorDialogOpen, setErrorDialogOpen] = useState(false);
  const [errorDialogMessage, setErrorDialogMessage] = useState('');
  const companyId = useAppSelector((s) => s.app.selectedCompanyId);
  const financialYearId = useAppSelector((s) => s.app.selectedFinancialYearId);
  const { register, control, handleSubmit, formState: { errors } } = useForm<{
    voucherType: string;
    date: string;
    narration: string;
    lines: Array<{ ledgerAccountId: string; debitAmount: number; creditAmount: number; narration: string }>;
  }>({
    defaultValues: {
      voucherType: defaultVoucherType,
      date: new Date().toISOString().slice(0, 10),
      narration: '',
      lines: [{ ledgerAccountId: '', debitAmount: 0, creditAmount: 0, narration: '' }, { ledgerAccountId: '', debitAmount: 0, creditAmount: 0, narration: '' }],
    },
  });
  const { fields, append, remove } = useFieldArray({ control, name: 'lines' });

  useEffect(() => {
    if (!companyId) return;
    ledgerAccountApi.list(companyId).then((res) => setAccounts((res.data.data as Account[]) ?? []));
  }, [companyId]);

  const onSubmit = async (data: { voucherType: string; date: string; narration: string; lines: Array<{ ledgerAccountId: string; debitAmount: number; creditAmount: number; narration: string }> }) => {
    if (!companyId || !financialYearId) return;
    const lines = data.lines.filter((l) => l.ledgerAccountId && (Number(l.debitAmount) > 0 || Number(l.creditAmount) > 0)).map((l) => ({
      ledgerAccountId: l.ledgerAccountId,
      debitAmount: Number(l.debitAmount) || 0,
      creditAmount: Number(l.creditAmount) || 0,
      narration: l.narration,
    }));
    if (lines.length < 2) {
      setErrorDialogMessage('Add at least 2 lines. Debits must equal credits.');
      setErrorDialogOpen(true);
      return;
    }
    try {
      await voucherApi.create({
        companyId,
        financialYearId,
        voucherType: data.voucherType,
        date: data.date,
        narration: data.narration,
        lines,
      });
      setSuccessDialogMessage('Voucher posted.');
      setSuccessDialogOpen(true);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      setErrorDialogMessage(err?.response?.data?.message ?? 'Failed');
      setErrorDialogOpen(true);
    }
  };

  if (!companyId) return <Typography color="error">Select a company first.</Typography>;
  if (!financialYearId) return <Typography color="error">Select a financial year first.</Typography>;

  return (
    <Box>
      <Typography variant="h4" gutterBottom>Voucher Entry</Typography>
      <Paper sx={{ p: 3 }}>
        <form onSubmit={handleSubmit(onSubmit)}>
          <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
            <TextField select label="Type" {...register('voucherType')} size="small" sx={{ minWidth: 140 }}>
              {VOUCHER_TYPES.map((t) => <MenuItem key={t} value={t}>{VOUCHER_LABELS[t] ?? t}</MenuItem>)}
            </TextField>
            <TextField type="date" label="Date" {...register('date', { required: true })} size="small" InputLabelProps={{ shrink: true }} />
            <TextField label="Narration" {...register('narration')} size="small" sx={{ minWidth: 280 }} />
          </Box>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Account</TableCell>
                <TableCell align="right">Debit (AED)</TableCell>
                <TableCell align="right">Credit (AED)</TableCell>
                <TableCell>Narration</TableCell>
                <TableCell width={50} />
              </TableRow>
            </TableHead>
            <TableBody>
              {fields.map((f, i) => (
                <TableRow key={f.id}>
                  <TableCell>
                    <TextField select size="small" fullWidth {...register(`lines.${i}.ledgerAccountId`)}>
                      <MenuItem value="">Select</MenuItem>
                      {accounts.map((a) => <MenuItem key={a._id} value={a._id}>{a.code} - {a.name}</MenuItem>)}
                    </TextField>
                  </TableCell>
                  <TableCell><TextField type="number" size="small" {...register(`lines.${i}.debitAmount`, { valueAsNumber: true })} inputProps={{ min: 0, step: 0.01 }} sx={{ width: 110 }} /></TableCell>
                  <TableCell><TextField type="number" size="small" {...register(`lines.${i}.creditAmount`, { valueAsNumber: true })} inputProps={{ min: 0, step: 0.01 }} sx={{ width: 110 }} /></TableCell>
                  <TableCell><TextField size="small" {...register(`lines.${i}.narration`)} fullWidth /></TableCell>
                  <TableCell><IconButton size="small" onClick={() => remove(i)} disabled={fields.length <= 2}><DeleteIcon /></IconButton></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Button startIcon={<AddIcon />} onClick={() => append({ ledgerAccountId: '', debitAmount: 0, creditAmount: 0, narration: '' })} sx={{ mt: 1 }}>Add line</Button>
          <Box sx={{ mt: 2 }}><Button type="submit" variant="contained">Post Voucher</Button></Box>
        </form>
      </Paper>
      <Dialog open={successDialogOpen} onClose={() => setSuccessDialogOpen(false)}>
        <DialogTitle sx={{ color: '#16a34a' }}>Success</DialogTitle>
        <DialogContent>
          <Typography>{successDialogMessage}</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSuccessDialogOpen(false)} autoFocus variant="contained" sx={{ bgcolor: '#16a34a', '&:hover': { bgcolor: '#15803d' } }}>
            OK
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog open={errorDialogOpen} onClose={() => setErrorDialogOpen(false)}>
        <DialogTitle sx={{ color: '#dc2626' }}>Error</DialogTitle>
        <DialogContent>
          <Typography>{errorDialogMessage}</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setErrorDialogOpen(false)} autoFocus variant="contained" sx={{ bgcolor: '#dc2626', '&:hover': { bgcolor: '#b91c1c' } }}>
            OK
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
