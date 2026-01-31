import { useEffect, useState } from 'react';
import { Box, Typography, TextField, Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, MenuItem } from '@mui/material';
import { useAppSelector } from '../store/hooks';
import { ledgerApi, ledgerAccountApi } from '../services/api';

export default function LedgerReport() {
  const [accounts, setAccounts] = useState<Array<{ _id: string; name: string; code: string }>>([]);
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [data, setData] = useState<{ openingBalance: number; openingIsDebit: boolean; transactions: Array<{ date: string; voucherNo?: string; debit: number; credit: number; balance: number; balanceIsDebit: boolean }>; closingBalance: number; closingIsDebit: boolean } | null>(null);
  const [loading, setLoading] = useState(false);
  const companyId = useAppSelector((s) => s.app.selectedCompanyId);
  const financialYearId = useAppSelector((s) => s.app.selectedFinancialYearId);

  useEffect(() => {
    if (!companyId) return;
    ledgerAccountApi.list(companyId).then((res) => setAccounts((res.data.data as typeof accounts) ?? []));
  }, [companyId]);

  const loadReport = () => {
    if (!companyId || !financialYearId || !selectedAccountId || !fromDate || !toDate) return;
    setLoading(true);
    ledgerApi.report(companyId, financialYearId, selectedAccountId, fromDate, toDate).then((res) => setData(res.data.data as typeof data)).finally(() => setLoading(false));
  };

  if (!companyId) return <Typography color="error">Select a company first.</Typography>;
  if (!financialYearId) return <Typography color="error">Select a financial year first.</Typography>;

  return (
    <Box>
      <Typography variant="h4" gutterBottom>Ledger Report</Typography>
      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 2 }}>
        <TextField select label="Account" value={selectedAccountId} onChange={(e) => setSelectedAccountId(e.target.value)} size="small" sx={{ minWidth: 200 }}>
          {accounts.map((a) => <MenuItem key={a._id} value={a._id}>{a.code} - {a.name}</MenuItem>)}
        </TextField>
        <TextField type="date" label="From" value={fromDate} onChange={(e) => setFromDate(e.target.value)} size="small" InputLabelProps={{ shrink: true }} />
        <TextField type="date" label="To" value={toDate} onChange={(e) => setToDate(e.target.value)} size="small" InputLabelProps={{ shrink: true }} />
        <Button variant="contained" onClick={loadReport} disabled={loading}>Load</Button>
      </Box>
      {data && (
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Date</TableCell>
                <TableCell>Voucher</TableCell>
                <TableCell align="right">Debit</TableCell>
                <TableCell align="right">Credit</TableCell>
                <TableCell align="right">Balance</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              <TableRow>
                <TableCell colSpan={2}>Opening</TableCell>
                <TableCell align="right">{data.openingIsDebit ? data.openingBalance.toFixed(2) : ''}</TableCell>
                <TableCell align="right">{!data.openingIsDebit ? data.openingBalance.toFixed(2) : ''}</TableCell>
                <TableCell align="right">{data.openingBalance.toFixed(2)} {data.openingIsDebit ? 'Dr' : 'Cr'}</TableCell>
              </TableRow>
              {data.transactions.map((t, i) => (
                <TableRow key={i}>
                  <TableCell>{new Date(t.date).toLocaleDateString()}</TableCell>
                  <TableCell>{t.voucherNo}</TableCell>
                  <TableCell align="right">{t.debit > 0 ? t.debit.toFixed(2) : ''}</TableCell>
                  <TableCell align="right">{t.credit > 0 ? t.credit.toFixed(2) : ''}</TableCell>
                  <TableCell align="right">{t.balance.toFixed(2)} {t.balanceIsDebit ? 'Dr' : 'Cr'}</TableCell>
                </TableRow>
              ))}
              <TableRow>
                <TableCell colSpan={3}>Closing</TableCell>
                <TableCell />
                <TableCell align="right"><strong>{data.closingBalance.toFixed(2)} {data.closingIsDebit ? 'Dr' : 'Cr'}</strong></TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
}
