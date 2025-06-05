const bcrypt = require('bcrypt');

const password = 'admin123'; // The plain text password we want to use
const saltRounds = 10;

bcrypt.hash(password, saltRounds).then(hash => {
    console.log('Password:', password);
    console.log('Hashed password:', hash);
});