import { Box, Typography, Paper, List, ListItem, ListItemText } from '@mui/material';

export default function UserGuide() {
  return (
    <Box>
      <Typography variant="h4" gutterBottom>User Guide</Typography>
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>Workflows</Typography>
        <List dense>
          <ListItem><ListItemText primary="POS: Select company & FY → POS Sales → Scan/add items → Apply discount → Multiple payment modes → Print receipt." /></ListItem>
          <ListItem><ListItemText primary="Purchase: Supplier Reg → Purchase Entry → Enter bill → Stock and ledger updated." /></ListItem>
          <ListItem><ListItemText primary="Returns: Sales Return / Purchase Return → Select original document → Enter quantities → Stock and VAT reversed." /></ListItem>
          <ListItem><ListItemText primary="VAT: Company TRN and customer/supplier TRN for B2B. Invoices show 5% UAE VAT; zero-rated and exempt per product category." /></ListItem>
          <ListItem><ListItemText primary="Backups: Utilities → Backup (Admin). Restore only when recovering; test on a copy first." /></ListItem>
        </List>
        <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>Getting Started</Typography>
        <Typography paragraph>
          Create a Company and Financial Year first. Then add Ledger Groups, Ledger Accounts (customers/suppliers), Products, and Units of Measure.
          Enter Opening Stock and Opening Balances for ledgers. After that, you can run POS, sales, purchases, and vouchers.
        </Typography>
        <Typography variant="body2" color="text.secondary">
          For detailed documentation, contact your system administrator or refer to the implementation guide.
        </Typography>
      </Paper>
    </Box>
  );
}
