const Template = require('../models/Template');

// Get all templates for the currently logged-in user
const getTemplates = async (req, res) => {
    try {
        const templates = await Template.find({ user: req.user.id });
        res.status(200).json(templates);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

const createTemplate = async (req, res) => {
    try {
        const { title, message } = req.body;
        if (!title || !message) {
            return res.status(400).json({ message: 'Title and message are required.' });
        }
        const template = await Template.create({
            user: req.user.id,
            title,
            message,
        });
        res.status(201).json(template);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

const deleteTemplate = async (req, res) => {
    try {
        const template = await Template.findById(req.params.id);
        if (!template) {
            return res.status(404).json({ message: 'Template not found.' });
        }
        if (template.user.toString() !== req.user.id) {
            return res.status(401).json({ message: 'User not authorized.' });
        }
        await template.deleteOne();
        res.status(200).json({ id: req.params.id, message: 'Template deleted.' });
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

const updateTemplate = async (req, res) => {
    try {
        const { title, message } = req.body;
        const template = await Template.findById(req.params.id);

        if (!template) { return res.status(404).json({ message: 'Template not found.' }); }
        if (template.user.toString() !== req.user.id) { return res.status(401).json({ message: 'User not authorized.' }); }

        template.title = title || template.title;
        template.message = message || template.message;
        await template.save();
        res.status(200).json(template);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

module.exports = {
    getTemplates,
    createTemplate,
    deleteTemplate,
    updateTemplate,
};