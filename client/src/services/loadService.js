import axios from 'axios';

const API_URL = '/api/loads/';

const searchLoads = async (params) => {
  const response = await axios.get(`${API_URL}search`, { params });
  return response.data;
};


const placeBid = async (loadId, bidData) => {
  const response = await axios.post(`${API_URL}${loadId}/bid`, bidData);
  return response.data;
};


const loadService = {
  searchLoads,
  placeBid,
};

export default loadService;