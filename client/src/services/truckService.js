import axios from 'axios';

const API_URL = '/api/trucks/';

const getTrucks = () => axios.get(API_URL);
const addTruck = (truckData) => axios.post(API_URL, truckData);
const updateTruck = (id, truckData) => axios.put(API_URL + id, truckData);
const deleteTruck = (id) => axios.delete(API_URL + id);

const updateTruckStatus = (truckId, status) => {
  return axios.patch(API_URL + `${truckId}/status`, { status });
};

const truckService = {
  getTrucks,
  addTruck,
  updateTruck,
  deleteTruck,
  updateTruckStatus,
};

export default truckService;