import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import authService from '../services/authService';
import { Typography, TextField, Button, Box, Alert, CircularProgress, Paper } from '@mui/material';

const ResetPassword = () => {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { token } = useParams();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (password !== confirmPassword) {
            return setError('Passwords do not match.');
        }
        setLoading(true);
        setError('');
        setMessage('');
        try {
            const { data } = await authService.resetPassword(token, password);
            setMessage(data.message + " You will be redirected to login shortly.");
            setTimeout(() => navigate('/login'), 3000);
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
                    <Typography component="h1" variant="h5" sx={{ mb: 3 }}>Choose a New Password</Typography>
                    <Box component="form" onSubmit={handleSubmit} sx={{ width: '100%' }}>
                        {message && <Alert severity="success">{message}</Alert>}
                        {error && <Alert severity="error">{error}</Alert>}
                        <TextField margin="normal" required fullWidth label="New Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
                        <TextField margin="normal" required fullWidth label="Confirm New Password" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
                        <Button type="submit" fullWidth variant="contained" disabled={loading} sx={{ mt: 3, mb: 2, borderRadius: '12px' }}>
                            {loading ? <CircularProgress size={24} /> : 'Reset Password'}
                        </Button>
                    </Box>
                </Box>
            </Paper>
        </Box>
    );
};

export default ResetPassword;