import "dotenv/config";

import {
  Pool
} from "pg";

import {
  PrismaPg
} from "@prisma/adapter-pg";

import {
  PrismaClient
} from "@prisma/client";

import bcrypt from "bcryptjs";

const connectionString =
  process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    "DATABASE_URL is missing from backend/.env"
  );
}

const pool = new Pool({
  connectionString
});

const adapter =
  new PrismaPg(pool);

const prisma =
  new PrismaClient({
    adapter
  });

async function main() {
  /*
   * Temporary development user.
   *
   * Register and Login APIs will replace
   * this temporary user later.
   */
  const developmentEmail =
    "dev@example.com";

  const developmentPassword =
    "ChangeMe@123";

  const passwordHash =
    await bcrypt.hash(
      developmentPassword,
      12
    );

  /*
   * Upsert prevents duplicate users when
   * the seed command is executed again.
   */
  const user =
    await prisma.user.upsert({
      where: {
        email:
          developmentEmail
      },

      update: {
        name:
          "Development User",

        passwordHash,

        isActive:
          true
      },

      create: {
        email:
          developmentEmail,

        name:
          "Development User",

        passwordHash,

        isActive:
          true
      }
    });

  console.log(
    `Development user ready: ${user.email}`
  );

  /*
   * Check whether the user already has
   * an email template.
   */
  const existingTemplate =
    await prisma.emailTemplate.findFirst({
      where: {
        userId:
          user.id
      }
    });

  if (!existingTemplate) {
    const template =
      await prisma.emailTemplate.create({
        data: {
          userId:
            user.id,

          subject:
            "Application for QA Automation Engineer Role",

          body: [
            "Hi,",
            "",
            "I wanted to share my profile for suitable QA Automation opportunities.",
            "",
            "Please find my resume attached for your reference.",
            "",
            "Thanks,",
            "Aniket Kanse"
          ].join("\n"),

          followUp1Body: [
            "Dear Sir/Madam,",
            "",
            "I wanted to follow up on my previous email regarding suitable opportunities.",
            "",
            "I remain interested and would appreciate any update regarding my profile.",
            "",
            "Thank you for your time and consideration.",
            "",
            "Best Regards,",
            "Aniket Kanse"
          ].join("\n"),

          followUp2Body: [
            "Dear Sir/Madam,",
            "",
            "I am writing one final follow-up regarding my earlier email.",
            "",
            "Please consider my profile if a suitable opportunity is available.",
            "",
            "Thank you for your time.",
            "",
            "Best Regards,",
            "Aniket Kanse"
          ].join("\n"),

          dailyLimit:
            100,

          followUp1DailyLimit:
            25,

          followUp2DailyLimit:
            15,

          minDelaySeconds:
            180,

          maxDelaySeconds:
            420,

          skipPersonalEmails:
            true,

          dryRun:
            true
        }
      });

    console.log(
      `Email template created: ${template.id}`
    );
  } else {
    console.log(
      `Email template already exists: ${existingTemplate.id}`
    );
  }

  console.log(
    "Database seed completed successfully"
  );
}

main()
  .then(async () => {
    await prisma.$disconnect();
    await pool.end();
  })
  .catch(async error => {
    console.error(
      "Database seed failed:",
      error
    );

    await prisma.$disconnect();
    await pool.end();

    process.exit(1);
  });