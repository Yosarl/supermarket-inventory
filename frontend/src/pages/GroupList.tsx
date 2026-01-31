import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Button, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { useAppSelector } from '../store/hooks';
import { ledgerGroupApi } from '../services/api';

type Group = { _id: string; name: string; code: string; type?: string };

export default function GroupList() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const companyId = useAppSelector((s) => s.app.selectedCompanyId);

  useEffect(() => {
    if (!companyId) return;
    ledgerGroupApi.list(companyId).then((res) => {
      setGroups((res.data.data as Group[]) ?? []);
    }).finally(() => setLoading(false));
  }, [companyId]);

  if (!companyId) return <Typography color="error">Select a company first.</Typography>;

  return (
    <Box>
      <Typography variant="h4" gutterBottom>Group Reg</Typography>
      <Button startIcon={<AddIcon />} variant="contained" sx={{ mb: 2 }} onClick={() => navigate('/master/groups/create')}>Add Group</Button>
      {loading ? <Typography>Loading...</Typography> : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Code</TableCell>
                <TableCell>Name</TableCell>
                <TableCell>Type</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {groups.map((g) => (
                <TableRow key={g._id}>
                  <TableCell>{g.code}</TableCell>
                  <TableCell>{g.name}</TableCell>
                  <TableCell>{g.type ?? '-'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
}
