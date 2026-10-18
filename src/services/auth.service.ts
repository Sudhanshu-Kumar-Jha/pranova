import bcrypt from 'bcryptjs';
import { Role, UserStatus } from '@prisma/client';
import { prisma } from '../utils/prisma.js';
import { ApiError } from '../utils/apiError.js';
import { JwtUtils } from '../utils/jwt.js';
import {
  AdminLoginInput,
  AdminRegisterInput,
  SendOtpInput,
  VerifyOtpInput,
} from '../validators/auth.validator.js';

export class AuthService {
  /**
   * Admin Login: Email + Password + JWT
   */
  static async adminLogin(input: AdminLoginInput) {
    const { email, password } = input;

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: {
        adminProfile: true,
      },
    });

    if (!user || user.role !== Role.ADMIN) {
      throw ApiError.unauthorized('Invalid email or password');
    }

    if (user.status !== UserStatus.ACTIVE) {
      throw ApiError.forbidden(`Account is ${user.status.toLowerCase()}. Please contact system administration.`);
    }

    if (!user.passwordHash) {
      throw ApiError.unauthorized('Password authentication not configured for this administrator');
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      throw ApiError.unauthorized('Invalid email or password');
    }

    const tokens = JwtUtils.generateTokens({
      userId: user.id,
      role: user.role,
      email: user.email,
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        firstName: user.adminProfile?.firstName,
        lastName: user.adminProfile?.lastName,
        department: user.adminProfile?.department,
        mfaEnabled: user.adminProfile?.mfaEnabled,
      },
      tokens,
    };
  }

  /**
   * Admin Registration (Used for bootstrap and admin user creation)
   */
  static async adminRegister(input: AdminRegisterInput) {
    const { email, password, firstName, lastName, department } = input;
    const normalizedEmail = email.toLowerCase();

    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      throw ApiError.conflict('An account with this email address already exists');
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const newUser = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: normalizedEmail,
          passwordHash,
          role: Role.ADMIN,
          status: UserStatus.ACTIVE,
          isEmailVerified: true,
        },
      });

      const adminProfile = await tx.adminProfile.create({
        data: {
          userId: user.id,
          firstName,
          lastName,
          department,
        },
      });

      return { ...user, adminProfile };
    });

    const tokens = JwtUtils.generateTokens({
      userId: newUser.id,
      role: newUser.role,
      email: newUser.email,
    });

    return {
      user: {
        id: newUser.id,
        email: newUser.email,
        role: newUser.role,
        firstName: newUser.adminProfile.firstName,
        lastName: newUser.adminProfile.lastName,
        department: newUser.adminProfile.department,
      },
      tokens,
    };
  }

  /**
   * Send OTP for Patient or Care Manager mobile authentication
   * (Mocked: Always uses '123456')
   */
  static async sendOtp(input: SendOtpInput) {
    const { phone, role, purpose = 'LOGIN' } = input;
    const cleanPhone = phone.replace(/[\s-]/g, '').trim();

    const digits = cleanPhone.replace(/\D/g, '');
    const last10 = digits.length >= 10 ? digits.slice(-10) : digits;
    const phoneCandidates = [
      cleanPhone,
      `+91${last10}`,
      last10,
      `0${last10}`,
    ];

    // Care managers CANNOT self-register. They must be onboarded by an administrator.
    if (role === Role.CARE_MANAGER) {
      const existingCm = await prisma.user.findFirst({
        where: {
          phone: { in: phoneCandidates },
          role: Role.CARE_MANAGER,
        },
        include: { careManagerProfile: true },
      });

      if (!existingCm || !existingCm.careManagerProfile) {
        throw ApiError.notFound('No registered Care Manager account found for this mobile number. Care managers must be onboarded by an administrator in the Admin Console.');
      }

      if (existingCm.status === UserStatus.SUSPENDED || existingCm.status === UserStatus.INACTIVE) {
        throw ApiError.forbidden('This care manager account is inactive. Please contact your PRANOVA administrator.');
      }
    }

    // Patients: If logging in, account MUST already exist. If registering, account must NOT already exist.
    if (role === Role.PATIENT) {
      const existingPatient = await prisma.user.findFirst({
        where: {
          phone: { in: phoneCandidates },
          role: Role.PATIENT,
        },
        include: { patientProfile: true },
      });

      if (purpose === 'LOGIN') {
        if (!existingPatient) {
          throw ApiError.notFound('Mobile number not registered. Please create an account first.');
        }

        if (existingPatient.status === UserStatus.SUSPENDED || existingPatient.status === UserStatus.INACTIVE) {
          throw ApiError.forbidden('This patient account is inactive. Please contact customer support.');
        }
      } else if (purpose === 'REGISTER') {
        if (existingPatient) {
          throw ApiError.conflict('Mobile number is already registered. Please sign in instead.');
        }
      }
    }

    // Healthcare Pilot: OTP is mocked to accept '123456'
    // In production, dispatch via Twilio / Kaleyra / AWS SNS
    return {
      phone: cleanPhone,
      role,
      purpose,
      mockOtp: '123456',
      expiresInSeconds: 300,
      message: 'OTP has been dispatched successfully. Use 123456 for testing.',
    };
  }

  /**
   * Verify OTP & Issue JWT (Auto-registers patient if first time with registration details; rejects unknown care managers)
   */
  static async verifyOtp(input: VerifyOtpInput) {
    const {
      phone,
      otp,
      role,
      purpose = 'LOGIN',
      firstName,
      lastName,
      email,
      primaryAddress,
      city,
      state,
      pincode,
      gender,
      bloodGroup,
      emergencyContactName,
      emergencyContactPhone,
    } = input;

    // Hard constraint: Mock OTP strictly accepts '123456'
    if (otp !== '123456') {
      throw ApiError.badRequest('Invalid OTP entered. Please provide valid 6-digit OTP');
    }

    const cleanPhone = phone.replace(/[\s-]/g, '').trim();
    const digits = cleanPhone.replace(/\D/g, '');
    const last10 = digits.length >= 10 ? digits.slice(-10) : digits;
    const phoneCandidates = [
      cleanPhone,
      `+91${last10}`,
      last10,
      `0${last10}`,
    ];

    const userWhere: any = {
      phone: { in: phoneCandidates },
    };
    if (role) {
      userWhere.role = role as Role;
    }

    let user = await prisma.user.findFirst({
      where: userWhere,
      include: {
        patientProfile: true,
        careManagerProfile: true,
      },
    });

    // Care managers MUST be created by an administrator in the console
    if (role === Role.CARE_MANAGER) {
      if (!user || user.role !== Role.CARE_MANAGER || !user.careManagerProfile) {
        throw ApiError.unauthorized('No active Care Manager account found for this mobile number. Care managers must be created by an administrator in the Admin Console.');
      }
      if (user.status === UserStatus.SUSPENDED || user.status === UserStatus.INACTIVE) {
        throw ApiError.forbidden('This care manager account has been deactivated. Please contact your PRANOVA administrator.');
      }
    }

    if (!user) {
      // If user attempted to LOGIN without existing account, strictly reject
      if (purpose === 'LOGIN' || (!firstName && !lastName)) {
        throw ApiError.notFound('Mobile number not registered. Please create an account first.');
      }

      // Provision patient user & patient profile (public self-registration for patients only)
      user = await prisma.$transaction(async (tx) => {
        const createdUser = await tx.user.create({
          data: {
            phone: cleanPhone.startsWith('+91') ? cleanPhone : `+91${last10}`,
            email: email ? email.toLowerCase() : null,
            role: Role.PATIENT,
            status: UserStatus.ACTIVE,
            isPhoneVerified: true,
          },
        });

        await tx.patientProfile.create({
          data: {
            userId: createdUser.id,
            firstName: firstName || 'Patient',
            lastName: lastName || 'User',
            primaryAddress: primaryAddress || null,
            city: city || null,
            state: state || null,
            pincode: pincode || null,
            gender: gender || null,
            bloodGroup: bloodGroup || null,
            emergencyContactName: emergencyContactName || null,
            emergencyContactPhone: emergencyContactPhone || null,
          },
        });

        return tx.user.findUniqueOrThrow({
          where: { id: createdUser.id },
          include: {
            patientProfile: true,
            careManagerProfile: true,
          },
        });
      });
    } else {
      const activeUser = user;
      // User exists - check role constraint
      if (activeUser.role !== role) {
        throw ApiError.forbidden(
          `This phone number is registered as '${activeUser.role}', cannot sign in as '${role}'`
        );
      }

      if (activeUser.status !== UserStatus.ACTIVE) {
        throw ApiError.forbidden(`Account is ${activeUser.status.toLowerCase()}. Access denied.`);
      }

      if (!activeUser.isPhoneVerified) {
        await prisma.user.update({
          where: { id: activeUser.id },
          data: { isPhoneVerified: true },
        });
      }

      // Update customer profile with any freshly provided registration/e-commerce details
      if (role === Role.PATIENT && (firstName || lastName || email || primaryAddress || city || pincode || gender || bloodGroup)) {
        await prisma.$transaction(async (tx) => {
          if (email && !activeUser.email) {
            await tx.user.update({
              where: { id: activeUser.id },
              data: { email: email.toLowerCase() },
            });
          }
          await tx.patientProfile.upsert({
            where: { userId: activeUser.id },
            update: {
              firstName: firstName || undefined,
              lastName: lastName || undefined,
              primaryAddress: primaryAddress || undefined,
              city: city || undefined,
              state: state || undefined,
              pincode: pincode || undefined,
              gender: gender || undefined,
              bloodGroup: bloodGroup || undefined,
              emergencyContactName: emergencyContactName || undefined,
              emergencyContactPhone: emergencyContactPhone || undefined,
            },
            create: {
              userId: activeUser.id,
              firstName: firstName || 'Patient',
              lastName: lastName || 'User',
              primaryAddress: primaryAddress || null,
              city: city || null,
              state: state || null,
              pincode: pincode || null,
              gender: gender || null,
              bloodGroup: bloodGroup || null,
              emergencyContactName: emergencyContactName || null,
              emergencyContactPhone: emergencyContactPhone || null,
            },
          });
        });
      }
    }

    const tokens = JwtUtils.generateTokens({
      userId: user.id,
      role: user.role,
      phone: user.phone,
    });

    return {
      user: {
        id: user.id,
        phone: user.phone,
        role: user.role,
        firstName:
          user.patientProfile?.firstName || user.careManagerProfile?.firstName,
        lastName:
          user.patientProfile?.lastName || user.careManagerProfile?.lastName,
        isPhoneVerified: true,
      },
      tokens,
    };
  }

  /**
   * Refresh Token: Issue new access & refresh token pair
   */
  static async refreshTokens(refreshToken: string) {
    const payload = JwtUtils.verifyRefreshToken(refreshToken);

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
    });

    if (!user || user.status !== UserStatus.ACTIVE) {
      throw ApiError.unauthorized('Invalid refresh session or inactive account');
    }

    const tokens = JwtUtils.generateTokens({
      userId: user.id,
      role: user.role,
      email: user.email,
      phone: user.phone,
    });

    return { tokens };
  }

  /**
   * Get Current Authenticated User Profile
   */
  static async getMe(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        adminProfile: true,
        patientProfile: true,
        careManagerProfile: true,
      },
    });

    if (!user) {
      throw ApiError.notFound('User not found');
    }

    return {
      id: user.id,
      email: user.email,
      phone: user.phone,
      role: user.role,
      status: user.status,
      isEmailVerified: user.isEmailVerified,
      isPhoneVerified: user.isPhoneVerified,
      profile:
        user.adminProfile || user.patientProfile || user.careManagerProfile || null,
      createdAt: user.createdAt,
    };
  }
}
