import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcrypt";

const BCRYPT_ROUNDS = 12;

const prisma = new PrismaClient();

async function main() {
  const email = (process.env.SEED_USER_EMAIL ?? "dev@fixlytics.local").toLowerCase();
  const password = process.env.SEED_USER_PASSWORD ?? "devpassword12";

  if (password.length < 8) {
    throw new Error("SEED_USER_PASSWORD must be at least 8 characters");
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

  const user = await prisma.user.upsert({
    where: { email },
    create: { email, passwordHash },
    update: { passwordHash },
  });

  console.log(`Seeded user: ${user.email} (${user.id})`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
