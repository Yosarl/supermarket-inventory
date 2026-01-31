import { Box, Typography, Paper } from '@mui/material';

type Props = { title: string; message?: string };

export default function PlaceholderPage({ title, message = 'This feature is under development.' }: Props) {
  return (
    <Box>
      <Typography variant="h4" gutterBottom>{title}</Typography>
      <Paper sx={{ p: 3 }}>
        <Typography color="text.secondary">{message}</Typography>
      </Paper>
    </Box>
  );
}
