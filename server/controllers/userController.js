const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const User = require('../models/User');
const Company = require('../models/Company');
const getTransporter = require('../config/email');

const TIER_TO_PRICE_ID_MAP = {
  tier1: 'price_1Rc6t1DtdAyQ8Lxf2LADaO93',
  tier2: 'price_1Rc6tMDtdAyQ8LxflRDDjNEb',
  tier3: 'price_1Rc6tkDtdAyQ8LxfW6GO2YSO',
};

const createCheckoutSession = async (req, res) => {
  const { companyName, tier } = req.body;
  if (!companyName || !tier) {
    return res.status(400).json({ message: 'Company name and subscription tier are required.' });
  }
  try {
    const onboardingToken = crypto.randomBytes(20).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(onboardingToken).digest('hex');

    const newCompany = new Company({
      companyName,
      'subscription.tier': tier,
      onboardingToken: hashedToken,
      onboardingExpires: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
    });
    await newCompany.save();
    
    const priceId = TIER_TO_PRICE_ID_MAP[tier];
    if (!priceId || priceId.includes('xxx')) {
      return res.status(400).json({ message: 'Invalid subscription tier configuration.' });
    }
    
    const successUrl = `${process.env.FRONTEND_URL}/welcome/${onboardingToken}?company_id=${newCompany._id}`;

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      metadata: { companyId: newCompany._id.toString() },
      success_url: successUrl,
      cancel_url: `${process.env.FRONTEND_URL}/register`,
    });
    res.status(200).json({ sessionId: session.id });
  } catch (error) {
    console.error('REGISTRATION ERROR:', error);
    res.status(500).json({ message: 'Server error during registration.' });
  }
};

const getOnboardingCompany = async (req, res) => {
    try {
        const hashedToken = crypto.createHash('sha256').update(req.params.token).digest('hex');
        const company = await Company.findOne({
            onboardingToken: hashedToken,
            onboardingExpires: { $gt: Date.now() }
        });
        if (!company) {
            return res.status(400).json({ message: 'This onboarding link is invalid or has expired.' });
        }
        res.status(200).json({
            companyName: company.companyName,
            accountId: company.accountId,
        });
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

// --- Creates the first Admin User ---
const createAdminUser = async (req, res) => {
    try {
        const { email, password } = req.body;
        const hashedToken = crypto.createHash('sha256').update(req.params.token).digest('hex');
        const company = await Company.findOne({
            onboardingToken: hashedToken,
            onboardingExpires: { $gt: Date.now() }
        });
        if (!company) { return res.status(400).json({ message: 'This onboarding link is invalid or has expired.' }); }
        if (company.users.length > 0) { return res.status(400).json({ message: 'An admin for this company has already been created.' }); }
        
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        const adminUser = new User({
            company: company._id,
            email,
            password: hashedPassword,
            role: 'admin',
        });
        
        company.users.push(adminUser._id);
        company.onboardingToken = undefined;
        company.onboardingExpires = undefined;

        await adminUser.save();
        await company.save();

        const token = jwt.sign({ id: adminUser._id, role: adminUser.role, company: adminUser.company }, process.env.JWT_SECRET, { expiresIn: '30d' });
        
        res.status(201).json({
            token,
            user: { id: adminUser._id, email: adminUser.email, role: adminUser.role, company: { companyName: company.companyName, accountId: company.accountId } }
        });
    } catch (error) {
        console.error("CREATE ADMIN ERROR:", error);
        res.status(500).json({ message: 'Server error while creating admin account.' });
    }
};

const verifyAccountId = async (req, res) => {
    try {
        const { accountId } = req.body;
        if (!accountId) { return res.status(400).json({ message: 'Account ID is required.' }); }
        const company = await Company.findOne({ accountId: { $regex: new RegExp(`^${accountId}$`, 'i') } });
        if (!company) { return res.status(404).json({ message: 'Account ID not found.' }); }
        res.status(200).json({ companyName: company.companyName, accountId: company.accountId });
    } catch (error) { res.status(500).json({ message: 'Server Error' }); }
};

const loginUser = async (req, res) => {
    try {
        const { accountId, email, password } = req.body;
        if (!accountId || !email || !password) { return res.status(400).json({ message: 'Account ID, email, and password are required.' });}
        const company = await Company.findOne({ accountId: { $regex: new RegExp(`^${accountId}$`, 'i') } });
        if (!company) { return res.status(401).json({ message: 'Invalid credentials.' }); }
        const user = await User.findOne({ email }).populate('company');
        if (!user) { return res.status(401).json({ message: 'Invalid credentials.' }); }
        if (user.company._id.toString() !== company._id.toString()) { return res.status(401).json({ message: 'This user does not belong to the specified company account.' }); }
        if (!(await bcrypt.compare(password, user.password))) { return res.status(401).json({ message: 'Invalid credentials.' }); }
        const token = jwt.sign({ id: user._id, role: user.role, companyId: user.company._id }, process.env.JWT_SECRET, { expiresIn: '30d' });
        res.status(200).json({ token, user: { id: user._id, email: user.email, role: user.role, company: { id: user.company._id, companyName: user.company.companyName, accountId: user.company.accountId } } });
    } catch (error) { console.error('Login Error:', error); res.status(500).json({ message: 'Server Error' }); }
};

const getMe = async (req, res) => {
    const user = await User.findById(req.user.id).populate('company');
    res.status(200).json(user);
};

const createUserByAdmin = async (req, res) => {
  if (req.user.role !== 'admin') { return res.status(403).json({ message: 'Not authorized. Admin role required.' }); }
  const { email, password } = req.body;
  if (!email || !password) { return res.status(400).json({ message: 'Email and password are required.' }); }
  try {
    const userExists = await User.findOne({ email });
    if (userExists) { return res.status(400).json({ message: 'A user with this email already exists.' }); }
    const company = await Company.findById(req.user.company);
    if (!company) { return res.status(404).json({ message: 'Admin\'s company not found.' }); }
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const newUser = new User({ company: company._id, email, password: hashedPassword, role: 'user' });
    company.users.push(newUser._id);
    await newUser.save();
    await company.save();
    res.status(201).json({ _id: newUser._id, email: newUser.email, role: newUser.role });
  } catch (error) { console.error('CREATE USER BY ADMIN ERROR:', error); res.status(500).json({ message: 'Server error while creating user.' }); }
};

const getCompanyUsers = async (req, res) => {
    if (req.user.role !== 'admin') { return res.status(403).json({ message: 'Not authorized. Admin role required.' }); }
    try {
        const company = await Company.findById(req.user.company).populate('users', '-password');
        if (!company) { return res.status(404).json({ message: 'Company not found.' }); }
        res.status(200).json(company.users);
    } catch (error) { res.status(500).json({ message: 'Server Error' }); }
};

const deleteUserByAdmin = async (req, res) => {
    if (req.user.role !== 'admin') { return res.status(403).json({ message: 'Not authorized. Admin role required.' }); }
    try {
        const userIdToDelete = req.params.userId;
        const userToDelete = await User.findById(userIdToDelete);
        if (!userToDelete) { return res.status(404).json({ message: 'User not found.' }); }
        if (userToDelete.company.toString() !== req.user.company.toString()) { return res.status(403).json({ message: 'User does not belong to this company.' }); }
        if (userToDelete._id.toString() === req.user.id.toString()) { return res.status(400).json({ message: 'Admin cannot delete their own account.' }); }
        await userToDelete.deleteOne();
        await Company.findByIdAndUpdate(req.user.company, { $pull: { users: userIdToDelete } });
        res.status(200).json({ message: 'User deleted successfully.' });
    } catch (error) { console.error("DELETE USER ERROR:", error); res.status(500).json({ message: 'Server Error' }); }
};

const updateUserByAdmin = async (req, res) => {
    // Security check: Only admins can perform this action
    if (req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Not authorized. Admin role required.' });
    }

    const { email, password } = req.body;
    const userIdToUpdate = req.params.userId;

    try {
        // First, find the user to ensure they belong to the admin's company
        const userToUpdate = await User.findById(userIdToUpdate);
        if (!userToUpdate) {
            return res.status(404).json({ message: 'User not found.' });
        }
        if (userToUpdate.company.toString() !== req.user.company._id.toString()) {
            return res.status(403).json({ message: 'User does not belong to this company.' });
        }

        // --- Build an update object with only the fields that are being changed ---
        const updateData = {};

        // If email is provided and is different from the current one, add it to the update object
        if (email && email !== userToUpdate.email) {
            const emailExists = await User.findOne({ email });
            if (emailExists) {
                return res.status(400).json({ message: 'This email is already in use by another account.' });
            }
            updateData.email = email;
        }

        // If a new password is provided, hash it and add it to the update object
        if (password) {
            const salt = await bcrypt.genSalt(10);
            updateData.password = await bcrypt.hash(password, salt);
        }

        // If there's nothing to update, send back a success message
        if (Object.keys(updateData).length === 0) {
            return res.status(200).json({ message: 'No changes were made.' });
        }

        await User.findByIdAndUpdate(userIdToUpdate, { $set: updateData });

        res.status(200).json({ message: 'User updated successfully.' });

    } catch (error) {
        console.error("UPDATE USER ERROR:", error);
        res.status(500).json({ message: 'Server Error during user update.' });
    }
};

const forgotPassword = async (req, res) => {
    try {
        const user = await User.findOne({ email: req.body.email });

        if (!user) {
            return res.status(200).json({ message: 'If an account with that email exists, a password reset link has been sent.' });
        }

        // Generate a random token
        const resetToken = crypto.randomBytes(20).toString('hex');

        // Hash the token and set it on the user model
        user.passwordResetToken = crypto
            .createHash('sha256')
            .update(resetToken)
            .digest('hex');

        // Set the expiration time (15 minutes)
        user.passwordResetExpires = Date.now() + 15 * 60 * 1000; 

        await user.save();

        const resetUrl = `<span class="math-inline">\{process\.env\.FRONTEND\_URL\}/reset\-password/</span>{resetToken}`;

        // Send the email
        const emailMessage = `<p>You are receiving this email because you (or someone else) have requested the reset of a password. Please click on the following link, or paste this into your browser to complete the process within 15 minutes of receiving it:</p><p><a href="<span class="math-inline">\{resetUrl\}"\></span>{resetUrl}</a></p>`;

        const transporter = await getTransporter();
        await transporter.sendMail({
            to: user.email,
            subject: 'Password Reset Request',
            html: emailMessage,
        });

        res.status(200).json({ message: 'A password reset link has been sent to your email.' });

    } catch (error) {
        console.error('FORGOT PASSWORD ERROR:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

const resetPassword = async (req, res) => {
    try {
        const hashedToken = crypto
            .createHash('sha256')
            .update(req.params.token)
            .digest('hex');

        // Find the user by the hashed token and check if it has not expired
        const user = await User.findOne({
            passwordResetToken: hashedToken,
            passwordResetExpires: { $gt: Date.now() },
        });

        if (!user) {
            return res.status(400).json({ message: 'Password reset token is invalid or has expired.' });
        }

        // Set the new password
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(req.body.password, salt);
        // Clear the reset token fields
        user.passwordResetToken = undefined;
        user.passwordResetExpires = undefined;

        await user.save();

        res.status(200).json({ message: 'Password has been reset successfully.' });

    } catch (error) {
        console.error('RESET PASSWORD ERROR:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

const recoverAccountId = async (req, res) => { res.status(501).json({ message: 'Not yet implemented' }); };
const updateUserProfile = async (req, res) => { res.status(501).json({ message: 'Not yet implemented' }); };
const changePassword = async (req, res) => { res.status(501).json({ message: 'Not yet implemented' }); };


module.exports = {
  createCheckoutSession,
  getOnboardingCompany,
  createAdminUser,
  verifyAccountId,
  loginUser,
  getMe,
  updateUserProfile,
  changePassword,
  forgotPassword,
  resetPassword,
  recoverAccountId,
  createUserByAdmin,
  getCompanyUsers,
  deleteUserByAdmin,
  updateUserByAdmin,
};