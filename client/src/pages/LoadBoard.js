import React, { useState, useEffect } from 'react';
import {
  Box, Paper, Grid, TextField, Button, Typography,
  Dialog, DialogTitle, DialogContent, List, ListItem, ListItemButton, ListItemText, DialogActions,
  CircularProgress, Alert, Chip, Tooltip, Divider, IconButton, Select, MenuItem, FormControl, InputLabel
} from '@mui/material';
import { Delete } from '@mui/icons-material';
import { Edit } from '@mui/icons-material';
import { getStateColor } from '../utils/colorUtils';
import { Search, Truck, RotateCcw } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import loadService from '../services/loadService';
import truckService from '../services/truckService';
import templateService from '../services/templateService';
import mapsService from '../services/mapsService';

const columns = [
    { field: 'origin', headerName: 'Origin', flex: 1.5, align: 'center' },
    { field: 'destination', headerName: 'Destination', flex: 1.6, align: 'center' },
    { field: 'miles', headerName: 'Miles', flex: 0.7, align: 'center' },
    { field: 'truckType', headerName: 'Truck Type', flex: 1.2, align: 'center' },
    { field: 'weight', headerName: 'Weight', flex: 0.7, align: 'center' },
    { field: 'pieces', headerName: 'Pieces', flex: 0.7, align: 'center' },
    { field: 'pickupDate', headerName: 'PickUp Date/Time', flex: 1.3, align: 'center' },
    { field: 'deliveryDateTime', headerName: 'Delivery Date/Time', flex: 1.3, align: 'center' },
    { field: 'brokerName', headerName: 'Broker Name', flex: 1.2, align: 'center' },
    { field: 'deadhead', headerName: 'Deadhead', flex: 0.8, align: 'center' },
    { field: 'bid', headerName: 'Place Bid', flex: 1, align: 'center' }
];

const CustomTableHeader = ({ label, align = 'center' }) => (
    <Typography sx={{ fontWeight: 'bold', color: 'beige', fontSize: '0.875rem', letterSpacing: '0.5px', textTransform: 'uppercase', textAlign: align}}>
        {label}
    </Typography>
);

// --- List of email providers for the dropdown ---
const emailProviders = [
    { key: 'gmail', name: 'Gmail' },
    { key: 'outlook', name: 'Outlook / Hotmail' },
    { key: 'yahoo', name: 'Yahoo Mail' },
    { key: 'icloud', name: 'iCloud Mail' },
    { key: 'aol', name: 'AOL Mail' },
    { key: 'proton', name: 'ProtonMail' },
    { key: 'other', name: 'Other (Default App)' },
];

export default function LoadBoard() {
  const { user } = useAuth();
  
  const [truckDialogOpen, setTruckDialogOpen] = useState(false);
  const [myTrucks, setMyTrucks] = useState([]);
  const [selectedTruck, setSelectedTruck] = useState(null);
  const [loads, setLoads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [searchParams, setSearchParams] = useState({
    origin: '',
    originRadius: '',
    destination: '',
    destinationRadius: '',
    date: '',
  });

  const [bidModalOpen, setBidModalOpen] = useState(false);
  const [selectedLoad, setSelectedLoad] = useState(null);
  const [bidForm, setBidForm] = useState({ subject: '', message: ''});
  //const [bidLoading, setBidLoading] = useState(false);
  //const [bidMessage, setBidMessage] = useState({ type: '', text: '' });
  const [templatesModalOpen, setTemplatesModalOpen] = useState(false);
  const [templates, setTemplates] = useState([]);
  const [newTemplate, setNewTemplate] = useState({ title: '', message: '' });

  // --- State for the selected template name and email provider ---
  const [selectedTemplateName, setSelectedTemplateName] = useState('');
  const [selectedProvider, setSelectedProvider] = useState('gmail');
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [deadheadDistances, setDeadheadDistances] = useState({});
  const [editingLocations, setEditingLocations] = useState({});

  // ... (imports and component setup)

  const handleDeadheadCheck = async (load) => {
        if (!selectedTruck || !selectedTruck.currentLocation) {
            return alert('Please select a truck with a saved location (ZIP code) first.');
        }

        setLoading(true);
        try {
            const locationData = {
                truckZip: selectedTruck.currentLocation,
                loadOriginZip: load.origin.zip 
            };

            console.log("Sending deadhead calculation request:", locationData);

            const { data } = await mapsService.calculateDeadhead(locationData);

            setDeadheadDistances(prevDistances => ({
                ...prevDistances,
                [load._id]: data.distance,
            }));

        } catch (err) {
            const errorMessage = err.response?.data?.message || 'Could not calculate the distance. Please try again.';
            alert(`Could not calculate deadhead: ${errorMessage}`);
            console.error("Deadhead calculation error:", err);
        } finally {
            setLoading(false);
        }
    };

// ... (rest of the component)

  useEffect(() => {
    const initialFetch = async () => {
        setLoading(true);
        setError('');
        try {
            // --- Fetch trucks and loads in parallel ---
            const [trucksResponse, loadsResponse] = await Promise.all([
                truckService.getTrucks(),
                loadService.searchLoads()
            ]);

            // Handle trucks response
            if (trucksResponse && Array.isArray(trucksResponse.data)) {
                setMyTrucks(trucksResponse.data);
                if (trucksResponse.data.length > 0) {
                    setSelectedTruck(trucksResponse.data[0]);
                }
            }

            // Handle loads response
            if (loadsResponse && Array.isArray(loadsResponse.data)) {
                setLoads(loadsResponse.data);
                console.log(`Success: Frontend received ${loadsResponse.length} loads from the API.`);
            }

        } catch (err) {
            console.error("Data fetching error:", err);
            setError("Failed to load initial data. Please check the console for details.");
        } finally {
            setLoading(false);
        }
    };
    initialFetch();
}, []); // The empty dependency array is correct

  useEffect(() => {
    const intervalId = setInterval(() => {
        if (!bidModalOpen && !templatesModalOpen && !truckDialogOpen) {
            console.log('Auto-refreshing loads with current search params...');

            loadService.searchLoads(searchParams)
                .then(response => {
                    if (response && Array.isArray(response.data)) {
                        setLoads(response.data);
                    }
                })
                .catch(err => {
                    console.error('Auto-refresh failed:', err);
                });
        } else {
            console.log('Auto-refresh paused because a modal is open.');
        }
    }, 60000); // 60 seconds

    // Cleanup function to stop the timer when the component unmounts
    return () => clearInterval(intervalId);

    }, [searchParams, bidModalOpen, templatesModalOpen, truckDialogOpen]); // Dependency array

  const handleSelectTruck = (truck) => {
    setSelectedTruck(truck);
    setTruckDialogOpen(false);
  };

  const handleLocationChange = (truckId, newLocation) => {
    // This only allows 5 digits to be entered for the ZIP code
    if (/^\d{0,5}$/.test(newLocation)) {
        setEditingLocations(prev => ({
            ...prev,
            [truckId]: newLocation,
        }));
    }
};

const handleLocationSave = async (truckId) => {
    const newLocation = editingLocations[truckId];
    const truckToUpdate = myTrucks.find(t => t._id === truckId);

    if (!truckToUpdate) return;

    try {
        const { data } = await truckService.updateTruck(truckId, {
            ...truckToUpdate,
            currentLocation: newLocation,
        });

        setMyTrucks(myTrucks.map(t => (t._id === truckId ? data : t)));

        setEditingLocations(prev => {
            const newEdits = { ...prev };
            delete newEdits[truckId];
            return newEdits;
        });

    } catch (err) {
        alert('Failed to update truck location.');
        console.error("Location update error:", err);
    }
};

  const handleTruckStatusChange = async (truck, newStatus) => {
    try {
        const { data } = await truckService.updateTruckStatus(truck._id, newStatus);
        setMyTrucks(myTrucks.map(t => t._id === truck._id ? data : t));
    } catch (err) {
        console.error("Failed to update truck status from Load Board");
    }
};
  
  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === 'originRadius' || name === 'destinationRadius') {
        // This will find any character that is NOT a digit (0-9) and remove it.
        const numericValue = value.replace(/[^0-9]/g, '');
        setSearchParams({ ...searchParams, [name]: numericValue });
    } else {
        // This handles all other fields normally.
        setSearchParams({ ...searchParams, [name]: value });
    }
  };
  
  const handleSearch = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
        const apiParams = {
            origin: searchParams.origin,
            originRadius: searchParams.originRadius,
            destination: searchParams.destination,
            destinationRadius: searchParams.destinationRadius,
            date: searchParams.date,
        };
        const loadsResponse = await loadService.searchLoads(apiParams);
        setLoads(loadsResponse.data);
    } catch (err) {
        setError(err.response?.data?.message || 'Failed to search for loads.');
    } finally {
        setLoading(false);
    }
  };
  
  // --- Handler for the reset button ---
  const handleResetSearch = async () => {
    setLoading(true);
    setError('');
    const defaultParams = {
        origin: '',
        originRadius: '',
        destination: '',
        destinationRadius: '',
        date: '',
    };
    setSearchParams(defaultParams);
    try {
        const loadsResponse = await loadService.searchLoads(defaultParams);
        setLoads(loadsResponse.data);
    } catch (err) {
        setError(err.response?.data?.message || 'Failed to fetch loads.');
    } finally {
        setLoading(false);
    }
  };
  
  const handleOpenBidModal = (load) => {
    if (selectedTruck && selectedTruck.status !== 'Available') {
        alert(`Your selected truck (${selectedTruck.name}) is currently "${selectedTruck.status}" and cannot be used to place a bid. Please select an "Available" truck first.`);
        return;
    }
    setSelectedLoad(load);
    setBidForm({
      brokerEmail: load.brokerEmail || '',
      subject: `Inquiry on Load: ${load.origin.city} to ${load.destination.city}`,
      message: `Hello,\n\nPlease provide the rate and more information on this load.\n\nThank you,\n${user?.companyName || ''}`
    });
    setSelectedTemplateName('Default');
    setBidModalOpen(true);
  };

  const handleCloseBidModal = () => { setBidModalOpen(false); setSelectedLoad(null); };
  const handleBidFormChange = (e) => { setBidForm({ ...bidForm, [e.target.name]: e.target.value }); };
  
  const handleBidSubmit = () => { 
    const to = encodeURIComponent(bidForm.brokerEmail);
    const subject = encodeURIComponent(bidForm.subject);
    const body = encodeURIComponent(bidForm.message);
    let link = '';

    switch (selectedProvider) {
        case 'gmail':
            link = `https://mail.google.com/mail/?view=cm&fs=1&to=${to}&su=${subject}&body=${body}`;
            break;
        case 'outlook':
            link = `https://outlook.live.com/owa/?path=/mail/action/compose&to=${to}&subject=${subject}&body=${body}`;
            break;
        case 'yahoo':
            link = `https://mail.yahoo.com/?to=${to}&subject=${subject}&body=${body}`;
            break;
        case 'icloud':
             link = `https://www.icloud.com/mail/compose/new?to=${to}&subject=${subject}&body=${body}`;
             break;
        case 'aol':
            link = `https://mail.aol.com/webmail-std/en-us/compose?to=${to}&subject=${subject}&body=${body}`;
            break;
        case 'proton':
            link = `https://mail.proton.me/compose?to=${to}&subject=${subject}`;
            break;
        default: 
            link = `mailto:${to}?subject=${subject}&body=${body}`;
            break;
    }
    
    // Open the link in a new tab for web-based clients
    // The standard mailto link will be handled by the browser/OS
    window.open(link, '_blank');
    handleCloseBidModal(); // Close our pop-up after opening the email client
  };

  const handleOpenTemplatesModal = async () => {
    try {
        const { data } = await templateService.getTemplates();
        setTemplates(data);
        setTemplatesModalOpen(true);
    } catch (error) {
        alert('Failed to load templates.');
    }
  };

  const handleCloseTemplatesModal = () => {
    setTemplatesModalOpen(false);
    setNewTemplate({ title: '', message: '' });
  };

  const handleNewTemplateChange = (e) => {
    setNewTemplate({ ...newTemplate, [e.target.name]: e.target.value });
  };

  const handleTemplateSubmit = async (e) => {
    e.preventDefault();
    try {
        if (editingTemplate) {
            await templateService.updateTemplate(editingTemplate._id, newTemplate);
        } else {
            await templateService.createTemplate(newTemplate);
        }
        handleOpenTemplatesModal(); 
        setNewTemplate({ title: '', message: '' });
        setEditingTemplate(null);
    } catch (error) {
        alert('Failed to save template.');
    }
};

  const handleEditTemplate = (template) => {
    setEditingTemplate(template);
    setNewTemplate({ title: template.title, message: template.message });
};

  const handleDeleteTemplate = async (templateId) => {
    if (window.confirm('Are you sure you want to delete this template?')) {
        try {
            await templateService.deleteTemplate(templateId);
            setTemplates(templates.filter(t => t._id !== templateId));
        } catch (error) {
            alert('Failed to delete template.');
        }
    }
  };

  const handleUseTemplate = (template) => {
    setBidForm({ ...bidForm, message: template.message });
    setSelectedTemplateName(template.title); // Set the name for the dropdown
    handleCloseTemplatesModal();
};

  const navyBlue = '#000080';
  const tableHeaderBlue = '#dbeafe';
  const tableRowHoverBlue = '#bfdbfe';
  const tableRowBlue = '#eff6ff';
  const separatorColor = '2px solid #dbeafe';


  return (
    <Paper elevation={16} sx={{ p: { xs: 2, md: 4 }, borderRadius: '24px', border: 0, display: 'flex', flexDirection: 'column', flexGrow: 1, bgcolor: 'white' }}>
      
      <Box component="form" onSubmit={handleSearch}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, flexDirection: { xs: 'column', md: 'row' } }}>
          <Box sx={{ width: '100%', flex: 1, display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' , lg: '2fr 1fr 1fr 2fr 1fr' }, gap: 2, alignItems: 'center' }}>
            <TextField size="small" label="Origin (City or ZIP)" name="origin" value={searchParams.origin} onChange={handleChange} variant="outlined" InputLabelProps={{ shrink: true }} sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' }, bgcolor: 'white' }} />
            <TextField size="small" label="Radius (Origin)" name="originRadius" type="number" value={searchParams.originRadius} onChange={handleChange} variant="outlined" InputLabelProps={{ shrink: true }} sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' }, bgcolor: 'white' }} />
            <TextField size="small" type="date" label="Date" name="date" value={searchParams.date} onChange={handleChange} InputLabelProps={{ shrink: true }} variant="outlined" sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' }, bgcolor: 'white' }} />
            <TextField size="small" label="Destination (City or ZIP)" name="destination" value={searchParams.destination} onChange={handleChange} variant="outlined" InputLabelProps={{ shrink: true }} sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' }, bgcolor: 'white' }} />
            <TextField size="small" label="Radius (Destination)" name="destinationRadius" type="number" value={searchParams.destinationRadius} onChange={handleChange} variant="outlined" InputLabelProps={{ shrink: true }} sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' }, bgcolor: 'white' }} />
          </Box>
          <Button onClick={() => setTruckDialogOpen(true)} sx={{ width: { xs: '100%', md: 'auto' }, display: 'flex', gap: 1, bgcolor: tableHeaderBlue, color: '#1e40af', borderRadius: '16px', p: '8px 16px', textTransform: 'none', '&:hover': { bgcolor: '#bfdbfe' }, height: '40px' }}>
            <Truck size={20} />
            <Typography fontWeight="bold" fontSize="0.9rem">{selectedTruck ? selectedTruck.name : 'Select Truck'}</Typography>
          </Button>
        </Box>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', my: 2, gap: 2, flexDirection: { xs: 'column', sm: 'row' } }}>
          <Button type="submit" sx={{ bgcolor: navyBlue, color: 'white', borderRadius: '16px', px: 6, py: 1.5, fontSize: '1rem', textTransform: 'none', '&:hover': { bgcolor: '#00005c' }, boxShadow: 3 }}>
            <Search size={18} style={{ marginRight: '8px' }} />
            Find Loads ({(loads || []).length})
          </Button>
          <Button
            onClick={handleResetSearch}
            sx={{
              width: '250px',
              bgcolor: 'rgba(24, 28, 236, 0.88)',
              color: 'white',
              borderRadius: '16px',
              px: 6,
              py: 1.5,
              fontSize: '1rem',
              textTransform: 'none',
              '&:hover': { bgcolor: 'rgba(24, 28, 236, 0.65)' },
              boxShadow: 3
            }}
          >
            <RotateCcw size={18} style={{ marginRight: '8px' }} />
            Reset Search
          </Button>
        </Box>
      </Box>

      <Box sx={{ flexGrow: 1, overflowX: 'auto', borderRadius: '24px', border: '1px solid rgb(15, 76, 150)', bgcolor: tableRowBlue, display: 'flex', flexDirection: 'column' }}>
        <Box sx={{ minWidth: '1200px' }}>
            <Grid container sx={{ bgcolor: '#5585b5', borderBottom: '1px solid rgb(10, 63, 128)' }}>
                {columns.map((col, index) => ( 
                    <Grid item key={col.field} sx={{
                flex: col.flex,
                borderRight: index < columns.length - 1 ? 'none' : separatorColor,
                display: 'flex',
                alignItems: 'center',       // This centers the text vertically
                justifyContent: col.align,  // This centers the text horizontally
                py: 0, // Adds some consistent vertical padding
              }}>
 
                        <CustomTableHeader label={col.headerName} align={col.align} /> 
                    </Grid> 
                ))}
            </Grid>
            <Box sx={{ overflowY: 'auto', bgcolor: tableRowBlue }}>
                {loading ? ( <Box sx={{ p: 5, textAlign: 'center' }}><CircularProgress /></Box> ) : 
                 error ? ( <Box sx={{ p: 2 }}><Alert severity="error">{error}</Alert></Box> ) : 
                 loads.length > 0 ? (
                  loads.map((load)=> (
                      <Grid container key={load._id} alignItems="stretch" sx={{ bgcolor: tableRowBlue, '&:hover': { bgcolor: tableRowHoverBlue }, borderBottom:'1px solid rgb(15, 78, 160)', }}>
                          {columns.map((col, colIndex) => (
                              <Grid item key={col.field} sx={{ flex: col.flex, width: col.width, p: 1, py: 0.5, textAlign: col.align, display: 'flex', alignItems: 'center', justifyContent: col.align, borderRight: colIndex < columns.length - 1 ? separatorColor : 'none' }}>
                                {(() => {
                                    switch (col.field) {
                                        case 'origin': {
                                            const colors = getStateColor(load.origin.state);
                                            const originCell = (
                                                <Box component="span" sx={{ 
                                                    bgcolor: colors.bg, 
                                                    color: colors.text, 
                                                    px: 2, py: 0.5, borderRadius: '12px', 
                                                    fontSize: '0.8rem', fontWeight: 500 
                                                }}>
                                                    {load.origin.city}, {load.origin.state}, {load.origin.zip}
                                                </Box>
                                            );

                                            return (load.brokerNotes && load.brokerNotes.trim() !== '') ? (
                                                <Tooltip
                                                    title={load.brokerNotes}
                                                    arrow
                                                    placement="top"
                                                    componentsProps={{
                                                        tooltip: {
                                                            sx: {
                                                                color: 'black',
                                                                border: '1px solid black',
                                                                borderRadius: '8px',
                                                                bgcolor: 'beige',
                                                                fontSize: '0.875rem',
                                                                maxWidth: '400px', 
                                                            },
                                                        },
                                                        arrow: {
                                                            sx: {
                                                                color: 'common.black',
                                                            },
                                                        },
                                                    }}
                                                >
                                                    {originCell}
                                                </Tooltip>
                                            ) : (
                                                originCell
                                            );
                                        }   
                                        case 'destination': {
                                            const colors = getStateColor(load.destination.state);
                                            return (
                                                <Box component="span" sx={{ bgcolor: colors.bg, color: colors.text, px: 2, py: 0.5, borderRadius: '12px', fontSize: '0.8rem', fontWeight: 500 }}>
                                                    {load.destination.city}, {load.destination.state}, {load.destination.zip}
                                                </Box>
                                            );
                                        }
                                        case 'deadhead': {
                                            const distance = deadheadDistances[load._id];
                                            return distance ? (
                                                <Typography variant="body2" fontWeight="bold">{distance}</Typography>
                                            ) : (
                                                <Button size="small" variant="contained" onClick={() => handleDeadheadCheck(load)} sx={{ borderRadius: '12px', bgcolor: '#2563eb', '&:hover': { bgcolor: '#1d4ed8' }, p: '2px 10px' }}>
                                                    Check
                                                </Button>
                                            );
                                        }
                                        case 'bid': return <Button onClick={() => handleOpenBidModal(load)} size="small" variant="contained" sx={{ borderRadius: '12px', bgcolor: '#2563eb', '&:hover': { bgcolor: '#1d4ed8' }, p: '2px 10px' }}>Bid</Button>;
                                        case 'truckType': {
                                        // A load is "new" if it was created in the last 3 minutes (180,000 ms)
                                          const isNew = (new Date().getTime() - new Date(load.createdAt).getTime()) < 180000;
                                          return (
                                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                  <Typography variant="body2" fontSize="0.875rem">{load.truckType}</Typography>
                                                  {isNew && (
                                                      <Chip label="N"
                                                      size="small" sx={{ 
                                                      height: '17px', 
                                                      fontSize: '0.75rem',
                                                      fontWeight: 'bold',
                                                      backgroundColor: '#f57c00', 
                                                      color: 'white',
                                                    }} onClick={(e) => e.stopPropagation()}  />
                                                  )}
                                              </Box>
                                          );
                                        }
                                        default: return <Typography variant="body2" fontSize="0.875rem">{load[col.field] instanceof Date ? load[col.field].toLocaleString() : load[col.field]}</Typography>;
                                    }
                                })()}
                              </Grid>
                          ))}
                      </Grid>
                  ))
                ) : ( <Box sx={{ p: 5, textAlign: 'center' }}><Typography color="text.secondary">No loads to display.</Typography></Box> )}
            </Box>
        </Box>
      </Box>
      
     <Dialog 
        open={truckDialogOpen} 
        onClose={() => setTruckDialogOpen(false)}
        fullWidth={true}
        maxWidth={'md'} // Changed from 'sm' to 'md' for better mobile experience
        PaperProps={{
            sx: {
            borderRadius: '16px',
            bgcolor: tableRowBlue,
            minHeight: '400px',
            m: { xs: 1, sm: 2 }, // Add margins on mobile
            maxHeight: { xs: '90vh', sm: '80vh' }, // Prevent dialog from taking full height
            }
        }} >
        <DialogTitle sx={{ pb: 1 }}>
            <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#01579b' }}>
            Select Your Truck
            </Typography>
        </DialogTitle>
        <DialogContent sx={{ px: { xs: 1, sm: 3 } }}>
            <List sx={{ p: 0 }}>
            {myTrucks.map((truck, index) => (
                <ListItem
                key={truck._id}
                disablePadding
                sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'stretch',
                    borderRadius: '12px', 
                    my: 1, 
                    p: { xs: 1, sm: 2 },
                    backgroundColor: truck.status === 'Available' ? 'rgba(74, 222, 128, 0.45)' 
                                : truck.status === 'Covered' ? 'rgba(239, 68, 68, 0.45)' 
                                : truck.status === 'Out of Duty' ? 'rgba(250, 204, 21, 0.5)' 
                                : 'transparent',
                    border: '1px solid rgba(0,0,0,0.1)'
                }}>
                <ListItemButton
                    onClick={() => handleSelectTruck(truck)}
                    sx={{ 
                    py: { xs: 1, sm: 2 }, 
                    px: { xs: 1, sm: 2 },
                    borderRadius: '12px',
                    mb: 1
                    }}>
                    <ListItemText 
                    primary={
                        <Typography variant="subtitle1" sx={{ fontWeight: 'bold', fontSize: { xs: '1rem', sm: '1.1rem' } }}>
                        {index + 1}. {truck.name}
                        </Typography>
                    }
                    secondary={
                        <Typography variant="body2" sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>
                        {truck.truckType}
                        </Typography>
                    }/>
                </ListItemButton>
                <Box sx={{ 
                    display: 'flex', 
                    flexDirection: { xs: 'column', sm: 'row' },
                    gap: { xs: 2, sm: 1 },
                    alignItems: { xs: 'stretch', sm: 'center' },
                    px: { xs: 1, sm: 2 }
                }}>
                    <Box sx={{ 
                    display: 'flex', 
                    flexDirection: { xs: 'column', sm: 'row' },
                    alignItems: { xs: 'stretch', sm: 'center' },
                    gap: { xs: 1, sm: 2 },
                    p: { xs: 1.5, sm: 2 }, 
                    border: '0.5px solid black', 
                    borderRadius: '8px',
                    bgcolor: 'rgba(154, 206, 255, 0.8)',
                    flex: { xs: 'none', sm: 1 }}}>
                    <TextField
                        label="Current Location (ZIP)"
                        variant="outlined"
                        size="small"
                        value={editingLocations[truck._id] ?? truck.currentLocation}
                        onChange={(e) => handleLocationChange(truck._id, e.target.value)}
                        sx={{ 
                        bgcolor: 'white', 
                        borderRadius: '8px',
                        '& .MuiInputBase-input': {
                            fontSize: { xs: '0.875rem', sm: '1rem' }
                        }
                        }}
                        inputProps={{
                        maxLength: 5,
                        placeholder: "ZIP Code"}}/>
                    <Button 
                        onClick={() => handleLocationSave(truck._id)}
                        disabled={editingLocations[truck._id] === undefined}
                        variant="contained"
                        size="large"
                        sx={{ 
                        color: 'white',
                        bgcolor: navyBlue,
                        '&:hover': { bgcolor: '#00005c' },
                        '&:disabled': { bgcolor: 'rgba(0,0,0,0.12)' },
                        minWidth: { xs: '100%', sm: 'auto' },
                        py: { xs: 1, sm: 0.5 }
                        }}>
                        Save Location
                    </Button>
                    </Box>
                    <FormControl 
                    size="small" 
                    variant="outlined" 
                    sx={{ 
                        minWidth: { xs: '100%', sm: 150 },
                        bgcolor: 'white', 
                        borderRadius: '8px'
                    }}>
                    <InputLabel sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>
                        Status
                    </InputLabel>
                    <Select
                        value={truck.status}
                        onChange={(e) => handleTruckStatusChange(truck, e.target.value)}
                        label="Status"
                        sx={{
                        '& .MuiSelect-select': {
                            fontSize: { xs: '0.875rem', sm: '1rem' }
                        }
                        }}>
                        <MenuItem value="Available">
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Box sx={{ 
                            width: 8, 
                            height: 8, 
                            borderRadius: '50%', 
                            bgcolor: 'rgba(74, 222, 128, 1)' 
                            }} />
                            Available
                        </Box>
                        </MenuItem>
                        <MenuItem value="Covered">
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Box sx={{ 
                            width: 8, 
                            height: 8, 
                            borderRadius: '50%', 
                            bgcolor: 'rgba(239, 68, 68, 1)' 
                            }} />
                            Covered
                        </Box>
                        </MenuItem>
                        <MenuItem value="Out of Duty">
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Box sx={{ 
                            width: 8, 
                            height: 8, 
                            borderRadius: '50%', 
                            bgcolor: 'rgba(250, 204, 21, 1)' 
                            }} />
                            Out of Duty
                        </Box>
                        </MenuItem>
                    </Select>
                    </FormControl>
                </Box>
                </ListItem>
            ))}
            </List>
        </DialogContent>
        <DialogActions sx={{ 
            p: { xs: 2, sm: 3 }, 
            pt: { xs: 1, sm: 2 },
            justifyContent: 'center'
        }}>
            <Button 
            onClick={() => setTruckDialogOpen(false)} 
            variant="contained"
            sx={{
                bgcolor: '#00005c', 
                color: 'white',
                px: { xs: 4, sm: 6 },
                py: { xs: 1, sm: 1.5 },
                fontSize: { xs: '0.875rem', sm: '1rem' },
                '&:hover': { bgcolor: '#000040' }
            }}>
            Close
            </Button>
        </DialogActions>
        </Dialog>
      <Dialog open={bidModalOpen} onClose={handleCloseBidModal} fullWidth maxWidth="sm" PaperProps={{
            sx: {
                borderRadius: '16px',
                bgcolor: tableRowBlue,
                minHeight: '400px',}
        }}>
        <DialogTitle>
            <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#01579b' }}>
                Send Bid to {selectedLoad?.brokerName}
            </Typography>
        </DialogTitle>
        <DialogContent>
            <TextField label="To" name="brokerEmail" fullWidth value={bidForm.brokerEmail} onChange={handleBidFormChange} sx={{ mt: 1, mb: 2 }} variant="outlined" />
            <TextField label="From" fullWidth disabled value={user?.email || ''} sx={{ mb: 2 }} variant="outlined"/>
            <TextField label="Subject" name="subject" fullWidth value={bidForm.subject} onChange={handleBidFormChange} sx={{ mb: 2 }} variant="outlined"/>
            <TextField label="Message" name="message" fullWidth multiline rows={8} value={bidForm.message} onChange={handleBidFormChange} variant="outlined"/>
            
            <FormControl fullWidth sx={{ mt: 2 }}>
                <InputLabel>Select a Template</InputLabel>
                <Select
                    value={selectedTemplateName}
                    label="Select a Template"
                    onChange={(e) => {
                        const selectedTitle = e.target.value;
                        if (selectedTitle === 'Default') {
                            const defaultMessage = `Hello,\n\nPlease provide the rate and more information on this load.\n\nThank you,\n${user?.companyName || ''}`;
                            setBidForm({ ...bidForm, message: defaultMessage });
                            setSelectedTemplateName('Default');
                        } else {
                            const selectedTemplate = templates.find(t => t.title === selectedTitle);
                            if (selectedTemplate) {
                                handleUseTemplate(selectedTemplate);
                            }
                        }
                    }}>
                    <MenuItem value="Default">Default Template</MenuItem>
                    {templates.map(template => (
                        <MenuItem key={template._id} value={template.title}>{template.title}</MenuItem>
                    ))}
                </Select>
            </FormControl>
            <FormControl fullWidth sx={{ mt: 2 }}>
                <InputLabel>Email Provider</InputLabel>
                <Select
                    value={selectedProvider}
                    label="Email Provider"
                    onChange={(e) => setSelectedProvider(e.target.value)}>
                    {emailProviders.map(provider => (
                        <MenuItem key={provider.key} value={provider.key}>{provider.name}</MenuItem>
                    ))}
                </Select>
            </FormControl>
        </DialogContent>
        <DialogActions sx={{ p: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Button onClick={handleOpenTemplatesModal} variant="contained" 
                    sx={{ mt: 1, bgcolor: 'rgba(221, 181, 23, 0.5)', color: navyBlue, '&:hover': {bgcolor: 'rgba(250, 204, 21, 0.65)'} }}><strong>Templates</strong></Button>
            <Button onClick={handleBidSubmit} variant="contained" sx={{ bgcolor: navyBlue, '&:hover': {bgcolor: '#00005c'} }}><strong>
                Bid
            </strong></Button>
            <Button onClick={handleCloseBidModal} variant="contained" 
                    sx={{ mt: 1, bgcolor: 'rgba(239, 68, 68, 0.5)', color: navyBlue, '&:hover': {bgcolor: 'rgba(239, 68, 68, 0.65)'} }}><strong>Cancel</strong></Button>
        </DialogActions>
      </Dialog>
      {/* --- The Dialog for Managing Templates --- */}
      <Dialog open={templatesModalOpen} onClose={handleCloseTemplatesModal} fullWidth maxWidth="md" PaperProps={{
            sx: {
                borderRadius: '16px',
                bgcolor: tableRowBlue,
                minHeight: '400px',
            }
        }}>
          <DialogTitle>
              <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#01579b' }}>
                  Manage Bidding Templates
              </Typography>
          </DialogTitle>
          <DialogContent>
              <Typography variant="subtitle1" gutterBottom>Your Saved Templates</Typography>
              <List>
                  {templates.length > 0 ? templates.map(template => (
                      <ListItem
                          key={template._id}
                          secondaryAction={
                              <>
                                  <IconButton edge="end" sx={{ mr: 1 }} onClick={() => handleEditTemplate(template)}> 
                                      <Edit />
                                  </IconButton>
                                  <IconButton edge="end" onClick={() => handleDeleteTemplate(template._id)}>
                                      <Delete />
                                  </IconButton>
                              </>
                          }
                      >
                          <ListItemText primary={template.title} secondary={template.message} />
                      </ListItem>
                  )) : <Typography variant="body2" color="text.secondary">You have no saved templates.</Typography>}
              </List>

              <Divider sx={{ my: 3 }} />

              <Typography variant="subtitle1" gutterBottom>Create New Template</Typography>
              <Box component="form" onSubmit={handleTemplateSubmit}>
                  <TextField
                      label="Template Title"
                      name="title"
                      fullWidth
                      value={newTemplate.title}
                      onChange={handleNewTemplateChange}
                      margin="normal"
                  />
                  <TextField
                      label="Template Message"
                      name="message"
                      fullWidth
                      multiline
                      rows={4}
                      value={newTemplate.message}
                      onChange={handleNewTemplateChange}
                      margin="normal"
                  />
                  <Button 
                    type="submit" 
                    variant="contained" 
                    sx={{ mt: 1, bgcolor: navyBlue, '&:hover': {bgcolor: '#00005c'} }}
                  >
                    {editingTemplate ? 'Update Template' : 'Save New Template'}
                  </Button>
              </Box>
          </DialogContent>
          <DialogActions>
              <Button onClick={handleCloseTemplatesModal} sx={{bgcolor: 'rgba(239, 68, 68, 0.5)', color: navyBlue, '&:hover': {bgcolor: 'rgba(239, 68, 68, 0.65)'}}}><strong>Close</strong></Button>
          </DialogActions>
      </Dialog>
    </Paper>
  );
}
