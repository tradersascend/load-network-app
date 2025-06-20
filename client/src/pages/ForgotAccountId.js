import React, { useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import authService from '../services/authService';
import {
  Typography, TextField, Button, Box, Alert,
  CircularProgress, Paper, Link
} from '@mui/material';

const ForgotAccountId = () => {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');
    try {
      const { data } = await authService.recoverAccountId(email);
      setMessage(data.message);
    } catch (err) {
      setError(err.response?.data?.message || 'An error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', background: 'linear-gradient(to bottom right, #eff6ff, #dbeafe)', display: 'flex', alignItems: 'center', justifyContent: 'center', p: 2 }}>
      <Paper elevation={16} sx={{ p: { xs: 3, md: 5 }, borderRadius: '24px', maxWidth: '450px', width: '100%' }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <Typography component="h1" variant="h5" sx={{ mb: 2 }}>
            Forgot Your Account ID?
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3, textAlign: 'center' }}>
            Enter your email address and we'll send you your company's Account ID.
          </Typography>
          <Box component="form" onSubmit={handleSubmit} sx={{ width: '100%' }}>
            {message && <Alert severity="success" sx={{ width: '100%', mb: 2, borderRadius: '12px' }}>{message}</Alert>}
            {error && <Alert severity="error" sx={{ width: '100%', mb: 2, borderRadius: '12px' }}>{error}</Alert>}
            
            <TextField
              margin="normal"
              required
              fullWidth
              id="email"
              label="Your Email Address"
              name="email"
              autoComplete="email"
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            
            <Button
              type="submit"
              fullWidth
              variant="contained"
              disabled={loading}
              sx={{ mt: 3, mb: 2, borderRadius: '12px', py: 1.5, bgcolor: '#000080', '&:hover': { bgcolor: '#00005c' } }}
            >
              {loading ? <CircularProgress size={24} color="inherit" /> : 'Send Account ID'}
            </Button>
            
            <Box sx={{ textAlign: 'center' }}>
              <Link component={RouterLink} to="/login" variant="body2">
                Back to Login
              </Link>
            </Box>

          </Box>
        </Box>
      </Paper>
    </Box>
  );
};

export default ForgotAccountId;