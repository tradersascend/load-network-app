import React from 'react';
import { Paper, Typography } from '@mui/material';

const Faq = () => {
  return (
    <Paper 
      elevation={16} 
      sx={{ 
        p: { xs: 2, md: 4 }, 
        borderRadius: '24px', 
        border: 0, 
        bgcolor: '#c7f3ff', 
        flexGrow: 1, 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center' 
      }}
    >
      <Typography variant="h4" color="text.secondary">
        Under development
      </Typography>
    </Paper>
  );
};

export default Faq;