const mongoose = require('mongoose');
const { customAlphabet } = require('nanoid');
const Schema = mongoose.Schema;

const nanoid = customAlphabet('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', 4);

const companySchema = new Schema({
    companyName: {
        type: String,
        required: true,
    },
    accountId: {
        type: String,
        required: true,
        unique: true,
        default: () => `ACME-${nanoid()}`,
    },
    subscription: {
        tier: {
            type: String,
            enum: ['none', 'tier1', 'tier2', 'tier3'],
            default: 'none',
        },
        status: {
            type: String,
            default: 'inactive',
        },
        stripeCustomerId: String,
    },
    users: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    onboardingToken: {
        type: String,
    },
    onboardingExpires: {
        type: Date,
    },
}, {
    timestamps: true,
});

module.exports = mongoose.model('Company', companySchema);