import { Box, Paper, Typography } from '@mui/material';
import SettingsIcon from '@mui/icons-material/Settings';

export default function SoftwareSettings() {
  return (
    <Box sx={{ p: 3, maxWidth: 900, mx: 'auto' }}>
      <Paper elevation={0} sx={{ p: 3, borderRadius: 2, border: '1px solid #e2e8f0' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
          <SettingsIcon sx={{ color: '#1e293b', fontSize: 28 }} />
          <Typography variant="h5" sx={{ fontWeight: 700, color: '#1e293b' }}>
            Software Settings
          </Typography>
        </Box>
        <Typography variant="body2" sx={{ color: '#64748b' }}>
          Configure your software settings here.
        </Typography>
      </Paper>
    </Box>
  );
}
