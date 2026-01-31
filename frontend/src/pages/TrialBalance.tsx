import { useEffect, useState } from 'react';
import { Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Alert, Button } from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import { useAppSelector } from '../store/hooks';
import { ledgerApi } from '../services/api';

type Row = { name: string; code: string; debit: number; credit: number };

export default function TrialBalance() {
  const [rows, setRows] = useState<Row[]>([]);
  const [totalDebit, setTotalDebit] = useState(0);
  const [totalCredit, setTotalCredit] = useState(0);
  const [balanced, setBalanced] = useState(false);
  const [loading, setLoading] = useState(true);
  const companyId = useAppSelector((s) => s.app.selectedCompanyId);
  const financialYearId = useAppSelector((s) => s.app.selectedFinancialYearId);

  useEffect(() => {
    if (!companyId || !financialYearId) return;
    ledgerApi.trialBalance(companyId, financialYearId).then((res) => {
      const d = res.data.data as { rows: Row[]; totalDebit: number; totalCredit: number; balanced: boolean };
      setRows(d?.rows ?? []);
      setTotalDebit(d?.totalDebit ?? 0);
      setTotalCredit(d?.totalCredit ?? 0);
      setBalanced(d?.balanced ?? false);
    }).finally(() => setLoading(false));
  }, [companyId, financialYearId]);

  const handleExport = () => {
    if (!companyId || !financialYearId) return;
    ledgerApi.exportTrialBalance(companyId, financialYearId).then((res) => {
      const blob = new Blob([res.data as Blob], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `trial-balance-${new Date().toISOString().slice(0, 10)}.xlsx`;
      a.click();
      window.URL.revokeObjectURL(url);
    });
  };

  if (!companyId) return <Typography color="error">Select a company first.</Typography>;
  if (!financialYearId) return <Typography color="error">Select a financial year first.</Typography>;

  return (
    <Box>
      <Typography variant="h4" gutterBottom>Trial Balance</Typography>
      <Button startIcon={<DownloadIcon />} variant="outlined" onClick={handleExport} sx={{ mb: 2 }}>
        Export to Excel
      </Button>
      {!balanced && rows.length > 0 && <Alert severity="warning" sx={{ mb: 2 }}>Debits and credits do not match.</Alert>}
      {loading ? <Typography>Loading...</Typography> : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Code</TableCell>
                <TableCell>Account</TableCell>
                <TableCell align="right">Debit (AED)</TableCell>
                <TableCell align="right">Credit (AED)</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((r, i) => (
                <TableRow key={i}>
                  <TableCell>{r.code}</TableCell>
                  <TableCell>{r.name}</TableCell>
                  <TableCell align="right">{r.debit.toFixed(2)}</TableCell>
                  <TableCell align="right">{r.credit.toFixed(2)}</TableCell>
                </TableRow>
              ))}
              <TableRow>
                <TableCell colSpan={2}><strong>Total</strong></TableCell>
                <TableCell align="right"><strong>{totalDebit.toFixed(2)}</strong></TableCell>
                <TableCell align="right"><strong>{totalCredit.toFixed(2)}</strong></TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
}
