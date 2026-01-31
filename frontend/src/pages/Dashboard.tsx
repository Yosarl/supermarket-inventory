import { Box, Typography, Card, CardContent, Grid } from '@mui/material';
import { useAppSelector } from '../store/hooks';

export default function Dashboard() {
  const user = useAppSelector((s) => s.auth.user);
  const companyId = useAppSelector((s) => s.app.selectedCompanyId);
  const financialYearId = useAppSelector((s) => s.app.selectedFinancialYearId);

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Dashboard
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        Welcome, {user?.fullName ?? user?.username}. Select a company and financial year from File menu to work with data.
      </Typography>
      <Grid container spacing={2}>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>Company</Typography>
              <Typography variant="h6">{companyId ? 'Selected' : 'Not selected'}</Typography>
              <Typography variant="body2">Go to File → Companies to select.</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>Financial Year</Typography>
              <Typography variant="h6">{financialYearId ? 'Selected' : 'Not selected'}</Typography>
              <Typography variant="body2">Go to File → Change Financial Year.</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>Quick Actions</Typography>
              <Typography variant="body2">• Add Product (Master)</Typography>
              <Typography variant="body2">• Opening Stock (Entry)</Typography>
              <Typography variant="body2">• POS Sale (Entry)</Typography>
              <Typography variant="body2">• Trial Balance (Report)</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
