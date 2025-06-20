import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import authService from '../services/authService';
import { Box, Paper, Typography, TextField, Button, Alert, CircularProgress, Grid } from '@mui/material';
import logo from '../assets/logo5.png'; 

const Onboarding = () => {
    const { token } = useParams(); 
    const navigate = useNavigate();
    const { login } = useAuth(); 

    const [companyInfo, setCompanyInfo] = useState(null);
    const [formData, setFormData] = useState({ email: '', password: '', password2: '' });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [formLoading, setFormLoading] = useState(false);

    useEffect(() => {
        const verifyTokenAndFetchCompany = async () => {
            if (!token) {
                setError('No onboarding token provided.');
                setLoading(false);
                return;
            }
            try {
                const { data } = await authService.getOnboardingCompany(token);
                setCompanyInfo(data);
            } catch (err) {
                setError(err.response?.data?.message || 'Invalid or expired link.');
            } finally {
                setLoading(false);
            }
        };
        verifyTokenAndFetchCompany();
    }, [token]);

    const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (formData.password !== formData.password2) {
            return setError('Passwords do not match.');
        }
        setFormLoading(true);
        setError('');
        try {
            const { data } = await authService.createAdminUser(token, { email: formData.email, password: formData.password });
            login(data); 
            navigate('/');
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to create account.');
        } finally {
            setFormLoading(false);
        }
    };

    if (loading) {
        return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 5 }}><CircularProgress /></Box>;
    }

    return (
        <Box sx={{ minHeight: '100vh', background: 'linear-gradient(to bottom right, #eff6ff, #dbeafe)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', p: 2 }}>
            <img src={logo} alt="Load Network Logo" style={{ height: '340px', marginBottom: '-50px', marginTop: '-120px' }} />
            <Paper elevation={16} sx={{ p: { xs: 3, md: 5 }, borderRadius: '24px', maxWidth: '500px', width: '100%' }}>
                {error ? (
                    <Alert severity="error">{error}</Alert>
                ) : (
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <Typography component="h1" variant="h5" sx={{ mb: 2 }}>Welcome to Load Network, {companyInfo?.companyName}!</Typography>
                        <Alert severity="success" sx={{ width: '100%', mb: 2, borderRadius: '12px' }}>
                            <Typography>Your subscription is active! Your unique Account ID is:</Typography>
                            <Typography sx={{ fontWeight: 'bold', fontSize: '1.2rem', textAlign: 'center', my: 1, userSelect: 'all' }}>{companyInfo?.accountId}</Typography>
                            <Typography>Please save this ID in a safe place. Your employees will need it to log in.</Typography>
                        </Alert>
                        <Typography variant="h6" sx={{ my: 2 }}>Create Your Admin Account</Typography>
                        <Box component="form" onSubmit={handleSubmit} sx={{ width: '100%' }}>
                            <Grid container spacing={2}>
                                <Grid item xs={12}>
                                    <TextField required fullWidth label="Your Email Address" name="email" type="email" value={formData.email} onChange={handleChange} />
                                </Grid>
                                <Grid item xs={12}>
                                    <TextField required fullWidth label="Your Password" name="password" type="password" value={formData.password} onChange={handleChange} />
                                </Grid>
                                <Grid item xs={12}>
                                    <TextField required fullWidth label="Confirm Password" name="password2" type="password" value={formData.password2} onChange={handleChange} />
                                </Grid>
                            </Grid>
                            <Button type="submit" fullWidth variant="contained" disabled={formLoading} sx={{ mt: 3, borderRadius: '12px', py: 1.5, bgcolor: '#000080' }}>
                                {formLoading ? <CircularProgress size={24} color="inherit" /> : 'Create Admin Account & Login'}
                            </Button>
                        </Box>
                    </Box>
                )}
            </Paper>
        </Box>
    );
};

export default Onboarding;