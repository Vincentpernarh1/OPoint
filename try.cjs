const bcrypt = require('bcrypt');
console.log(bcrypt.hashSync('tempass123', 10));