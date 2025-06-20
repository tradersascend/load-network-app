import axios from 'axios';

const API_URL = '/api/templates/';

const getTemplates = () => {
    return axios.get(API_URL);
};

const createTemplate = (templateData) => {
    return axios.post(API_URL, templateData);
};

const updateTemplate = (templateId, templateData) => {
    return axios.put(API_URL + templateId, templateData);
};

const deleteTemplate = (templateId) => {
    return axios.delete(API_URL + templateId);
};

const templateService = {
    getTemplates,
    createTemplate,
    deleteTemplate,
    updateTemplate,
};

export default templateService;