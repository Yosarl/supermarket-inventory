import { useForm } from 'react-hook-form';
import { Box, Button, TextField, Typography, Paper, MenuItem } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAppSelector } from '../store/hooks';
import { ledgerGroupApi } from '../services/api';
import { useState } from 'react';

const GROUP_TYPES = ['Asset', 'Liability', 'Equity', 'Income', 'Expense'] as const;

export default function GroupCreate() {
  const [message, setMessage] = useState('');
  const navigate = useNavigate();
  const companyId = useAppSelector((s) => s.app.selectedCompanyId);
  const { register, handleSubmit, formState: { errors } } = useForm<{ code: string; name: string; type: string }>({
    defaultValues: { type: 'Asset' },
  });

  const onSubmit = async (data: { code: string; name: string; type: string }) => {
    if (!companyId) return;
    try {
      await ledgerGroupApi.create({ companyId, ...data });
      setMessage('Group created.');
      setTimeout(() => navigate('/master/groups'), 1000);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      setMessage(err?.response?.data?.message ?? 'Failed');
    }
  };

  if (!companyId) return <Typography color="error">Select a company first.</Typography>;

  return (
    <Box>
      <Typography variant="h4" gutterBottom>Add Group</Typography>
      {message && <Typography color={message.includes('created') ? 'primary' : 'error'} sx={{ mb: 2 }}>{message}</Typography>}
      <Paper sx={{ p: 3, maxWidth: 400 }}>
        <form onSubmit={handleSubmit(onSubmit)}>
          <TextField fullWidth label="Code" {...register('code', { required: true })} error={!!errors.code} margin="normal" size="small" />
          <TextField fullWidth label="Name" {...register('name', { required: true })} error={!!errors.name} margin="normal" size="small" />
          <TextField fullWidth select label="Type" required {...register('type', { required: true })} margin="normal" size="small">
            {GROUP_TYPES.map((t) => <MenuItem key={t} value={t}>{t}</MenuItem>)}
          </TextField>
          <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
            <Button type="submit" variant="contained">Save</Button>
            <Button onClick={() => navigate('/master/groups')}>Cancel</Button>
          </Box>
        </form>
      </Paper>
    </Box>
  );
}
