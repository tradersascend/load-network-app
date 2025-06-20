import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import truckService from '../services/truckService';
import userService from '../services/userService';
import axios from 'axios';
import {
  Box, Paper, Grid, TextField, Button, Typography, Tabs, Tab,
  CircularProgress, Alert, Dialog, DialogTitle, DialogContent,
  DialogActions, Divider, List, ListItem, ListItemText, FormControl, InputLabel, Select, MenuItem
} from '@mui/material';
import { Edit, Delete } from '@mui/icons-material';
import IconButton from '@mui/material/IconButton';

// --- ProfileSettings sub-component ---
const ProfileSettings = () => {
    const { user, login } = useAuth();
    const isAdmin = user && user.role === 'admin';

    const [profileData, setProfileData] = useState({ 
        companyName: user.company?.companyName || '',
        email: user.email || '' 
    });
    const [passwordData, setPasswordData] = useState({ oldPassword: '', newPassword: '' });
    const [profileMessage, setProfileMessage] = useState({ type: '', text: '' });
    const [passwordMessage, setPasswordMessage] = useState({ type: '', text: '' });

    const handleProfileChange = (e) => setProfileData({ ...profileData, [e.target.name]: e.target.value });
    const handlePasswordChange = (e) => setPasswordData({ ...passwordData, [e.target.name]: e.target.value });

    const handleProfileUpdate = async (e) => {
        e.preventDefault();
        setProfileMessage({ type: 'info', text: 'Profile update functionality is being developed.' });
    };

    const handleChangePassword = async (e) => {
        e.preventDefault();
        setPasswordMessage({ type: 'info', text: 'Password change functionality is being developed.' });
    };

    return (
        <Paper sx={{ p: 3, borderRadius: '16px', bgcolor: '#eff6ff' }}>
          <Typography variant="h6" gutterBottom>Company & User Profile</Typography>
          <Typography sx={{ mb: 2 }}>
            Account ID: <Box component="span" sx={{ fontWeight: 'bold' }}>{user.company?.accountId}</Box>
         </Typography>
          <Box component="form" onSubmit={handleProfileUpdate}>
            {profileMessage.text && <Alert severity={profileMessage.type} sx={{ my: 1, borderRadius: '12px' }}>{profileMessage.text}</Alert>}
            
            <TextField 
                fullWidth 
                label="Login Email" 
                name="email" 
                value={profileData.email} 
                onChange={handleProfileChange} 
                margin="normal" 
                disabled={!isAdmin} 
                helperText={!isAdmin ? "Only admins can change the login email." : ""}
            />

            <TextField 
                fullWidth 
                label="Company Name" 
                name="companyName" 
                value={profileData.companyName} 
                onChange={handleProfileChange} 
                margin="normal" 
                disabled={!isAdmin}
                helperText={!isAdmin ? "Only admins can change the company name." : ""}
            />
            
            {isAdmin && (
                <Button type="submit" variant="contained" sx={{ mt: 1, bgcolor: '#000080', '&:hover': { bgcolor: '#00005c' } }}>
                    Save Changes
                </Button>
            )}
          </Box>
          <Divider sx={{ my: 4 }} />
          <Typography variant="h6" gutterBottom>Change Your Password</Typography>
          <Box component="form" onSubmit={handleChangePassword}>
            {passwordMessage.text && <Alert severity={passwordMessage.type} sx={{ my: 1, borderRadius: '12px' }}>{passwordMessage.text}</Alert>}
            <TextField fullWidth label="Old Password" name="oldPassword" type="password" value={passwordData.oldPassword} onChange={handlePasswordChange} margin="normal" />
            <TextField fullWidth label="New Password" name="newPassword" type="password" value={passwordData.newPassword} onChange={handlePasswordChange} margin="normal" />
            <Button type="submit" variant="contained" sx={{ bgcolor: '#000080', '&:hover': { bgcolor: '#00005c' } }}>Change Password</Button>
          </Box>
        </Paper>
      );
};

// --- SubscriptionSettings sub-component ---
const SubscriptionSettings = () => {
    const { user } = useAuth();
    const isAdmin = user && user.role === 'admin';

    const handleManageBilling = async () => {
        try {
            const { data } = await axios.post('/api/stripe/create-portal-session');
            window.location.href = data.url;
        } catch (error) {
            console.error('Billing portal error:', error);
            const errorMessage = error.response?.data?.message || 'Could not open billing portal.';
            alert(`Error: ${errorMessage}`);
        }
    };

    return (
        <Paper sx={{ p: 3, borderRadius: '16px', bgcolor: '#eff6ff' }}>
            <Typography variant="h6" gutterBottom>Subscription Details</Typography>
            <Typography sx={{ mt: 2 }}>
                Current Plan: Tier {user.company?.subscription.tier.replace('tier', '')}
            </Typography>
            {isAdmin && (
                <>
                    <Typography>
                        Status: <Box component="span" sx={{ textTransform: 'capitalize', color: 'green', fontWeight: 'bold' }}>{user.company?.subscription.status}</Box>
                    </Typography>
                    <Button variant="contained" onClick={handleManageBilling} sx={{ mt: 2, bgcolor: '#000080', '&:hover': { bgcolor: '#00005c' } }}>
                        Manage Billing & Invoices
                    </Button>
                </>
            )}
        </Paper>
    );
};

// --- MyTrucks sub-component ---
const MyTrucks = () => {
    const [trucks, setTrucks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [open, setOpen] = useState(false);
    const [formData, setFormData] = useState({ name: '', unitNumber: '', truckType: '', currentLocation: '' });
    const [editingTruckId, setEditingTruckId] = useState(null);
  
    useEffect(() => {
      const fetchTrucks = async () => {
        try {
          const { data } = await truckService.getTrucks();
          setTrucks(data);
        } catch (err) { setError('Failed to fetch trucks.'); }
        finally { setLoading(false); }
      };
      fetchTrucks();
    }, []);
  
    const handleOpenAdd = () => { setEditingTruckId(null); setFormData({ name: '', unitNumber: '', truckType: '' }); setOpen(true); };
    const handleOpenEdit = (truck) => { setEditingTruckId(truck._id); setFormData({ name: truck.name, unitNumber: truck.unitNumber, truckType: truck.truckType }); setOpen(true); };
    const handleClose = () => setOpen(false);
    const handleFormChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });
  
    const handleFormSubmit = async () => {
      try {
        if (editingTruckId) {
          const { data } = await truckService.updateTruck(editingTruckId, formData);
          setTrucks(trucks.map(t => (t._id === editingTruckId ? data : t)));
        } else {
          const { data } = await truckService.addTruck(formData);
          setTrucks([...trucks, data]);
        }
        handleClose();
      } catch (err) { setError(editingTruckId ? 'Failed to update truck.' : 'Failed to add truck.'); }
    };

    const handleDeleteTruck = async (truckId) => {
      if (window.confirm('Are you sure you want to delete this truck?')) {
        try {
          await truckService.deleteTruck(truckId);
          setTrucks(trucks.filter((truck) => truck._id !== truckId));
        } catch (err) { setError('Failed to delete truck.'); }
      }
    };

    const handleStatusChange = async (truck, newStatus) => {
      try {
          const { data } = await truckService.updateTruckStatus(truck._id, newStatus);
          setTrucks(trucks.map(t => t._id === truck._id ? data : t));
      } catch (err) {
          setError('Failed to update truck status.');
      }
    };

    const statusColors = {
    Available: '#dcfce7',     // A light green
    Covered: '#fee2e2',       // A light red
    'Out of Duty': '#fef9c3', // A light yellow
    };
  
    if (loading) return <CircularProgress />;
  
    return (
        <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h5">My Truck Fleet</Typography>
                <Button variant="contained" onClick={handleOpenAdd} sx={{ bgcolor: '#000080', '&:hover': { bgcolor: '#00005c' } }}>Add New Truck</Button>
            </Box>
            {error && <Alert severity="error" sx={{mb: 2}}>{error}</Alert>}
            <Grid container spacing={3}>
                {trucks.length > 0 ? trucks.map((truck, index) => (
                    <Grid item key={truck._id} xs={12}>
                         <Paper elevation={2} sx={{ 
                            p: 3, 
                            borderRadius: '16px', 
                            position: 'relative',
                            backgroundColor: statusColors[truck.status] || '#eff6ff' 
                        }}>
                            <Box sx={{ position: 'absolute', top: 6, right: 6}}>
                                <IconButton size="small" onClick={() => handleOpenEdit(truck)}><Edit /></IconButton>
                                <IconButton size="small" onClick={() => handleDeleteTruck(truck._id)}><Delete /></IconButton>
                            </Box>
                            <Typography variant="h6" fontWeight="bold">{index + 1}. {truck.name}</Typography>
                            <Typography color="text.secondary">Unit: {truck.unitNumber}</Typography>
                            <Typography color="text.secondary">{truck.truckType}</Typography>
                            <Typography color="text.secondary">Current Location: {truck.currentLocation || 'N/A'}</Typography>

                            <FormControl size="small" variant="outlined" sx={{ mt: 2, minWidth: 150, bgcolor: '#eff6ff', borderRadius: '16px' }}>
                                <InputLabel>Status</InputLabel>
                                <Select
                                    value={truck.status}
                                    onChange={(e) => handleStatusChange(truck, e.target.value)}
                                    label="Status"
                                >
                                    <MenuItem value="Available">Available</MenuItem>
                                    <MenuItem value="Covered">Covered</MenuItem>
                                    <MenuItem value="Out of Duty">Out of Duty</MenuItem>
                                </Select>
                            </FormControl>
                        </Paper>
                    </Grid>
                )) : <Grid item xs={12}><Typography>You haven't added any trucks yet.</Typography></Grid>}
            </Grid>
            <Dialog 
                open={open} 
                onClose={handleClose} 
                fullWidth={true} 
                maxWidth={'sm'}
                PaperProps={{
                    sx: { borderRadius: '16px', bgcolor: '#eff6ff' }
                }}
            >
                <DialogTitle>{editingTruckId ? 'Edit Truck' : 'Add a New Truck'}</DialogTitle>
                <DialogContent>
                    <TextField autoFocus margin="dense" name="name" label="Truck Name (e.g. My Blue Volvo)" type="text" fullWidth variant="outlined" value={formData.name} onChange={handleFormChange} />
                    <TextField margin="dense" name="unitNumber" label="Unit Number" type="text" fullWidth variant="outlined" value={formData.unitNumber} onChange={handleFormChange} />
                    <TextField margin="dense" name="truckType" label="Truck Type" type="text" fullWidth variant="outlined" value={formData.truckType} onChange={handleFormChange} />
                    <TextField margin="dense" name="currentLocation" label="Current Location (ZIP Code)" type="text" fullWidth variant="outlined" value={formData.currentLocation} onChange={handleFormChange} />
                </DialogContent>
                <DialogActions><Button onClick={handleClose} sx={{bgcolor: '#00005c', color: 'white'}}>Cancel</Button><Button onClick={handleFormSubmit} sx={{bgcolor: '#00005c', color: 'white'}}>{editingTruckId ? 'Save Changes' : 'Add Truck'}</Button></DialogActions>
            </Dialog>
        </Box>
    );
};

// --- UserManagement sub-component ---
const UserManagement = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [formState, setFormState] = useState({ email: '', password: '' });
    const [formMessage, setFormMessage] = useState({ type: '', text: '' });
    const [formLoading, setFormLoading] = useState(false);
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [editFormData, setEditFormData] = useState({ email: '', password: '' });

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const { data } = await userService.getCompanyUsers();
            setUsers(data);
        } catch (err) {
            setError('Failed to load users.');
        } finally {
            setLoading(false);
        }
    };
    
    useEffect(() => {
        fetchUsers();
    }, []);

    const handleChange = (e) => setFormState({ ...formState, [e.target.name]: e.target.value });

    const handleSubmit = async (e) => {
        e.preventDefault();
        setFormLoading(true);
        setFormMessage({ type: '', text: '' });
        try {
            const { data } = await userService.createUser(formState);
            setFormMessage({ type: 'success', text: `Successfully created user: ${data.email}` });
            setFormState({ email: '', password: '' });
            fetchUsers();
        } catch (err) {
            setFormMessage({ type: 'error', text: err.response?.data?.message || 'Failed to create user.' });
        } finally {
            setFormLoading(false);
        }
    };

    const handleDeleteUser = async (userId) => {
        if (window.confirm('Are you sure you want to permanently delete this user?')) {
            try {
                await userService.deleteUser(userId);
                fetchUsers();
            } catch (err) {
                setFormMessage({ type: 'error', text: err.response?.data?.message || 'Failed to delete user.' });
            }
        }
    };

    const handleOpenEditModal = (user) => {
    setEditingUser(user);
    setEditFormData({ email: user.email, password: '' }); // Pre-fill with existing email
    setEditModalOpen(true);
    };

    const handleCloseEditModal = () => {
        setEditModalOpen(false);
        setEditingUser(null);
        setEditFormData({ email: '', password: '' });
    };

    const handleEditFormChange = (e) => {
        setEditFormData({ ...editFormData, [e.target.name]: e.target.value });
    };

    const handleUpdateUser = async (e) => {
        e.preventDefault();
        try {
            const updates = {};
            if (editFormData.email) updates.email = editFormData.email;
            if (editFormData.password) updates.password = editFormData.password;

            await userService.updateUser(editingUser._id, updates);
            fetchUsers(); // Refresh the list
            handleCloseEditModal();
        } catch (err) {
            const message = err.response?.data?.message || 'An unknown error occurred while updating the user.';
            alert(`Error: ${message}`);
        }
    };

    return (
        <Paper sx={{ p: 3, borderRadius: '16px', bgcolor: '#eff6ff' }}>
            <Typography variant="h6" gutterBottom>Create New User</Typography>
            <Box component="form" onSubmit={handleSubmit} sx={{ mb: 4 }}>
                {formMessage.text && <Alert severity={formMessage.type} sx={{ my: 1, borderRadius: '12px' }}>{formMessage.text}</Alert>}
                <TextField fullWidth label="New User Email" name="email" type="email" value={formState.email} onChange={handleChange} margin="normal" />
                <TextField fullWidth label="Temporary Password" name="password" type="password" value={formState.password} onChange={handleChange} margin="normal" />
                <Button type="submit" variant="contained" disabled={formLoading} sx={{ mt: 2, bgcolor: '#000080', '&:hover': { bgcolor: '#00005c' } }}>
                    {formLoading ? <CircularProgress size={24} /> : 'Create User'}
                </Button>
            </Box>
            <Divider />
            <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>Manage Existing Users</Typography>
            {loading ? <CircularProgress /> : error ? <Alert severity="error">{error}</Alert> : (
                <List>
                    {users.map(user => (
                        <ListItem key={user._id} secondaryAction={
                            <>
                                <IconButton edge="end" sx={{ mr: 1 }} aria-label="edit" onClick={() => handleOpenEditModal(user)}>
                                    <Edit />
                                </IconButton>
                                <IconButton edge="end" aria-label="delete" onClick={() => handleDeleteUser(user._id)}>
                                    <Delete />
                                </IconButton>
                            </>
                        }>
                            <ListItemText primary={user.email} secondary={`Role: ${user.role}`} />
                        </ListItem>
                    ))}
                </List>
            )}

            <Dialog open={editModalOpen} onClose={handleCloseEditModal}>
                <DialogTitle>Edit User: {editingUser?.email}</DialogTitle>
                <DialogContent>
                    <Box component="form" id="editUserForm" onSubmit={handleUpdateUser} sx={{ pt: 1 }}>
                        <TextField
                            margin="dense"
                            label="New Email Address"
                            type="email"
                            fullWidth
                            variant="outlined"
                            name="email"
                            value={editFormData.email}
                            onChange={handleEditFormChange}
                        />
                        <TextField
                            margin="dense"
                            label="New Password (optional)"
                            type="password"
                            fullWidth
                            variant="outlined"
                            name="password"
                            placeholder="Leave blank to keep unchanged"
                            value={editFormData.password}
                            onChange={handleEditFormChange}
                        />
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseEditModal}>Cancel</Button>
                    <Button type="submit" form="editUserForm" variant="contained">Save Changes</Button>
                </DialogActions>
            </Dialog>
        </Paper>
    );
};

// --- Main Account Page Component ---
const Account = () => {
  const { user } = useAuth();
  const [currentTab, setCurrentTab] = useState(0);
  const handleTabChange = (event, newValue) => setCurrentTab(newValue);
  const isAdmin = user && user.role === 'admin';

  return (
    <Paper elevation={16} sx={{ p: { xs: 2, md: 4 }, borderRadius: '24px', border: 0, bgcolor: '#c7f3ff', flexGrow: 1 }}>
      <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold', color: '#005662' }}>
        Account & Settings
      </Typography>
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs
            value={currentTab}
            onChange={handleTabChange}
            variant="scrollable"
            scrollButtons
            allowScrollButtonsMobile
            aria-label="account settings tabs"
            sx={{
                '& .MuiTabs-scroller': {
                '::-webkit-scrollbar': {
                    display: 'none',
                },
                scrollbarWidth: 'none',
                '-ms-overflow-style': 'none',
                },
            }}
        >
         <Tab label="Profile" />
         <Tab label="My Trucks" />
         <Tab label="Subscription" />
         {isAdmin && <Tab label="User Management" />}
        </Tabs>
      </Box>
      <Box sx={{ mt: 3 }}>
        {currentTab === 0 && <ProfileSettings />}
        {currentTab === 1 && <MyTrucks />}
        {currentTab === 2 && <SubscriptionSettings />}
        {currentTab === 3 && isAdmin && <UserManagement />}
      </Box>
    </Paper>
  );
};
export default Account;