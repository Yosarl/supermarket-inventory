import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Box, Button, TextField, Typography, Paper, Alert } from '@mui/material';
import { useAppDispatch } from '../store/hooks';
import { setCredentials } from '../store/slices/authSlice';
import { setCompany, setFinancialYear } from '../store/slices/appSlice';
import { authApi, financialYearApi } from '../services/api';

interface LoginForm {
  username: string;
  password: string;
}

export default function Login() {
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>();

  const onSubmit = async (data: LoginForm) => {
    setError('');
    try {
      const res = await authApi.login(data.username, data.password);
      const { token, user } = res.data.data as { token: string; user: { companyAccess?: string[] } };
      const userPayload = user as {
        _id: string;
        username: string;
        fullName: string;
        roles: string[];
        permissions: string[];
        companyAccess: string[];
      };
      dispatch(setCredentials({ token, user: userPayload }));

      const hasCompany = userPayload.companyAccess?.length && userPayload.companyAccess.length > 0;
      if (!hasCompany) {
        navigate('/file/companies/create');
        return;
      }
      if (userPayload.companyAccess.length === 1) {
        const companyId = userPayload.companyAccess[0];
        dispatch(setCompany(companyId));
        try {
          const fyRes = await financialYearApi.getCurrent(companyId);
          const fy = fyRes.data.data as { _id: string };
          if (fy?._id) dispatch(setFinancialYear(fy._id));
        } catch {
          // ignore if no current FY
        }
      }
      navigate('/');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Login failed';
      setError(msg);
    }
  };

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', bgcolor: 'background.default' }}>
      <Paper elevation={3} sx={{ p: 4, maxWidth: 400, width: '100%' }}>
        <Typography variant="h5" gutterBottom align="center">
          Supermarket Inventory & Accounting
        </Typography>
        <Typography variant="body2" color="text.secondary" align="center" sx={{ mb: 3 }}>
          UAE • MERN Stack
        </Typography>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <form onSubmit={handleSubmit(onSubmit)}>
          <TextField
            fullWidth
            label="Username"
            {...register('username', { required: 'Username is required' })}
            error={!!errors.username}
            helperText={errors.username?.message}
            sx={{ mb: 2 }}
            autoFocus
          />
          <TextField
            fullWidth
            type="password"
            label="Password"
            {...register('password', { required: 'Password is required' })}
            error={!!errors.password}
            helperText={errors.password?.message}
            sx={{ mb: 3 }}
          />
          <Button type="submit" variant="contained" fullWidth size="large">
            Sign In
          </Button>
        </form>
        <Typography variant="caption" display="block" sx={{ mt: 2 }} align="center" color="text.secondary">
          Default: admin / Admin@123 (after seed)
        </Typography>
      </Paper>
    </Box>
  );
}
