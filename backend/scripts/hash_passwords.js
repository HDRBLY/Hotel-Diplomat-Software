const bcrypt = require('bcryptjs');

const passwords = {
  manager: 'HDRmanager123',
  accounts: 'HDRaccounts123',
  staff: 'HDRstaff123',
};

for (const [user, plain] of Object.entries(passwords)) {
  const hash = bcrypt.hashSync(plain, 10);
  console.log(`${user}:${hash}`);
}


