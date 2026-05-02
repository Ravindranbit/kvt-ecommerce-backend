const fs = require('fs');
const path = require('path');

const STATE_FILE = path.join(__dirname, 'product-reviews.json');

const DEFAULT_STATE = {
  reviewsByProduct: {},
};

const deepClone = (value) => JSON.parse(JSON.stringify(value));

const readState = () => {
  try {
    if (!fs.existsSync(STATE_FILE)) {
      return deepClone(DEFAULT_STATE);
    }

    const raw = fs.readFileSync(STATE_FILE, 'utf8');
    if (!raw.trim()) {
      return deepClone(DEFAULT_STATE);
    }

    const parsed = JSON.parse(raw);
    return {
      ...deepClone(DEFAULT_STATE),
      ...parsed,
      reviewsByProduct: parsed.reviewsByProduct || {},
    };
  } catch (error) {
    console.error('Failed to read review state file:', error);
    return deepClone(DEFAULT_STATE);
  }
};

const writeState = (state) => {
  const nextState = {
    ...deepClone(DEFAULT_STATE),
    ...state,
    reviewsByProduct: state.reviewsByProduct || {},
  };

  fs.writeFileSync(STATE_FILE, JSON.stringify(nextState, null, 2));
  return nextState;
};

const updateState = (updater) => {
  const current = readState();
  const next = typeof updater === 'function' ? updater(deepClone(current)) : updater;
  return writeState(next);
};

module.exports = {
  readState,
  writeState,
  updateState,
};
