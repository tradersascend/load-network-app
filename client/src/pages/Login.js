import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link as RouterLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import authService from '../services/authService';
import { Typography, TextField, Button, Box, Alert, CircularProgress, Grid, Paper, Link } from '@mui/material';
import logo from '../assets/logo5.png'; 

const Login = () => {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  const accountId = location.state?.accountId;
  const companyName = location.state?.companyName;

  useEffect(() => {
    if (!accountId) {
      navigate('/login');
    }
  }, [accountId, navigate]);

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const loginData = { ...formData, accountId };
      const { data } = await authService.login(loginData);
      login(data); 
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', background: 'linear-gradient(to bottom right, #eff6ff, #dbeafe)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', p: 2 }}>
      <img src={logo} alt="Load Network Logo" style={{ height: '340px', marginBottom: '-50px', marginTop: '-280px' }} />
      
      <Paper elevation={16} sx={{ p: { xs: 3, md: 5 }, borderRadius: '24px', maxWidth: '450px', width: '100%' }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <Typography component="h1" variant="h5" sx={{ mb: 1 }}>
            {companyName || 'Sign In'}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Account ID: {accountId}
          </Typography>
          <Box component="form" onSubmit={handleSubmit} sx={{ width: '100%' }}>
            {error && <Alert severity="error" sx={{ width: '100%', mb: 2, borderRadius: '12px' }}>{error}</Alert>}
            <TextField margin="normal" required fullWidth label="Your Email Address" name="email" value={formData.email} onChange={handleChange} />
            <TextField margin="normal" required fullWidth name="password" label="Your Password" type="password" value={formData.password} onChange={handleChange} />
            <Button type="submit" fullWidth variant="contained" disabled={loading} sx={{ mt: 3, mb: 2, borderRadius: '12px', py: 1.5, bgcolor: '#000080', '&:hover': { bgcolor: '#00005c' } }}>
              {loading ? <CircularProgress size={24} color="inherit" /> : 'Sign In'}
            </Button>
            <Grid container justifyContent="space-between">
              <Grid item xs>
                <Link component={RouterLink} to="/forgot-password" variant="body2">Forgot password?</Link>
              </Grid>
              <Grid item>
                <Link component={RouterLink} to="/login" variant="body2">Wrong Account ID?</Link>
              </Grid>
            </Grid>
          </Box>
        </Box>
      </Paper>
    </Box>
  );
};

export default Login;