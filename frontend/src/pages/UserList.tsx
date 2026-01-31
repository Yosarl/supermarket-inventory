import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Button, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { userApi } from '../services/api';

export default function UserList() {
  const [users, setUsers] = useState<Array<{ _id: string; username: string; fullName: string; email: string; roles: string[]; status: string }>>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    userApi.list().then((res) => {
      setUsers((res.data.data as typeof users) ?? []);
    }).finally(() => setLoading(false));
  }, []);

  return (
    <Box>
      <Typography variant="h4" gutterBottom>User Management</Typography>
      <Button startIcon={<AddIcon />} variant="contained" sx={{ mb: 2 }} onClick={() => navigate('/file/users/create')}>Create User</Button>
      {loading ? <Typography>Loading...</Typography> : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Username</TableCell>
                <TableCell>Full Name</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Roles</TableCell>
                <TableCell>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {users.map((u) => (
                <TableRow key={u._id}>
                  <TableCell>{u.username}</TableCell>
                  <TableCell>{u.fullName}</TableCell>
                  <TableCell>{u.email}</TableCell>
                  <TableCell>{(u.roles || []).join(', ')}</TableCell>
                  <TableCell>{u.status}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
}
