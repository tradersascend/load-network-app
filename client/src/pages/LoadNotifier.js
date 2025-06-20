import React, { useState, useEffect } from 'react';
import { Box, Paper, Grid, Typography, TextField, Button, List, ListItem, ListItemText, IconButton, Divider, CircularProgress, Alert } from '@mui/material';
import { Delete } from '@mui/icons-material';
import alertService from '../services/alertService';

const LoadNotifier = () => {
    const [alerts, setAlerts] = useState([]);
    const [formData, setFormData] = useState({ origin: '', originRadius: '', destination: '', destinationRadius: '' });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const fetchAlerts = async () => {
        try {
            const { data } = await alertService.getAlerts();
            setAlerts(data);
        } catch (err) {
            setError('Failed to load saved alerts.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAlerts();
    }, []);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await alertService.createAlert(formData);
            setFormData({ origin: '', originRadius: '', destination: '', destinationRadius: '' });
            fetchAlerts();
        } catch (err) {
            alert('Failed to save alert. Please ensure all fields are filled out correctly.');
        }
    };

    const handleDelete = async (alertId) => {
        if (window.confirm('Are you sure you want to delete this alert?')) {
            try {
                await alertService.deleteAlert(alertId);
                fetchAlerts();
            } catch (err) {
                alert('Failed to delete alert.');
            }
        }
    };

    return (
        <Paper elevation={16} sx={{ p: { xs: 2, md: 4 }, borderRadius: '24px', border: 0, bgcolor: '#c7f3ff', flexGrow: 1 }}>
            <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold', color: '#005662' }}>
                Load Notifier
            </Typography>
            <Typography paragraph sx={{ color: 'text.secondary' }}>
                Create an alert, and we will notify you by email when a new load matching your criteria is posted.
            </Typography>

            <Paper component="form" onSubmit={handleSubmit} sx={{ p: 3, mb: 4, borderRadius: '16px' }}>
                <Typography variant="h6" gutterBottom>Create New Alert</Typography>
                <Grid container spacing={2}>
                    <Grid item xs={12} sm={8}>
                        <TextField fullWidth label="Origin (City or ZIP)" name="origin" value={formData.origin} onChange={handleChange} />
                    </Grid>
                    <Grid item xs={12} sm={4}>
                        <TextField fullWidth label="Origin Radius (mi)" name="originRadius" type="number" value={formData.originRadius} onChange={handleChange} />
                    </Grid>
                    <Grid item xs={12} sm={8}>
                        <TextField fullWidth label="Destination (City or ZIP)" name="destination" value={formData.destination} onChange={handleChange} />
                    </Grid>
                    <Grid item xs={12} sm={4}>
                        <TextField fullWidth label="Destination Radius (mi)" name="destinationRadius" type="number" value={formData.destinationRadius} onChange={handleChange} />
                    </Grid>
                    <Grid item xs={12}>
                        <Button type="submit" variant="contained">Save New Alert</Button>
                    </Grid>
                </Grid>
            </Paper>

            <Divider />

            <Box sx={{ mt: 3 }}>
                <Typography variant="h6" gutterBottom>Your Saved Alerts</Typography>
                {loading ? <CircularProgress /> : error ? <Alert severity="error">{error}</Alert> : (
                    <List>
                        {alerts.length > 0 ? alerts.map(alert => (
                            <ListItem
                                key={alert._id}
                                secondaryAction={
                                    <IconButton edge="end" onClick={() => handleDelete(alert._id)}>
                                        <Delete />
                                    </IconButton>
                                }
                                sx={{ bgcolor: 'rgba(255,255,255,0.7)', borderRadius: '8px', mb: 1 }}
                            >
                               <ListItemText
                                  primary={`From: ${alert.origin.text} (+${alert.originRadius} mi)`}
                                  secondary={`To: ${alert.destination.text} (+${alert.destinationRadius} mi)`}
                              />
                            </ListItem>
                        )) : <Typography>You have no saved alerts.</Typography>}
                    </List>
                )}
            </Box>
        </Paper>
    );
};

export default LoadNotifier;