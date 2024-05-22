//using bcrypt library for hashing password
const bcrypt = require('bcrypt');

//hashing the password and add salt
const hashPassword = async (password) => {
  const saltRounds = 10;
  return await bcrypt.hash(password, saltRounds);
};

//compare the hashed password with input password
const comparePassword = async (password, hash) => {
  return await bcrypt.compare(password, hash);
};

//exports hashPassword and comparePassword from utils.js
module.exports = { hashPassword, comparePassword };