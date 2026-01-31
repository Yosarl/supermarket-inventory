import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Button, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { setCompany } from '../store/slices/appSlice';
import { companyApi } from '../services/api';

interface Company {
  _id: string;
  name: string;
  legalName?: string;
  TRN?: string;
  defaultCurrency?: string;
}

export default function CompanyList() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const selectedCompanyId = useAppSelector((s) => s.app.selectedCompanyId);

  useEffect(() => {
    companyApi.list().then((res) => {
      setCompanies((res.data.data as Company[]) ?? []);
    }).finally(() => setLoading(false));
  }, []);

  const selectCompany = (id: string) => dispatch(setCompany(id));

  return (
    <Box>
      <Typography variant="h4" gutterBottom>Companies</Typography>
      <Button startIcon={<AddIcon />} variant="contained" sx={{ mb: 2 }} onClick={() => navigate('/file/companies/create')}>Create Company</Button>
      {loading ? <Typography>Loading...</Typography> : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Legal Name</TableCell>
                <TableCell>TRN</TableCell>
                <TableCell>Currency</TableCell>
                <TableCell align="right">Action</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {companies.map((c) => (
                <TableRow key={c._id}>
                  <TableCell>{c.name}</TableCell>
                  <TableCell>{c.legalName ?? '-'}</TableCell>
                  <TableCell>{c.TRN ?? '-'}</TableCell>
                  <TableCell>{c.defaultCurrency ?? 'AED'}</TableCell>
                  <TableCell align="right">
                    <Button size="small" variant={selectedCompanyId === c._id ? 'contained' : 'outlined'} onClick={() => selectCompany(c._id)}>
                      {selectedCompanyId === c._id ? 'Selected' : 'Select'}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
}
