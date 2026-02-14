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
  const [successDialogOpen, setSuccessDialogOpen] = useState(false);
  const [successDialogMessage, setSuccessDialogMessage] = useState('');
  const [errorDialogOpen, setErrorDialogOpen] = useState(false);
  const [errorDialogMessage, setErrorDialogMessage] = useState('');

  useEffect(() => {
    userApi.list().then((res) => {
      setUsers((res.data.data as typeof users) ?? []);
    }).finally(() => setLoading(false));
  }, []);

  const handleReset = async () => {
    if (!selectedId || !newPassword) return;
    try {
      await userApi.resetPassword(selectedId, newPassword);
      setSuccessDialogMessage('Password updated.');
      setSuccessDialogOpen(true);
      setOpen(false);
      setSelectedId(null);
      setNewPassword('');
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      setErrorDialogMessage(err?.response?.data?.message ?? 'Failed');
      setErrorDialogOpen(true);
    }
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>Update User Credentials</Typography>
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
                    <Button size="small" startIcon={<LockResetIcon />} onClick={() => { setSelectedId(u._id); setNewPassword(''); setOpen(true); }}>Reset Password</Button>
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
          <Button variant="contained" onClick={handleReset} disabled={!newPassword.trim()} autoFocus>Update</Button>
        </DialogActions>
      </Dialog>
      <Dialog open={successDialogOpen} onClose={() => setSuccessDialogOpen(false)}>
        <DialogTitle sx={{ color: '#16a34a' }}>Success</DialogTitle>
        <DialogContent>
          <Typography>{successDialogMessage}</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSuccessDialogOpen(false)} variant="contained" sx={{ bgcolor: '#16a34a', '&:hover': { bgcolor: '#15803d' } }} autoFocus>OK</Button>
        </DialogActions>
      </Dialog>
      <Dialog open={errorDialogOpen} onClose={() => setErrorDialogOpen(false)}>
        <DialogTitle sx={{ color: '#dc2626' }}>Error</DialogTitle>
        <DialogContent>
          <Typography>{errorDialogMessage}</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setErrorDialogOpen(false)} variant="contained" sx={{ bgcolor: '#dc2626', '&:hover': { bgcolor: '#b91c1c' } }} autoFocus>OK</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
