const GREEN_STATES = [
    'TX', 'CA', 'IL', 'OH', 'GA', 'IN', 'NC', 'TN', 'PA', 'MI', 
    'NJ', 'NY', 'DE', 'CT', 'MA', 'MD', 'RI', 'WI', 'NH', 'VT'
];

const YELLOW_STATES = [
    'MO', 'SC', 'AL', 'KY', 'VA', 'AR', 'OK', 'MN', 'AZ', 'WV', 'MS', 'KS'
];

const RED_STATES = [
    'ME', 'ID', 'FL', 'MT', 'ND', 'SD', 'NE', 'WY', 'LA', 'IA', 
    'NV', 'UT', 'NM', 'WA', 'CO', 'OR'
];

const colors = {
  green: '#dcfce7',
  yellow: '#fef9c3',
  red: '#fee2e2', 
  greenText: '#166534',
  yellowText: '#854d0e',
  redText: '#991b1b',
};

// This function takes a state abbreviation (e.g., "TX") and returns the correct color codes
export const getStateColor = (state) => {
    const stateUpper = state?.toUpperCase();
    if (GREEN_STATES.includes(stateUpper)) {
        return { bg: colors.green, text: colors.greenText };
    }
    if (YELLOW_STATES.includes(stateUpper)) {
        return { bg: colors.yellow, text: colors.yellowText };
    }
    if (RED_STATES.includes(stateUpper)) {
        return { bg: colors.red, text: colors.redText };
    }
    // Return default/no color if the state is not in any list
    return { bg: 'transparent', text: 'inherit' };
};