import { useState } from 'react';
import { Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, TextField, Button } from '@mui/material';
import { useAppSelector } from '../store/hooks';
import { ledgerApi } from '../services/api';

type Row = { type: string; name: string; amount: number };

export default function ProfitLoss() {
  const [data, setData] = useState<{ income: number; expenses: number; netProfit: number; groups: Row[] } | null>(null);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [loading, setLoading] = useState(false);
  const companyId = useAppSelector((s) => s.app.selectedCompanyId);
  const financialYearId = useAppSelector((s) => s.app.selectedFinancialYearId);

  const load = () => {
    if (!companyId || !financialYearId) return;
    setLoading(true);
    ledgerApi.profitLoss(companyId, financialYearId, fromDate || undefined, toDate || undefined).then((res) => {
      setData(res.data.data as typeof data);
    }).finally(() => setLoading(false));
  };

  if (!companyId) return <Typography color="error">Select a company first.</Typography>;
  if (!financialYearId) return <Typography color="error">Select a financial year first.</Typography>;

  return (
    <Box>
      <Typography variant="h4" gutterBottom>Profit &amp; Loss</Typography>
      <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
        <TextField type="date" label="From" value={fromDate} onChange={(e) => setFromDate(e.target.value)} size="small" InputLabelProps={{ shrink: true }} />
        <TextField type="date" label="To" value={toDate} onChange={(e) => setToDate(e.target.value)} size="small" InputLabelProps={{ shrink: true }} />
        <Button variant="contained" onClick={load} disabled={loading}>Load</Button>
      </Box>
      {data && (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Account</TableCell>
                <TableCell>Type</TableCell>
                <TableCell align="right">Amount (AED)</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data.groups.map((r, i) => (
                <TableRow key={i}>
                  <TableCell>{r.name}</TableCell>
                  <TableCell>{r.type}</TableCell>
                  <TableCell align="right">{r.amount.toFixed(2)}</TableCell>
                </TableRow>
              ))}
              <TableRow>
                <TableCell colSpan={2}><strong>Total Income</strong></TableCell>
                <TableCell align="right"><strong>{data.income.toFixed(2)}</strong></TableCell>
              </TableRow>
              <TableRow>
                <TableCell colSpan={2}><strong>Total Expenses</strong></TableCell>
                <TableCell align="right"><strong>{data.expenses.toFixed(2)}</strong></TableCell>
              </TableRow>
              <TableRow>
                <TableCell colSpan={2}><strong>Net Profit</strong></TableCell>
                <TableCell align="right"><strong>{data.netProfit.toFixed(2)}</strong></TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
}
