import React, { useState } from 'react';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import authService from '../services/authService';
import {
  Typography, TextField, Button, Box, Alert,
  CircularProgress, Paper, Link, Grid
} from '@mui/material';
import logo from '../assets/logo5.png';

const AccountIdLogin = () => {
  const [accountId, setAccountId] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const { data } = await authService.verifyAccountId(accountId);
      navigate('/login/user', { state: { accountId: data.accountId, companyName: data.companyName } });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to verify Account ID.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', background: 'linear-gradient(to bottom right, #eff6ff, #dbeafe)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', p: 2 }}>
      <img src={logo} alt="Load Network Logo" style={{ height: '340px', marginBottom: '-50px', marginTop: '-280px' }} />
      <Paper elevation={16} sx={{ p: { xs: 3, md: 5 }, borderRadius: '24px', maxWidth: '450px', width: '100%' }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <Typography component="h1" variant="h5" sx={{ mb: 3 }}>
            Sign In to Your Company Account
          </Typography>
          <Box component="form" onSubmit={handleSubmit} sx={{ width: '100%' }}>
            {error && <Alert severity="error" sx={{ width: '100%', mb: 2, borderRadius: '12px' }}>{error}</Alert>}
            <TextField
              margin="normal"
              required
              fullWidth
              id="accountId"
              label="Account ID (e.g., ACME-1234)"
              name="accountId"
              autoFocus
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
            />
            <Button
              type="submit"
              fullWidth
              variant="contained"
              disabled={loading}
              sx={{ mt: 3, mb: 2, borderRadius: '12px', py: 1.5, bgcolor: '#000080', '&:hover': { bgcolor: '#00005c' } }}
            >
              {loading ? <CircularProgress size={24} color="inherit" /> : 'Continue'}
            </Button>

            <Grid container justifyContent="space-between">
              <Grid item>
                <Link component={RouterLink} to="/forgot-account-id" variant="body2">
                  Forgot account ID?
                </Link>
              </Grid>
              <Grid item>
                <Link component={RouterLink} to="/register" variant="body2">
                  {"Don't have an account? Sign Up"}
                </Link>
              </Grid>
            </Grid>

          </Box>
        </Box>
      </Paper>
    </Box>
  );
};

export default AccountIdLogin;