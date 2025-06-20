import React, { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { AppBar, Toolbar, Typography, Button, Box, Menu, MenuItem, IconButton, Divider } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import logo from '../assets/logo3.png'; 

const Layout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [anchorEl, setAnchorEl] = useState(null);
  const isMenuOpen = Boolean(anchorEl);

  const handleMenuOpen = (event) => {
      setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
      setAnchorEl(null);
  };

  
  const handleNavigate = (path) => {
      navigate(path);
      handleMenuClose();
  };

  const handleLogout = () => { logout(); navigate('/login'); };


  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: 'linear-gradient(to bottom right, #eff6ff, #dbeafe)' }}>
      <AppBar position="static">
        <Toolbar sx={{ minHeight: '48px !important' }}>
          <Box onClick={() => navigate('/')} sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
            <img src={logo} alt="Load Network Logo" style={{ height: '38px', marginRight: '10px' }} />
          </Box>
          <Box sx={{ flexGrow: 1 }} />
          {user && (
            <Box>
                <IconButton
                    size="Large"
                    edge="end"
                    color="inherit"
                    aria-label="menu"
                    onClick={handleMenuOpen}
                >
                    <MenuIcon />
                </IconButton>
                <Menu
                    anchorEl={anchorEl}
                    open={isMenuOpen}
                    onClose={handleMenuClose}
                    anchorOrigin={{
                        vertical: 'top',
                        horizontal: 'right',
                    }}
                    transformOrigin={{
                        vertical: 'top',
                        horizontal: 'right',
                    }}
                    PaperProps={{
                        sx: {
                          overflow: 'visible',
                          filter: 'drop-shadow(0px 2px 8px rgba(0,0,0,0.32))',
                          mt: 4.5,
                          bgcolor: '#c7f3ff',
                          borderRadius: '16px',
                          border: '1px solid #005662',
                          '& .MuiMenuItem-root': {
                            '&:hover': {
                              backgroundColor: 'rgba(0, 0, 128, 0.1)',
                            },
                          },
                        },
                    }}
                >
                    
                    {!location.pathname.includes('/account') && <MenuItem onClick={() => handleNavigate('/account')}>Account</MenuItem>}
                    {!location.pathname.includes('/load-board')  && <MenuItem onClick={() => handleNavigate('/load-board')}>Load Board</MenuItem>}
                    {!location.pathname.includes('/load-notifier')  &&<MenuItem onClick={() => handleNavigate('/load-notifier')}>Load Notifier</MenuItem>}
                    {!location.pathname.includes('/faq') && <MenuItem onClick={() => handleNavigate('/faq')}>F.A.Q.</MenuItem>}
                    {!location.pathname.includes('/contact') && <MenuItem onClick={() => handleNavigate('/contact')}>Contact Us</MenuItem>}
                    <Divider />
                    <MenuItem onClick={handleLogout}>Logout</MenuItem>
                </Menu>
            </Box>
          )}
        </Toolbar>
      </AppBar>
      <Box component="main" sx={{ flexGrow: 1, p: { xs: 2, md: 3 }, display: 'flex', flexDirection: 'column' }}>
        <Outlet />
      </Box>
    </Box>
  );
};
export default Layout;