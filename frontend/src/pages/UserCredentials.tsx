import { useEffect, useState } from 'react';
import { Box, Button, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Dialog, DialogTitle, DialogContent, DialogActions, TextField } from '@mui/material';
import LockResetIcon from '@mui/icons-material/LockReset';
import { userApi } from '../services/api';

export default function UserCredentials() {
  const [users, setUsers] = useState<Array<{ _id: string; username: string; fullName: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    userApi.list().then((res) => {
      setUsers((res.data.data as typeof users) ?? []);
    }).finally(() => setLoading(false));
  }, []);

  const handleReset = async () => {
    if (!selectedId || !newPassword) return;
    try {
      await userApi.resetPassword(selectedId, newPassword);
      setMessage('Password updated.');
      setOpen(false);
      setSelectedId(null);
      setNewPassword('');
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      setMessage(err?.response?.data?.message ?? 'Failed');
    }
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>Update User Credentials</Typography>
      {message && <Typography color={message.includes('updated') ? 'primary' : 'error'} sx={{ mb: 2 }}>{message}</Typography>}
      {loading ? <Typography>Loading...</Typography> : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Username</TableCell>
                <TableCell>Full Name</TableCell>
                <TableCell align="right">Action</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {users.map((u) => (
                <TableRow key={u._id}>
                  <TableCell>{u.username}</TableCell>
                  <TableCell>{u.fullName}</TableCell>
                  <TableCell align="right">
                    <Button size="small" startIcon={<LockResetIcon />} onClick={() => { setSelectedId(u._id); setNewPassword(''); setMessage(''); setOpen(true); }}>Reset Password</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
      <Dialog open={open} onClose={() => setOpen(false)}>
        <DialogTitle>Reset Password</DialogTitle>
        <DialogContent>
          <TextField fullWidth label="New Password" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} margin="dense" autoFocus />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleReset} disabled={!newPassword.trim()}>Update</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
