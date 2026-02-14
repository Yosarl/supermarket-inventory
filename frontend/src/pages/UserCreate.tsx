import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { Box, Button, TextField, Typography, Paper, Grid, MenuItem, FormControlLabel, Checkbox, InputLabel, FormControl, Select, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import { userApi, companyApi } from '../services/api';

type Company = { _id: string; name: string };

export default function UserCreate() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [companyAccess, setCompanyAccess] = useState<string[]>([]);
  const [errorDialogOpen, setErrorDialogOpen] = useState(false);
  const [errorDialogMessage, setErrorDialogMessage] = useState('');
  const navigate = useNavigate();
  const { register, handleSubmit, formState: { errors } } = useForm();
  useEffect(() => {
    companyApi.list().then((res) => setCompanies((res.data.data as Company[]) ?? []));
  }, []);

  const roleOptions = ['Admin', 'Accountant', 'Sales', 'Inventory Manager', 'POS Cashier'];

  const onSubmit = async (data: Record<string, unknown>) => {
    try {
      const selectedRoles = roleOptions.filter((_, i) => (data[`role_${i}`] as boolean));
      await userApi.create({
        username: data.username,
        fullName: data.fullName,
        email: data.email,
        phone: data.phone,
        password: data.password,
        roles: selectedRoles,
        permissions: ['*'],
        companyAccess: companyAccess,
      });
      navigate('/file/users');
    } catch (err: any) {
      setErrorDialogMessage(err.response?.data?.message || 'Save failed');
      setErrorDialogOpen(true);
    }
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>Create User</Typography>
      <Paper sx={{ p: 3, maxWidth: 600 }}>
        <form onSubmit={handleSubmit(onSubmit)}>
          <Grid container spacing={2}>
            <Grid item xs={12}><TextField fullWidth label="Username" required {...register('username', { required: true })} error={!!errors.username} /></Grid>
            <Grid item xs={12}><TextField fullWidth label="Full Name" required {...register('fullName', { required: true })} /></Grid>
            <Grid item xs={12}><TextField fullWidth type="email" label="Email" required {...register('email', { required: true })} /></Grid>
            <Grid item xs={12}><TextField fullWidth type="password" label="Password" required {...register('password', { required: true, minLength: 8 })} /></Grid>
            <Grid item xs={12}><TextField fullWidth label="Phone" {...register('phone')} /></Grid>
            <Grid item xs={12}>
              <Typography variant="subtitle2" gutterBottom>Roles</Typography>
              {roleOptions.map((r, i) => (
                <FormControlLabel key={r} control={<Checkbox {...register(`role_${i}`)} />} label={r} />
              ))}
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Company Access</InputLabel>
                <Select multiple label="Company Access" value={companyAccess} onChange={(e) => setCompanyAccess(typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value)} renderValue={(sel) => (sel as string[]).map((id) => companies.find((c) => c._id === id)?.name).filter(Boolean).join(', ')}>
                  {companies.map((c) => <MenuItem key={c._id} value={c._id}>{c.name}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
          <Box sx={{ mt: 3 }}><Button type="submit" variant="contained">Create</Button><Button type="button" onClick={() => navigate('/file/users')} sx={{ ml: 2 }}>Cancel</Button></Box>
        </form>
      </Paper>

      {/* Error Dialog */}
      <Dialog open={errorDialogOpen} onClose={() => setErrorDialogOpen(false)} PaperProps={{ sx: { borderRadius: 2, minWidth: 350 } }}>
        <DialogTitle sx={{ fontWeight: 700, fontSize: '1rem', color: '#dc2626' }}>Error</DialogTitle>
        <DialogContent>
          <Typography sx={{ fontSize: '0.9rem', color: '#475569' }}>{errorDialogMessage}</Typography>
        </DialogContent>
        <DialogActions sx={{ px: 2, pb: 2 }}>
          <Button variant="contained" onClick={() => setErrorDialogOpen(false)} autoFocus sx={{ textTransform: 'none', borderRadius: 1.5, bgcolor: '#dc2626', '&:hover': { bgcolor: '#b91c1c' }, boxShadow: 'none' }}>OK</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
