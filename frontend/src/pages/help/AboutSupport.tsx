import { Box, Typography, Paper } from '@mui/material';

const APP_VERSION = '1.0.0';

export default function AboutSupport() {
  return (
    <Box>
      <Typography variant="h4" gutterBottom>About & Support</Typography>
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6">Supermarket Inventory & Accounting (UAE)</Typography>
        <Typography color="text.secondary" gutterBottom>Version {APP_VERSION}</Typography>
        <Typography paragraph>
          Production-grade MERN stack application for supermarket inventory and accounting with UAE VAT support,
          double-entry bookkeeping, and multi-company / multi-financial-year support.
        </Typography>
        <Typography variant="subtitle2">Tech Stack</Typography>
        <Typography variant="body2" paragraph>
          React, TypeScript, Redux Toolkit, Material UI, React Hook Form • Node.js, Express, MongoDB • JWT, RBAC, bcrypt
        </Typography>
        <Typography variant="subtitle2">License</Typography>
        <Typography variant="body2" paragraph>Proprietary.</Typography>
        <Typography variant="subtitle2">Support</Typography>
        <Typography variant="body2">
          Contact your administrator for technical support. For feature requests or issues, use your organization&apos;s support channel.
        </Typography>
      </Paper>
    </Box>
  );
}
