import { useEffect, useState } from 'react';
import { Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, TextField, Button, Alert } from '@mui/material';
import { useAppSelector } from '../store/hooks';
import { ledgerApi } from '../services/api';

type Row = { type: string; name: string; amount: number };

export default function BalanceSheet() {
  const [data, setData] = useState<{ assets: number; liabilities: number; equity: number; balanced: boolean; groups: Row[] } | null>(null);
  const [asAtDate, setAsAtDate] = useState('');
  const [loading, setLoading] = useState(false);
  const companyId = useAppSelector((s) => s.app.selectedCompanyId);
  const financialYearId = useAppSelector((s) => s.app.selectedFinancialYearId);

  const load = () => {
    if (!companyId || !financialYearId) return;
    setLoading(true);
    ledgerApi.balanceSheet(companyId, financialYearId, asAtDate || undefined).then((res) => {
      setData(res.data.data as typeof data);
    }).finally(() => setLoading(false));
  };

  if (!companyId) return <Typography color="error">Select a company first.</Typography>;
  if (!financialYearId) return <Typography color="error">Select a financial year first.</Typography>;

  return (
    <Box>
      <Typography variant="h4" gutterBottom>Balance Sheet</Typography>
      <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
        <TextField type="date" label="As at" value={asAtDate} onChange={(e) => setAsAtDate(e.target.value)} size="small" InputLabelProps={{ shrink: true }} />
        <Button variant="contained" onClick={load} disabled={loading}>Load</Button>
      </Box>
      {data && !data.balanced && <Alert severity="warning" sx={{ mb: 2 }}>Assets do not equal Liabilities + Equity. Check postings.</Alert>}
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
                <TableCell colSpan={2}><strong>Total Assets</strong></TableCell>
                <TableCell align="right"><strong>{data.assets.toFixed(2)}</strong></TableCell>
              </TableRow>
              <TableRow>
                <TableCell colSpan={2}><strong>Total Liabilities</strong></TableCell>
                <TableCell align="right"><strong>{data.liabilities.toFixed(2)}</strong></TableCell>
              </TableRow>
              <TableRow>
                <TableCell colSpan={2}><strong>Total Equity</strong></TableCell>
                <TableCell align="right"><strong>{data.equity.toFixed(2)}</strong></TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
}
