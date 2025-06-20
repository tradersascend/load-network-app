import React, { useState } from 'react';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import authService from '../services/authService';
import {
  Typography, TextField, Button, Box, Alert,
  CircularProgress, Grid, Paper, Link, Card, CardContent,
  Divider, Chip, Stack
} from '@mui/material';
import { useStripe } from '@stripe/react-stripe-js';
import { CheckCircle } from '@mui/icons-material';
import logo from '../assets/logo5.png';

const Register = () => {
  const [formData, setFormData] = useState({
    companyName: '',
    tier: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const stripe = useStripe();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };
  
  const handleTierSelect = (selectedTier) => {
    setFormData({ ...formData, tier: selectedTier });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!stripe) {
      setError("Payment system is not ready. Please try again.");
      return;
    }
    if (!formData.companyName) {
        setError('Please enter a company name.');
        return;
    }
    if (!formData.tier) {
      setError('Please select a subscription plan.');
      return;
    }
    
    setLoading(true);
    setError('');

    try {
      const { data } = await authService.register(formData.companyName, formData.tier);
      
      if (data.sessionId) {
        const { error: stripeError } = await stripe.redirectToCheckout({
          sessionId: data.sessionId,
        });
        if (stripeError) {
          setError(stripeError.message);
        }
      } else {
        setError('Could not initialize payment session.');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed. Please try again.');
    }
    setLoading(false);
  };

  const plans = [
    {
      id: 'tier1',
      icon: '🔹',
      name: 'Essential Plan',
      subtitle: 'For Small Companies',
      price: '$99',
      period: 'MONTH',
      features: [
        '5000 Daily access',
        '1 user included',
        'Up to 2 trucks',
        '2 trucks/account',
        'Profitability Heatmap',
        'Deadhead Optimizer'
      ],
      bestFor: 'Independent owner-operators and small dispatch firms with limited fleets.',
      color: '#76D7F5'
    },
    {
      id: 'tier2',
      icon: '🔷',
      name: 'Pro Plan',
      subtitle: '',
      price: '$149',
      period: 'MONTH',
      features: [
        '12,000 Daily access',
        'Access to mobile app',
        'Up to 5 users',
        '10 trucks/user',
        '25 trucks/account',
        'Night Mode',
        'Deadhead Optimizer',
        'Load Alert',
        'Profitability Heatmap',
        'Access to exclusive VIP Trucking University Group & Trucking Market Insights'
      ],
      bestFor: 'Mid solo drivers to book on the go and mid-size companies.',
      color: '#4A90E2',
      popular: true
    },
    {
      id: 'tier3',
      icon: '🟦',
      name: 'Enterprise Plan',
      subtitle: '',
      price: '$35',
      period: 'USER/MONTH',
      features: [
        '15,000 Daily access',
        'Access to mobile app',
        'Unlimited users',
        '15 trucks/user',
        'Unlimited trucks/account',
        'Night Mode',
        'Deadhead Optimizer',
        'Load Alert',
        'Profitability Heatmap',
        'Dedicated support manager',
        'Access to exclusive VIP Trucking University Group & Trucking Market Insights'
      ],
      bestFor: 'Large operations with complex logistics, multiple dispatchers, and aggressive scaling goals.',
      color: '#2E7D95'
    }
  ];

  return (
    <Box sx={{ 
      minHeight: '100vh', 
      background: 'linear-gradient(to bottom right, #eff6ff, #dbeafe)', 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center', 
      p: 2,
      overflowX: 'hidden',
      width: '100%',
      boxSizing: 'border-box'
    }}>
      <Box sx={{ textAlign: 'center', mb: 3 }}>
        <img 
          src={logo} 
          alt="Load Network Logo" 
          style={{ height: '340px', marginBottom: '-50px', marginTop: '-280px' }} 
        />
      </Box>
      
      <Paper 
        elevation={16} 
        sx={{ 
          p: { xs: 3, md: 5 }, 
          borderRadius: '24px', 
          maxWidth: '1200px', 
          width: '100%',
          mx: 'auto'
        }}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <Typography component="h1" variant="h4" sx={{ mb: 1, fontWeight: 'bold', textAlign: 'center' }}>
            Create Your Company Account
          </Typography>
          <Typography variant="body1" sx={{ mb: 4, color: 'text.secondary', textAlign: 'center' }}>
            Choose the perfect plan for your trucking business
          </Typography>
          
          <Box component="form" onSubmit={handleSubmit} sx={{ width: '100%'}}>
            {error && (
              <Alert severity="error" sx={{ width: '100%', mb: 3, borderRadius: '12px' }}>
                {error}
              </Alert>
            )}
            
            <Box sx={{ display: 'flex', justifyContent: 'center', mb: 4 }}>
              <TextField 
                required 
                id="companyName" 
                label="Company Name" 
                name="companyName" 
                value={formData.companyName} 
                onChange={handleChange}
                sx={{ width: '400px', maxWidth: '100%' }}
              />
            </Box>
            
            <Typography variant="h5" sx={{ mb: 3, textAlign: 'center', fontWeight: 'bold' }}>
              Select Your Plan
            </Typography>
            
            <Box sx={{ 
              display: 'flex', 
              justifyContent: 'center', 
              gap: { xs: 2, md: 3 }, 
              mb: 4, 
              flexWrap: 'wrap',
              width: '100%',
              overflowX: 'hidden',
              pt: 2
            }}>
              {plans.map((plan) => (
                <Box key={plan.id} sx={{ 
                  position: 'relative', 
                  width: { xs: '100%', sm: '280px', md: '300px' }, 
                  maxWidth: { xs: '100%', sm: '320px' },
                  minWidth: 0,
                  flex: { xs: 'none', sm: '0 0 auto' }
                }}>
                  {plan.popular && (
                    <Chip
                      label="MOST POPULAR"
                      sx={{
                        position: 'absolute',
                        top: -12,
                        left: '50%',
                        transform: 'translateX(-50%)',
                        bgcolor: '#FF6B35',
                        color: 'white',
                        fontWeight: 'bold',
                        fontSize: '0.85rem',
                        zIndex: 10,
                        px: 2
                      }}
                    />
                  )}
                  <Card
                    sx={{
                      height: '660px',
                      border: formData.tier === plan.id ? `3px solid ${plan.color}` : '2px solid #e0e0e0',
                      borderRadius: '16px',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease',
                      '&:hover': {
                        boxShadow: '0 8px 25px rgba(0,0,0,0.15)',
                        transform: 'translateY(-2px)'
                      },
                      backgroundColor: formData.tier === plan.id ? `${plan.color}10` : 'white',
                      display: 'flex',
                      flexDirection: 'column'
                    }}
                    onClick={() => handleTierSelect(plan.id)}
                  >
                    <CardContent sx={{ p: 2.5, height: '100%', display: 'flex', flexDirection: 'column' }}>

                      <Box sx={{ textAlign: 'center', mb: 2 }}>
                        <Typography variant="h4" sx={{ mb: 1 }}>{plan.icon}</Typography>
                        <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 0.5, fontSize: '1.1rem' }}>
                          {plan.name}
                        </Typography>
                        {plan.subtitle && (
                          <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.85rem' }}>
                            {plan.subtitle}
                          </Typography>
                        )}
                      </Box>
                      
                      <Box sx={{ textAlign: 'center', mb: 2 }}>
                        <Typography variant="h4" sx={{ fontWeight: 'bold', color: plan.color }}>
                          {plan.price}
                        </Typography>
                        <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 'bold', fontSize: '0.8rem' }}>
                          / {plan.period}
                        </Typography>
                      </Box>
                      
                      <Button
                        fullWidth
                        variant={formData.tier === plan.id ? 'contained' : 'outlined'}
                        onClick={() => handleTierSelect(plan.id)}
                        sx={{
                          mb: 2,
                          py: 1,
                          fontWeight: 'bold',
                          borderRadius: '8px',
                          fontSize: '0.85rem',
                          bgcolor: formData.tier === plan.id ? plan.color : 'transparent',
                          borderColor: plan.color,
                          color: formData.tier === plan.id ? 'white' : plan.color,
                          '&:hover': {
                            bgcolor: formData.tier === plan.id ? plan.color : `${plan.color}15`,
                            borderColor: plan.color
                          }
                        }}
                      >
                        {formData.tier === plan.id ? 'SELECTED' : 'SELECT PLAN'}
                      </Button>
                      
                      <Divider sx={{ mb: 1.5 }} />
                      
                      <Stack spacing={0.8} sx={{ flexGrow: 1 }}>
                        {plan.features.map((feature, featureIndex) => (
                          <Box key={featureIndex} sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                            <CheckCircle sx={{ color: '#4CAF50', fontSize: 16, mt: 0.2, flexShrink: 0 }} />
                            <Typography variant="body2" sx={{ fontSize: '0.8rem', lineHeight: 1.3 }}>
                              {feature}
                            </Typography>
                          </Box>
                        ))}
                      </Stack>
                      
                      <Box sx={{ mt: 2, pt: 1.5, borderTop: '1px solid #e0e0e0' }}>
                        <Typography variant="body2" sx={{ color: 'text.secondary', fontStyle: 'italic', fontSize: '0.9rem', lineHeight: 1.4 }}>
                          <strong>Best for:</strong> {plan.bestFor}
                        </Typography>
                      </Box>
                    </CardContent>
                  </Card>
                </Box>
              ))}
            </Box>
            
            <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
              <Button
                type="submit"
                variant="contained"
                disabled={loading || !stripe}
                sx={{ 
                  py: 2, 
                  px: 6,
                  borderRadius: '12px', 
                  fontSize: '1.1rem',
                  fontWeight: 'bold',
                  bgcolor: '#000080', 
                  '&:hover': { bgcolor: '#00005c' }
                }}
              >
                {loading ? <CircularProgress size={24} color="inherit" /> : 'PROCEED TO PAYMENT'}
              </Button>
            </Box>
            
            <Box sx={{ textAlign: 'center' }}>
              <Link component={RouterLink} to="/login" variant="body2">
                Already have an account? Sign in
              </Link>
            </Box>
          </Box>
        </Box>
      </Paper>
    </Box>
  );
};

export default Register;