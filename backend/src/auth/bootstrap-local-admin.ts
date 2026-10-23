import { Prisma, PrismaClient, UserRole } from '@haraka/database';
import { passwordSchema, kenyaPhoneSchema } from '@haraka/validation';
import type { StaffPortalRole } from '@haraka/shared-types';
import * as argon2 from 'argon2';
import fs from 'node:fs';
import path from 'node:path';
import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';

const STAFF_ROLES = [
  UserRole.ADMIN,
  UserRole.SUPER_ADMIN,
  UserRole.DISPATCHER,
  UserRole.SUPPORT,
  UserRole.FINANCE,
  UserRole.VERIFICATION_OFFICER,
];
const CONFIRMATION_FLAG = '--confirm-local-staff-bootstrap';
const CONFIRMATION_PHRASE = 'CREATE LOCAL STAFF';
const STAFF_BOOTSTRAP_LOCK_KEY = 742019;
const ROLE_CHOICES: Record<string, StaffPortalRole> = {
  1: 'ADMIN',
  2: 'SUPPORT',
  3: 'DISPATCHER',
  4: 'FINANCE',
  5: 'VERIFICATION_OFFICER',
};
const DATABASE_ROLE_BY_PORTAL_ROLE: Record<StaffPortalRole, UserRole> = {
  ADMIN: UserRole.ADMIN,
  SUPER_ADMIN: UserRole.SUPER_ADMIN,
  DISPATCHER: UserRole.DISPATCHER,
  SUPPORT: UserRole.SUPPORT,
  FINANCE: UserRole.FINANCE,
  VERIFICATION_OFFICER: UserRole.VERIFICATION_OFFICER,
};

class BootstrapError extends Error {}

interface LocalStaffInput {
  displayName: string;
  phone: string;
  role: StaffPortalRole;
  password: string;
}

export function isLoopbackPostgresUrl(databaseUrl: string): boolean {
  try {
    const url = new URL(databaseUrl);
    const hostname = url.hostname.replace(/^\[|\]$/g, '').toLowerCase();
    return (
      ['postgres:', 'postgresql:'].includes(url.protocol) &&
      ['localhost', '127.0.0.1', '::1'].includes(hostname)
    );
  } catch {
    return false;
  }
}

export function assertBootstrapAllowed(
  environment: NodeJS.ProcessEnv,
  args: string[],
): asserts environment is NodeJS.ProcessEnv & {
  DATABASE_URL: string;
  HARAKA_ALLOW_LOCAL_STAFF_BOOTSTRAP: '1';
  NODE_ENV: 'development';
} {
  if (environment.NODE_ENV !== 'development') {
    throw new BootstrapError('Local staff bootstrap is available only when NODE_ENV=development.');
  }
  if (environment.HARAKA_ALLOW_LOCAL_STAFF_BOOTSTRAP !== '1') {
    throw new BootstrapError('Set HARAKA_ALLOW_LOCAL_STAFF_BOOTSTRAP=1 for this command only.');
  }
  if (!args.includes(CONFIRMATION_FLAG)) {
    throw new BootstrapError(`Rerun with the explicit ${CONFIRMATION_FLAG} flag.`);
  }
  if (!environment.DATABASE_URL || !isLoopbackPostgresUrl(environment.DATABASE_URL)) {
    throw new BootstrapError(
      'DATABASE_URL must point to PostgreSQL on localhost or a loopback IP.',
    );
  }
}

function findRepositoryRoot(startDirectory: string): string {
  let current = path.resolve(startDirectory);
  for (let depth = 0; depth < 8; depth += 1) {
    if (fs.existsSync(path.join(current, 'pnpm-workspace.yaml'))) return current;
    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
  }
  throw new BootstrapError('Could not locate the Haraka workspace root.');
}

function loadLocalEnvironment(): void {
  const root = findRepositoryRoot(process.cwd());
  for (const envPath of [path.join(root, 'backend', '.env'), path.join(root, '.env')]) {
    if (fs.existsSync(envPath)) process.loadEnvFile(envPath);
  }
}

async function ask(question: string): Promise<string> {
  const terminal = createInterface({ input: stdin, output: stdout });
  try {
    return await terminal.question(question);
  } finally {
    terminal.close();
  }
}

function askHidden(question: string): Promise<string> {
  if (!stdin.isTTY || typeof stdin.setRawMode !== 'function') {
    throw new BootstrapError(
      'Run this command in an interactive terminal to enter the password safely.',
    );
  }

  return new Promise((resolve, reject) => {
    let value = '';
    stdout.write(question);
    stdin.setRawMode(true);
    stdin.resume();

    const cleanup = () => {
      stdin.off('data', onData);
      stdin.setRawMode(false);
      stdout.write('\n');
    };

    const onData = (chunk: Buffer | string) => {
      for (const character of chunk.toString()) {
        if (character === '\u0003' || character === '\u0004') {
          cleanup();
          reject(new BootstrapError('Password entry cancelled.'));
          return;
        }
        if (character === '\r' || character === '\n') {
          cleanup();
          resolve(value);
          return;
        }
        if (character === '\u007f' || character === '\b') {
          const characters = Array.from(value);
          if (characters.length > 0) {
            characters.pop();
            value = characters.join('');
            stdout.write('\b \b');
          }
        } else if (character >= ' ' && character !== '\u007f') {
          value += character;
          stdout.write('*');
        }
      }
    };

    stdin.on('data', onData);
  });
}

async function collectStaffInput(): Promise<LocalStaffInput[]> {
  const staff: LocalStaffInput[] = [];
  const seenPhones = new Set<string>();
  const seenPasswords = new Set<string>();
  let hasAdmin = false;

  console.log(
    'Create initial local staff accounts. Use one unique password per person; each staff member must enroll TOTP at first sign-in.',
  );
  console.log('Roles: 1 Administrator, 2 Support, 3 Dispatcher, 4 Finance, 5 Verification officer');

  while (staff.length < 10) {
    const displayName = (await ask(`\nStaff ${staff.length + 1} name (blank to finish): `)).trim();
    if (!displayName) break;
    if (displayName.length < 2 || displayName.length > 100) {
      throw new BootstrapError('Enter a name between 2 and 100 characters.');
    }

    const roleChoice = (await ask('Role number: ')).trim();
    const role = ROLE_CHOICES[roleChoice];
    if (!role) throw new BootstrapError('Choose a listed staff role.');
    if (role === 'ADMIN' && hasAdmin) {
      throw new BootstrapError('Only one initial Administrator may be created in this bootstrap.');
    }

    const phoneResult = kenyaPhoneSchema.safeParse(await ask('Kenyan phone number: '));
    if (!phoneResult.success) throw new BootstrapError('Enter a valid Kenyan phone number.');
    if (seenPhones.has(phoneResult.data)) {
      throw new BootstrapError('Each staff account must use a different phone number.');
    }

    const password = await askHidden(`Unique password for ${displayName} (input hidden): `);
    const passwordCheck = passwordSchema.safeParse(password);
    if (!passwordCheck.success || password.length < 12) {
      throw new BootstrapError('Use a non-common password between 12 and 128 characters.');
    }
    if (seenPasswords.has(password)) {
      throw new BootstrapError('Each staff account must use a different password.');
    }
    const confirmation = await askHidden('Confirm password: ');
    if (password !== confirmation) throw new BootstrapError('Passwords do not match.');

    staff.push({ displayName, phone: phoneResult.data, role, password });
    seenPhones.add(phoneResult.data);
    seenPasswords.add(password);
    if (role === 'ADMIN') hasAdmin = true;
  }

  if (staff.length === 0) throw new BootstrapError('No staff accounts were entered.');
  if (!hasAdmin) throw new BootstrapError('The initial local staff batch must include an ADMIN.');
  return staff;
}

async function createLocalStaff(): Promise<void> {
  loadLocalEnvironment();
  assertBootstrapAllowed(process.env, process.argv.slice(2));
  if (!stdin.isTTY || typeof stdin.setRawMode !== 'function') {
    throw new BootstrapError(
      'Run this command in an interactive terminal to enter the password safely.',
    );
  }

  const prisma = new PrismaClient();
  try {
    const existingStaffCount = await prisma.user.count({
      where: { roles: { hasSome: STAFF_ROLES } },
    });
    if (existingStaffCount > 0) {
      throw new BootstrapError(
        'Staff accounts already exist; this one-time bootstrap is disabled.',
      );
    }

    const staff = await collectStaffInput();

    const confirmationPhrase = await ask(
      `Type "${CONFIRMATION_PHRASE}" to create ${staff.length} local staff accounts: `,
    );
    if (confirmationPhrase !== CONFIRMATION_PHRASE) {
      throw new BootstrapError('Confirmation phrase did not match; no account was created.');
    }

    const preparedStaff = await Promise.all(
      staff.map(async (member) => ({
        displayName: member.displayName,
        phone: member.phone,
        role: member.role,
        passwordHash: await argon2.hash(member.password, { type: argon2.argon2id }),
      })),
    );
    for (const member of staff) member.password = '';

    await prisma.$transaction(
      async (transaction) => {
        await transaction.$executeRaw`SELECT pg_advisory_xact_lock(${STAFF_BOOTSTRAP_LOCK_KEY})`;
        const staffCount = await transaction.user.count({
          where: { roles: { hasSome: STAFF_ROLES } },
        });
        if (staffCount > 0) {
          throw new BootstrapError(
            'Staff accounts already exist; this one-time bootstrap is disabled.',
          );
        }

        const existingUsers = await transaction.user.findMany({
          where: { phone: { in: preparedStaff.map((member) => member.phone) } },
          select: { id: true },
        });
        if (existingUsers.length > 0) {
          throw new BootstrapError(
            'At least one phone number already belongs to an account; no roles were changed.',
          );
        }

        for (const member of preparedStaff) {
          const createdUser = await transaction.user.create({
            data: {
              phone: member.phone,
              displayName: member.displayName,
              passwordHash: member.passwordHash,
              roles: [DATABASE_ROLE_BY_PORTAL_ROLE[member.role]],
            },
            select: { id: true },
          });

          await transaction.auditLog.create({
            data: {
              actorRole: 'SYSTEM_BOOTSTRAP',
              subjectId: createdUser.id,
              subjectType: 'USER',
              action: 'ROLE_ASSIGN',
              resource: 'users',
              resourceId: createdUser.id,
              newValue: {
                roles: [member.role],
                source: 'local-cli',
                mfaRequired: true,
              },
              outcome: 'success',
            },
          });
        }
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted },
    );

    console.log(
      `Created ${preparedStaff.length} local staff accounts. Each staff member must sign in at /admin/login and enroll TOTP.`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  createLocalStaff().catch((error: unknown) => {
    if (error instanceof BootstrapError) {
      console.error(error.message);
    } else {
      console.error(
        'Local staff bootstrap failed. Verify database availability and schema status; no credentials were logged.',
      );
    }
    process.exitCode = 1;
  });
}
