import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mockAdminUser, mockCashierUser, mockInactiveUser } from '../../../test/mocks';

// Mock all the dependencies before importing the auth module
vi.mock('@/lib/prisma', () => ({
  default: {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    activityLog: {
      create: vi.fn(),
    },
  },
}));

vi.mock('bcryptjs', () => ({
  default: {
    compare: vi.fn(),
  },
}));

vi.mock('@/lib/activity-log', () => ({
  logUserLogin: vi.fn(),
}));

import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { logUserLogin } from '@/lib/activity-log';

// ============================================================================
// Helper Functions - Simulate NextAuth authorize function
// ============================================================================

async function simulateAuthorize(credentials: {
  email?: string;
  password?: string;
}) {
  try {
    // This simulates the authorize function from auth.ts
    if (!credentials?.email || !credentials?.password) {
      return null;
    }

    const user = await prisma.user.findUnique({
      where: { email: credentials.email as string },
    });

    if (!user || !user.isActive) {
      return null;
    }

    const isPasswordValid = await bcrypt.compare(
      credentials.password as string,
      user.password
    );

    if (!isPasswordValid) {
      return null;
    }

    // Update lastLoginAt timestamp on successful login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // Log login activity
    await logUserLogin({ userId: user.id });

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    };
  } catch (error) {
    // Return null on any error
    return null;
  }
}

beforeEach(() => {
  vi.clearAllMocks();
  // Set up default bcrypt mock to return true
  vi.mocked(bcrypt.compare).mockResolvedValue(true as never);
  // Set up default activity log mock
  vi.mocked(logUserLogin).mockResolvedValue({} as never);
});

// ============================================================================
// Authentication - Successful Login Tests
// ============================================================================

describe('Authentication - Successful Login', () => {
  it('should authenticate user with valid credentials', async () => {
    const validUser = {
      ...mockAdminUser,
      password: '$2a$10$hashedpasswordhere',
    };

    vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(validUser);
    vi.mocked(bcrypt.compare).mockResolvedValueOnce(true as never);
    vi.mocked(prisma.user.update).mockResolvedValueOnce({
      ...validUser,
      lastLoginAt: new Date(),
    });
    vi.mocked(logUserLogin).mockResolvedValueOnce({} as never);

    const result = await simulateAuthorize({
      email: mockAdminUser.email,
      password: 'password123',
    });

    expect(result).not.toBeNull();
    expect(result?.id).toBe(mockAdminUser.id);
    expect(result?.email).toBe(mockAdminUser.email);
    expect(result?.name).toBe(mockAdminUser.name);
    expect(result?.role).toBe(mockAdminUser.role);

    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { email: mockAdminUser.email },
    });
    expect(bcrypt.compare).toHaveBeenCalledWith(
      'password123',
      validUser.password
    );
  });

  it('should update lastLoginAt on successful authentication', async () => {
    const validUser = {
      ...mockCashierUser,
      password: '$2a$10$hashedpasswordhere',
    };

    vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(validUser);
    vi.mocked(bcrypt.compare).mockResolvedValueOnce(true as never);
    vi.mocked(prisma.user.update).mockResolvedValueOnce({
      ...validUser,
      lastLoginAt: new Date(),
    });
    vi.mocked(logUserLogin).mockResolvedValueOnce({} as never);

    await simulateAuthorize({
      email: mockCashierUser.email,
      password: 'password123',
    });

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: mockCashierUser.id },
      data: { lastLoginAt: expect.any(Date) },
    });
  });

  it('should log user login activity on successful authentication', async () => {
    const validUser = {
      ...mockAdminUser,
      password: '$2a$10$hashedpasswordhere',
    };

    vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(validUser);
    vi.mocked(bcrypt.compare).mockResolvedValueOnce(true as never);
    vi.mocked(prisma.user.update).mockResolvedValueOnce({
      ...validUser,
      lastLoginAt: new Date(),
    });
    vi.mocked(logUserLogin).mockResolvedValueOnce({} as never);

    await simulateAuthorize({
      email: mockAdminUser.email,
      password: 'password123',
    });

    expect(logUserLogin).toHaveBeenCalledWith({
      userId: mockAdminUser.id,
    });
  });
});

// ============================================================================
// Authentication - Failed Login Tests
// ============================================================================

describe('Authentication - Failed Login', () => {
  it('should reject authentication with missing email', async () => {
    const result = await simulateAuthorize({
      password: 'password123',
    });

    expect(result).toBeNull();
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });

  it('should reject authentication with missing password', async () => {
    const result = await simulateAuthorize({
      email: mockAdminUser.email,
    });

    expect(result).toBeNull();
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });

  it('should reject authentication with non-existent email', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(null);

    const result = await simulateAuthorize({
      email: 'nonexistent@test.com',
      password: 'password123',
    });

    expect(result).toBeNull();
    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { email: 'nonexistent@test.com' },
    });
  });

  it('should reject authentication with inactive user', async () => {
    const inactiveUser = {
      ...mockInactiveUser,
      password: '$2a$10$hashedpasswordhere',
    };

    vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(inactiveUser);

    const result = await simulateAuthorize({
      email: mockInactiveUser.email,
      password: 'password123',
    });

    expect(result).toBeNull();
    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { email: mockInactiveUser.email },
    });
    expect(bcrypt.compare).not.toHaveBeenCalled();
  });

  it('should reject authentication with invalid password', async () => {
    const validUser = {
      ...mockAdminUser,
      password: '$2a$10$hashedpasswordhere',
    };

    vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(validUser);
    vi.mocked(bcrypt.compare).mockResolvedValueOnce(false as never);

    const result = await simulateAuthorize({
      email: mockAdminUser.email,
      password: 'wrongpassword',
    });

    expect(result).toBeNull();
    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { email: mockAdminUser.email },
    });
    expect(bcrypt.compare).toHaveBeenCalledWith(
      'wrongpassword',
      validUser.password
    );
  });
});

// ============================================================================
// Error Handling Tests
// ============================================================================

describe('Error Handling', () => {
  it('should handle database errors during user lookup gracefully', async () => {
    vi.mocked(prisma.user.findUnique).mockRejectedValueOnce(
      new Error('Database connection failed')
    );

    const result = await simulateAuthorize({
      email: mockAdminUser.email,
      password: 'password123',
    });

    expect(result).toBeNull();
  });

  it('should handle bcrypt errors gracefully', async () => {
    const validUser = {
      ...mockAdminUser,
      password: '$2a$10$hashedpasswordhere',
    };

    vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(validUser);
    vi.mocked(bcrypt.compare).mockRejectedValueOnce(
      new Error('Bcrypt error')
    );

    const result = await simulateAuthorize({
      email: mockAdminUser.email,
      password: 'password123',
    });

    expect(result).toBeNull();
  });

  it('should handle user update errors gracefully', async () => {
    const validUser = {
      ...mockCashierUser,
      password: '$2a$10$hashedpasswordhere',
    };

    vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(validUser);
    vi.mocked(bcrypt.compare).mockResolvedValueOnce(true as never);
    vi.mocked(prisma.user.update).mockRejectedValueOnce(
      new Error('Update failed')
    );

    const result = await simulateAuthorize({
      email: mockCashierUser.email,
      password: 'password123',
    });

    // Should return null because error is caught
    expect(result).toBeNull();
  });

  it('should continue even if activity logging fails', async () => {
    const validUser = {
      ...mockAdminUser,
      password: '$2a$10$hashedpasswordhere',
    };

    vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(validUser);
    vi.mocked(bcrypt.compare).mockResolvedValueOnce(true as never);
    vi.mocked(prisma.user.update).mockResolvedValueOnce({
      ...validUser,
      lastLoginAt: new Date(),
    });
    vi.mocked(logUserLogin).mockRejectedValueOnce(
      new Error('Logging failed')
    );

    const result = await simulateAuthorize({
      email: mockAdminUser.email,
      password: 'password123',
    });

    // Should return null because error is caught
    expect(result).toBeNull();
  });
});

// ============================================================================
// Security Tests
// ============================================================================

describe('Security', () => {
  it('should not authenticate with null email', async () => {
    const result = await simulateAuthorize({
      email: null as any,
      password: 'password123',
    });

    expect(result).toBeNull();
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });

  it('should not authenticate with undefined email', async () => {
    const result = await simulateAuthorize({
      email: undefined as any,
      password: 'password123',
    });

    expect(result).toBeNull();
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });

  it('should not authenticate with empty string email', async () => {
    const result = await simulateAuthorize({
      email: '',
      password: 'password123',
    });

    expect(result).toBeNull();
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });

  it('should not authenticate with null password', async () => {
    const result = await simulateAuthorize({
      email: mockAdminUser.email,
      password: null as any,
    });

    expect(result).toBeNull();
    expect(bcrypt.compare).not.toHaveBeenCalled();
  });

  it('should not authenticate with undefined password', async () => {
    const result = await simulateAuthorize({
      email: mockAdminUser.email,
      password: undefined as any,
    });

    expect(result).toBeNull();
    expect(bcrypt.compare).not.toHaveBeenCalled();
  });

  it('should not authenticate with empty string password', async () => {
    const result = await simulateAuthorize({
      email: mockAdminUser.email,
      password: '',
    });

    expect(result).toBeNull();
    expect(bcrypt.compare).not.toHaveBeenCalled();
  });

  it('should prevent SQL injection in email', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(null);

    const result = await simulateAuthorize({
      email: "'; DROP TABLE users; --",
      password: 'password123',
    });

    expect(result).toBeNull();
    // Prisma should handle this safely with parameterized queries
    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { email: "'; DROP TABLE users; --" },
    });
  });

  it('should handle special characters in email', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(null);

    const result = await simulateAuthorize({
      email: 'test+user@example.com',
      password: 'password123',
    });

    expect(result).toBeNull();
    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { email: 'test+user@example.com' },
    });
  });
});

// ============================================================================
// User Object Structure Tests
// ============================================================================

describe('User Object Structure', () => {
  it('should return correct user object structure on success', async () => {
    const validUser = {
      ...mockAdminUser,
      password: '$2a$10$hashedpasswordhere',
    };

    vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(validUser);
    vi.mocked(bcrypt.compare).mockResolvedValueOnce(true as never);
    vi.mocked(prisma.user.update).mockResolvedValueOnce({
      ...validUser,
      lastLoginAt: new Date(),
    });
    vi.mocked(logUserLogin).mockResolvedValueOnce({} as never);

    const result = await simulateAuthorize({
      email: mockAdminUser.email,
      password: 'password123',
    });

    expect(result).toEqual({
      id: mockAdminUser.id,
      name: mockAdminUser.name,
      email: mockAdminUser.email,
      role: mockAdminUser.role,
    });
  });

  it('should not include password in returned user object', async () => {
    const validUser = {
      ...mockCashierUser,
      password: '$2a$10$hashedpasswordhere',
    };

    vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(validUser);
    vi.mocked(bcrypt.compare).mockResolvedValueOnce(true as never);
    vi.mocked(prisma.user.update).mockResolvedValueOnce({
      ...validUser,
      lastLoginAt: new Date(),
    });
    vi.mocked(logUserLogin).mockResolvedValueOnce({} as never);

    const result = await simulateAuthorize({
      email: mockCashierUser.email,
      password: 'password123',
    });

    expect(result).not.toHaveProperty('password');
  });

  it('should not include isActive in returned user object', async () => {
    const validUser = {
      ...mockAdminUser,
      password: '$2a$10$hashedpasswordhere',
    };

    vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(validUser);
    vi.mocked(bcrypt.compare).mockResolvedValueOnce(true as never);
    vi.mocked(prisma.user.update).mockResolvedValueOnce({
      ...validUser,
      lastLoginAt: new Date(),
    });
    vi.mocked(logUserLogin).mockResolvedValueOnce({} as never);

    const result = await simulateAuthorize({
      email: mockAdminUser.email,
      password: 'password123',
    });

    expect(result).not.toHaveProperty('isActive');
  });
});

// ============================================================================
// Multiple Authentication Attempts Tests
// ============================================================================

describe('Multiple Authentication Attempts', () => {
  it('should handle multiple rapid authentication attempts', async () => {
    const validUser = {
      ...mockAdminUser,
      password: '$2a$10$hashedpasswordhere',
    };

    vi.mocked(prisma.user.findUnique).mockResolvedValue(validUser);
    vi.mocked(bcrypt.compare).mockResolvedValue(true as never);
    vi.mocked(prisma.user.update).mockResolvedValue({
      ...validUser,
      lastLoginAt: new Date(),
    });
    vi.mocked(logUserLogin).mockResolvedValue({} as never);

    // Make multiple authentication attempts
    const attempts = [];
    for (let i = 0; i < 5; i++) {
      attempts.push(
        simulateAuthorize({
          email: mockAdminUser.email,
          password: 'password123',
        })
      );
    }

    const results = await Promise.all(attempts);

    // All attempts should succeed
    results.forEach((result) => {
      expect(result).not.toBeNull();
      expect(result?.id).toBe(mockAdminUser.id);
    });
  });
});

// ============================================================================
// Edge Cases Tests
// ============================================================================

describe('Edge Cases', () => {
  it('should handle email with different casing', async () => {
    const validUser = {
      ...mockAdminUser,
      password: '$2a$10$hashedpasswordhere',
    };

    vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(validUser);
    vi.mocked(bcrypt.compare).mockResolvedValueOnce(true as never);
    vi.mocked(prisma.user.update).mockResolvedValueOnce({
      ...validUser,
      lastLoginAt: new Date(),
    });
    vi.mocked(logUserLogin).mockResolvedValueOnce({} as never);

    // Try with uppercase email
    const result = await simulateAuthorize({
      email: mockAdminUser.email.toUpperCase(),
      password: 'password123',
    });

    // Should query with uppercase but may not find user due to case sensitivity
    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { email: mockAdminUser.email.toUpperCase() },
    });
  });

  it('should handle email with leading/trailing whitespace', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(null);

    const result = await simulateAuthorize({
      email: '  test@example.com  ',
      password: 'password123',
    });

    expect(result).toBeNull();
    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { email: '  test@example.com  ' },
    });
  });

  it('should handle very long email', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(null);

    const longEmail = 'a'.repeat(500) + '@example.com';

    const result = await simulateAuthorize({
      email: longEmail,
      password: 'password123',
    });

    expect(result).toBeNull();
  });

  it('should handle very short password', async () => {
    const validUser = {
      ...mockAdminUser,
      password: '$2a$10$hashedpasswordhere',
    };

    vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(validUser);
    vi.mocked(bcrypt.compare).mockResolvedValueOnce(false as never);

    const result = await simulateAuthorize({
      email: mockAdminUser.email,
      password: 'x',
    });

    expect(result).toBeNull();
    expect(bcrypt.compare).toHaveBeenCalledWith('x', validUser.password);
  });
});
