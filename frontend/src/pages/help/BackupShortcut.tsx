import { Box, Typography, Button, Paper, Alert } from '@mui/material';
import BackupIcon from '@mui/icons-material/Backup';
import { useNavigate } from 'react-router-dom';

export default function BackupShortcut() {
  const navigate = useNavigate();
  return (
    <Box>
      <Typography variant="h4" gutterBottom>Backup Database</Typography>
      <Alert severity="info" sx={{ mb: 2 }}>
        Create a full backup of your database. Recommended before major changes or periodically for disaster recovery.
      </Alert>
      <Paper sx={{ p: 3 }}>
        <Typography paragraph>
          Use the backup utility to export your company data (products, ledger, invoices, etc.) to an archive file.
          Only administrators can perform backups.
        </Typography>
        <Button variant="contained" startIcon={<BackupIcon />} onClick={() => navigate('/utilities/backup')}>
          Go to Backup
        </Button>
      </Paper>
    </Box>
  );
}
