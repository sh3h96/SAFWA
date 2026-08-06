const { User } = require('./models');
const bcrypt = require('bcrypt');

async function test() {
  const users = await User.findAll({ raw: true });
  console.log('All users:');
  console.log(users.map(u => ({ id: u.id, email: u.email, role: u.role, pass: u.password })));

  const admin = await User.findOne({ where: { email: 'admin@safwa.sa' } });
  console.log('Admin found?', !!admin);
  
  if (admin) {
    const isMatch = await bcrypt.compare('password123', admin.password);
    console.log('Password match?', isMatch);
  }
}

test().catch(console.error).finally(() => process.exit());
