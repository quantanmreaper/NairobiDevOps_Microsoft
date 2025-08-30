const _ = require('lodash');

// Performance issue: Inefficient array operations
function processLargeArray(items) {
  let result = [];
  for (let i = 0; i < items.length; i++) {
    for (let j = 0; j < items.length; j++) {
      if (items[i].id === items[j].parentId) {
        result.push(items[i]);
      }
    }
  }
  return result;
}

// Security issue: eval usage
function executeUserCode(code) {
  return eval(code);
}

// Maintainability issue: Deeply nested code
function validateUser(user) {
  if (user) {
    if (user.name) {
      if (user.name.length > 0) {
        if (user.email) {
          if (user.email.includes('@')) {
            if (user.age) {
              if (user.age > 0) {
                if (user.age < 120) {
                  return true;
                }
              }
            }
          }
        }
      }
    }
  }
  return false;
}

module.exports = {
  processLargeArray,
  executeUserCode,
  validateUser
};