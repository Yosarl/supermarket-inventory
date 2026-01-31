import { useEffect, useState } from 'react';
import { Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, TextField, Button } from '@mui/material';
import { useAppSelector } from '../store/hooks';
import { auditLogApi } from '../services/api';

type Log = { _id: string; timestamp: string; entityType: string; entityId?: string; action: string; userId?: { username: string; fullName: string }; details?: string };

export default function EventReport() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [total, setTotal] = useState(0);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [loading, setLoading] = useState(true);
  const companyId = useAppSelector((s) => s.app.selectedCompanyId);

  const load = () => {
    setLoading(true);
    auditLogApi.list({ companyId, fromDate: fromDate || undefined, toDate: toDate || undefined, limit: 100 }).then((res) => {
      const d = res.data.data as { logs: Log[]; total: number };
      setLogs(d?.logs ?? []);
      setTotal(d?.total ?? 0);
    }).finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [companyId]);

  return (
    <Box>
      <Typography variant="h4" gutterBottom>Event Report (Audit Log)</Typography>
      <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
        <TextField type="date" label="From" value={fromDate} onChange={(e) => setFromDate(e.target.value)} size="small" InputLabelProps={{ shrink: true }} />
        <TextField type="date" label="To" value={toDate} onChange={(e) => setToDate(e.target.value)} size="small" InputLabelProps={{ shrink: true }} />
        <Button variant="contained" onClick={load} disabled={loading}>Load</Button>
      </Box>
      {loading ? <Typography>Loading...</Typography> : (
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Time</TableCell>
                <TableCell>User</TableCell>
                <TableCell>Action</TableCell>
                <TableCell>Entity</TableCell>
                <TableCell>Entity ID</TableCell>
                <TableCell>Details</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {logs.map((l) => (
                <TableRow key={l._id}>
                  <TableCell>{new Date(l.timestamp).toLocaleString()}</TableCell>
                  <TableCell>{(l.userId as { username?: string; fullName?: string })?.fullName ?? (l.userId as { username?: string })?.username ?? '-'}</TableCell>
                  <TableCell>{l.action}</TableCell>
                  <TableCell>{l.entityType}</TableCell>
                  <TableCell>{l.entityId ?? '-'}</TableCell>
                  <TableCell>{l.details ?? '-'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
      <Typography variant="body2" sx={{ mt: 1 }}>Total: {total}</Typography>
    </Box>
  );
}
