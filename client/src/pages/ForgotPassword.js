import React, { useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import authService from '../services/authService';
import { Typography, TextField, Button, Box, Alert, CircularProgress, Paper, Link } from '@mui/material';

const ForgotPassword = () => {
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
            const { data } = await authService.forgotPassword(email);
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
                    <Typography component="h1" variant="h5" sx={{ mb: 2 }}>Reset Password</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 3, textAlign: 'center' }}>Enter your email address and we will send you a link to reset your password.</Typography>
                    <Box component="form" onSubmit={handleSubmit} sx={{ width: '100%' }}>
                        {message && <Alert severity="success">{message}</Alert>}
                        {error && <Alert severity="error">{error}</Alert>}
                        <TextField margin="normal" required fullWidth label="Email Address" name="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                        <Button type="submit" fullWidth variant="contained" disabled={loading} sx={{ mt: 3, mb: 2, borderRadius: '12px' }}>
                            {loading ? <CircularProgress size={24} /> : 'Send Reset Link'}
                        </Button>
                        <Box sx={{ textAlign: 'center' }}>
                            <Link component={RouterLink} to="/login" variant="body2">Back to Login</Link>
                        </Box>
                    </Box>
                </Box>
            </Paper>
        </Box>
    );
};

export default ForgotPassword;