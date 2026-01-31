import { useEffect, useState } from 'react';
import { Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper } from '@mui/material';
import { useAppSelector } from '../store/hooks';
import { ledgerAccountApi, ledgerGroupApi } from '../services/api';

type Account = { _id: string; name: string; code: string; type: string; groupId?: string };
type Group = { _id: string; name: string; code: string };

export default function ChartOfAccounts() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const companyId = useAppSelector((s) => s.app.selectedCompanyId);

  useEffect(() => {
    if (!companyId) return;
    Promise.all([ledgerAccountApi.list(companyId), ledgerGroupApi.list(companyId)]).then(([accRes, grpRes]) => {
      setAccounts((accRes.data.data as Account[]) ?? []);
      setGroups((grpRes.data.data as Group[]) ?? []);
    }).finally(() => setLoading(false));
  }, [companyId]);

  if (!companyId) return <Typography color="error">Select a company first.</Typography>;

  const groupMap = Object.fromEntries(groups.map((g) => [g._id, g.name]));

  return (
    <Box>
      <Typography variant="h4" gutterBottom>Chart of Accounts</Typography>
      {loading ? <Typography>Loading...</Typography> : (
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Code</TableCell>
                <TableCell>Name</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Group</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {accounts.map((a) => (
                <TableRow key={a._id}>
                  <TableCell>{a.code}</TableCell>
                  <TableCell>{a.name}</TableCell>
                  <TableCell>{a.type ?? '-'}</TableCell>
                  <TableCell>{a.groupId ? groupMap[a.groupId] ?? '-' : '-'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
}
