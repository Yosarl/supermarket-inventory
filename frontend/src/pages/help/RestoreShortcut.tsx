import { Box, Typography, Button, Paper, Alert } from '@mui/material';
import RestoreIcon from '@mui/icons-material/Restore';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { useNavigate } from 'react-router-dom';

export default function RestoreShortcut() {
  const navigate = useNavigate();
  return (
    <Box>
      <Typography variant="h4" gutterBottom>Restore Database</Typography>
      <Alert severity="warning" icon={<WarningAmberIcon />} sx={{ mb: 2 }}>
        Restoring overwrites current data. Use only when recovering from a backup. Admin-only.
      </Alert>
      <Paper sx={{ p: 3 }}>
        <Typography paragraph>
          Select a previously created backup archive and restore the database. All current data may be replaced.
          Consider restoring to a copy environment first for testing.
        </Typography>
        <Button variant="contained" color="secondary" startIcon={<RestoreIcon />} onClick={() => navigate('/utilities/restore')}>
          Go to Restore
        </Button>
      </Paper>
    </Box>
  );
}
