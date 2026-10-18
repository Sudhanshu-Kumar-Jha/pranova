import bcrypt from 'bcryptjs';
import { Role, UserStatus } from '@prisma/client';
import { prisma } from '../utils/prisma.js';
import config from '../config/env.config.js';

/**
 * Automatically bootstraps and syncs the Super Admin user defined in .env
 * on every server startup.
 *
 * If the user does not exist, they are created with Role.ADMIN and UserStatus.ACTIVE.
 * If the user exists, their password hash and profile are updated so that any
 * changes in .env (e.g. ADMIN_PASSWORD, ADMIN_EMAIL) take effect immediately.
 */
export async function bootstrapSuperAdmin(): Promise<void> {
  const rawEmail = config.admin.email;
  const rawPassword = config.admin.password;
  const firstName = config.admin.firstName || 'Super';
  const lastName = config.admin.lastName || 'Admin';
  const department = config.admin.department || 'Operations';
  const rawPhone = config.admin.phone;

  if (!rawEmail || !rawPassword) {
    console.warn('[PRANOVA_BOOTSTRAP] ADMIN_EMAIL or ADMIN_PASSWORD missing from environment.');
    return;
  }

  const email = rawEmail.trim().toLowerCase();
  const password = rawPassword.trim();
  const phone = rawPhone ? rawPhone.trim() : null;

  try {
    const existingUser = await prisma.user.findUnique({
      where: { email },
      include: { adminProfile: true },
    });

    if (!existingUser) {
      // Check if phone number is already occupied by a different user
      let safePhone = phone;
      if (safePhone) {
        const phoneOwner = await prisma.user.findUnique({ where: { phone: safePhone } });
        if (phoneOwner) {
          console.warn(`[PRANOVA_BOOTSTRAP] Phone ${safePhone} already owned by user ${phoneOwner.id}; omitting phone on new admin.`);
          safePhone = null;
        }
      }

      const passwordHash = await bcrypt.hash(password, 12);
      await prisma.user.create({
        data: {
          email,
          phone: safePhone,
          passwordHash,
          role: Role.ADMIN,
          status: UserStatus.ACTIVE,
          isEmailVerified: true,
          adminProfile: {
            create: {
              firstName,
              lastName,
              department,
              mfaEnabled: false,
            },
          },
        },
      });
      console.log(`[PRANOVA_BOOTSTRAP] Created Super Admin from .env: ${email}`);
    } else {
      // User exists — ensure role and adminProfile without resetting existing password
      const needsRoleUpdate = existingUser.role !== Role.ADMIN || existingUser.status !== UserStatus.ACTIVE;
      const needsPasswordInit = !existingUser.passwordHash;

      let passwordUpdate: { passwordHash?: string } = {};
      if (needsPasswordInit) {
        passwordUpdate.passwordHash = await bcrypt.hash(password, 12);
      }

      // Update phone only if it is safe
      let updatePhoneData: { phone?: string | null } = {};
      if (phone && phone !== existingUser.phone) {
        const phoneOwner = await prisma.user.findUnique({ where: { phone } });
        if (!phoneOwner || phoneOwner.id === existingUser.id) {
          updatePhoneData.phone = phone;
        }
      }

      await prisma.user.update({
        where: { id: existingUser.id },
        data: {
          role: Role.ADMIN,
          status: UserStatus.ACTIVE,
          ...passwordUpdate,
          ...updatePhoneData,
          adminProfile: {
            upsert: {
              create: {
                firstName,
                lastName,
                department,
                mfaEnabled: false,
              },
              update: {
                firstName,
                lastName,
                department,
              },
            },
          },
        },
      });

      if (needsRoleUpdate || needsPasswordInit) {
        console.log(`[PRANOVA_BOOTSTRAP] Synced Super Admin profile for ${email}`);
      } else {
        console.log(`[PRANOVA_BOOTSTRAP] Super Admin account verified: ${email}`);
      }
    }
  } catch (error) {
    console.error('[PRANOVA_BOOTSTRAP] Failed to bootstrap super admin:', error);
  }
}

/**
 * Ensures baseline application branding settings exist.
 */
export async function bootstrapSettings(): Promise<void> {
  const defaultSettings: Record<string, string> = {
    app_name: 'PRANOVA',
    app_tagline: 'Operations console',
    app_logo: '',
    app_favicon: '',
    primary_color: '#0B6E6E',
    support_email: 'support@pranova.health',
  };

  try {
    for (const [key, value] of Object.entries(defaultSettings)) {
      await prisma.setting.upsert({
        where: { key },
        create: { key, value },
        update: {},
      });
    }
  } catch {
    // Non-fatal if schema is being initialized
  }
}
