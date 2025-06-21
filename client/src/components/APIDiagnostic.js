import React, { useState, useEffect } from 'react';
import { Box, Typography, Button, Alert } from '@mui/material';
import authService from '../services/authService';
import userService from '../services/userService';

const APIDiagnostic = () => {
  const [results, setResults] = useState({});
  const [testing, setTesting] = useState(false);

  const tests = [
    {
      name: 'API Base URL',
      test: () => {
        const apiUrl = process.env.REACT_APP_API_URL || 'https://load-network-api.onrender.com';
        return Promise.resolve({ status: 'info', message: `Using API URL: ${apiUrl}` });
      }
    },
    {
      name: 'Authentication Status',
      test: () => {
        const isAuth = authService.isAuthenticated();
        const token = authService.getCurrentToken();
        return Promise.resolve({ 
          status: isAuth ? 'success' : 'warning', 
          message: `Authenticated: ${isAuth}, Token: ${token ? 'Present' : 'Missing'}` 
        });
      }
    },
    {
      name: 'API Health Check',
      test: async () => {
        try {
          const response = await fetch(`${process.env.REACT_APP_API_URL || 'https://load-network-api.onrender.com'}/health`);
          return { 
            status: response.ok ? 'success' : 'error', 
            message: `API Health: ${response.status} ${response.statusText}` 
          };
        } catch (error) {
          return { status: 'error', message: `API Health Check Failed: ${error.message}` };
        }
      }
    },
    {
      name: 'Protected Route Test',
      test: async () => {
        try {
          if (!authService.isAuthenticated()) {
            return { status: 'warning', message: 'Cannot test - not authenticated' };
          }
          const response = await userService.getCompanyUsers();
          return { status: 'success', message: 'Protected route accessible' };
        } catch (error) {
          return { 
            status: 'error', 
            message: `Protected route failed: ${error.response?.data?.message || error.message}` 
          };
        }
      }
    }
  ];

  const runTests = async () => {
    setTesting(true);
    const newResults = {};
    
    for (const test of tests) {
      try {
        const result = await test.test();
        newResults[test.name] = result;
      } catch (error) {
        newResults[test.name] = { status: 'error', message: error.message };
      }
    }
    
    setResults(newResults);
    setTesting(false);
  };

  const getAlertSeverity = (status) => {
    switch (status) {
      case 'success': return 'success';
      case 'warning': return 'warning';
      case 'error': return 'error';
      default: return 'info';
    }
  };

  return (
    <Box sx={{ p: 3, maxWidth: 800, margin: 'auto' }}>
      <Typography variant="h4" gutterBottom>
        API Diagnostic Tool
      </Typography>
      
      <Button 
        variant="contained" 
        onClick={runTests} 
        disabled={testing}
        sx={{ mb: 3 }}
      >
        {testing ? 'Running Tests...' : 'Run Diagnostic Tests'}
      </Button>

      {Object.entries(results).map(([testName, result]) => (
        <Alert 
          key={testName} 
          severity={getAlertSeverity(result.status)} 
          sx={{ mb: 2 }}
        >
          <Typography variant="subtitle2">{testName}</Typography>
          <Typography variant="body2">{result.message}</Typography>
        </Alert>
      ))}
    </Box>
  );
};

export default APIDiagnostic;