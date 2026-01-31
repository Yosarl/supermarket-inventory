import { useEffect, useState } from 'react';
import { Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper } from '@mui/material';
import { useAppSelector } from '../../store/hooks';
import { productApi } from '../../services/api';

export default function UnitList() {
  const [units, setUnits] = useState<Array<{ _id: string; name: string; shortCode: string }>>([]);
  const [loading, setLoading] = useState(true);
  const companyId = useAppSelector((s) => s.app.selectedCompanyId);

  useEffect(() => {
    if (!companyId) return;
    productApi.getUnits(companyId).then((res) => {
      setUnits((res.data.data as typeof units) ?? []);
    }).finally(() => setLoading(false));
  }, [companyId]);

  if (!companyId) return <Typography color="error">Select a company first.</Typography>;

  return (
    <Box>
      <Typography variant="h4" gutterBottom>Unit List</Typography>
      {loading ? <Typography>Loading...</Typography> : (
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Code</TableCell>
                <TableCell>Name</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {units.map((u) => (
                <TableRow key={u._id}>
                  <TableCell>{u.shortCode}</TableCell>
                  <TableCell>{u.name}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
}
