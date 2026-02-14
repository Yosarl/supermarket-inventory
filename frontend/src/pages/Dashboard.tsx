import { Box, Typography, Card, CardContent, Grid, Button } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAppSelector } from '../store/hooks';
import BusinessIcon from '@mui/icons-material/Business';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import InventoryIcon from '@mui/icons-material/Inventory';
import AddBoxIcon from '@mui/icons-material/AddBox';
import PointOfSaleIcon from '@mui/icons-material/PointOfSale';

export default function Dashboard() {
  const navigate = useNavigate();
  const user = useAppSelector((s) => s.auth.user);
  const companyId = useAppSelector((s) => s.app.selectedCompanyId);
  const financialYearId = useAppSelector((s) => s.app.selectedFinancialYearId);

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Dashboard
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        Welcome, {user?.fullName ?? user?.username}. Your company and financial year are selected. Use the menu or the links below to go forward.
      </Typography>
      <Grid container spacing={2}>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>Company</Typography>
              <Typography variant="h6">{companyId ? 'Selected' : 'Not selected'}</Typography>
              <Button size="small" startIcon={<BusinessIcon />} onClick={() => navigate('/file/company-details')} sx={{ mt: 1 }}>
                Company Details
              </Button>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>Financial Year</Typography>
              <Typography variant="h6">{financialYearId ? 'Selected' : 'Not selected'}</Typography>
              <Button size="small" startIcon={<CalendarMonthIcon />} onClick={() => navigate('/file/change-financial-year')} sx={{ mt: 1 }}>
                Change Financial Year
              </Button>
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
      <Typography variant="h6" sx={{ mt: 4, mb: 2 }}>Go forward</Typography>
      <Grid container spacing={2}>
        <Grid item xs={12} sm={6} md={4}>
          <Card sx={{ cursor: 'pointer' }} onClick={() => navigate('/master/products')}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <InventoryIcon color="primary" />
                <Typography variant="subtitle1">Product Reg</Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">Register products and set up inventory.</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <Card sx={{ cursor: 'pointer' }} onClick={() => navigate('/entry/opening-stock')}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <AddBoxIcon color="primary" />
                <Typography variant="subtitle1">Opening Stock</Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">Enter opening stock quantities and cost.</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <Card sx={{ cursor: 'pointer' }} onClick={() => navigate('/entry/pos')}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <PointOfSaleIcon color="primary" />
                <Typography variant="subtitle1">POS Sales</Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">Point of sale and daily sales.</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
