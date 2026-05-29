import { prisma } from '../src/lib/prisma';
import bcrypt from 'bcryptjs';

async function main() {
  const password = 'password123';
  const salt = await bcrypt.genSalt(12);
  const hash = await bcrypt.hash(password, salt);

  console.log('Updating password for tpadua...');
  await prisma.user.update({
    where: { username: 'tpadua' },
    data: { passwordHash: hash }
  });
  console.log('Password successfully reset to password123');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
