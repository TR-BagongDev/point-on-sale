import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PUT } from '../../api/settings/route';
import { NextRequest } from 'next/server';

// Mock prisma
vi.mock('@/lib/prisma', () => ({
  default: {
    setting: {
      findFirst: vi.fn(),
      update: vi.fn(),
      create: vi.fn(),
    },
  },
}));

// Mock auth
vi.mock('@/auth', () => ({
  auth: vi.fn(),
}));

import prisma from '@/lib/prisma';
import { auth } from '@/auth';

describe('Settings API - NPWP Validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Helper function to create a mock request
  function createMockRequest(body: any): NextRequest {
    return {
      json: async () => body,
    } as unknown as NextRequest;
  }

  describe('Valid NPWP Formats', () => {
    it('should accept valid NPWP format XX.XXX.XXX.X-XXX.XXX', async () => {
      // Mock auth to return admin user
      vi.mocked(auth).mockResolvedValue({
        user: { role: 'ADMIN' },
      } as any);

      // Mock existing settings
      vi.mocked(prisma.setting.findFirst).mockResolvedValue({
        id: '1',
        storeName: 'Test Store',
        npwp: null,
      });

      // Mock update
      vi.mocked(prisma.setting.update).mockResolvedValue({
        id: '1',
        storeName: 'Test Store',
        npwp: '01.234.567.8-901.000',
      });

      const request = createMockRequest({
        storeName: 'Test Store',
        npwp: '01.234.567.8-901.000',
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.npwp).toBe('01.234.567.8-901.000');
    });

    it('should accept empty NPWP (optional field)', async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { role: 'ADMIN' },
      } as any);

      vi.mocked(prisma.setting.findFirst).mockResolvedValue({
        id: '1',
        storeName: 'Test Store',
        npwp: '01.234.567.8-901.000',
      });

      vi.mocked(prisma.setting.update).mockResolvedValue({
        id: '1',
        storeName: 'Test Store',
        npwp: null,
      });

      const request = createMockRequest({
        storeName: 'Test Store',
        npwp: '',
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.npwp).toBeNull();
    });

    it('should accept null NPWP', async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { role: 'ADMIN' },
      } as any);

      vi.mocked(prisma.setting.findFirst).mockResolvedValue({
        id: '1',
        storeName: 'Test Store',
        npwp: '01.234.567.8-901.000',
      });

      vi.mocked(prisma.setting.update).mockResolvedValue({
        id: '1',
        storeName: 'Test Store',
        npwp: null,
      });

      const request = createMockRequest({
        storeName: 'Test Store',
        npwp: null,
      });

      const response = await PUT(request);

      expect(response.status).toBe(200);
    });
  });

  describe('Invalid NPWP Formats - Wrong Pattern', () => {
    it('should reject NPWP without dots', async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { role: 'ADMIN' },
      } as any);

      const request = createMockRequest({
        storeName: 'Test Store',
        npwp: '0123456789010000',
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('NPWP format is invalid');
    });

    it('should reject NPWP with wrong dot positions', async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { role: 'ADMIN' },
      } as any);

      const request = createMockRequest({
        storeName: 'Test Store',
        npwp: '01.234.567.890.1000',
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('NPWP format is invalid');
    });

    it('should reject NPWP missing dash', async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { role: 'ADMIN' },
      } as any);

      const request = createMockRequest({
        storeName: 'Test Store',
        npwp: '01.234.567.8.901.000',
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('NPWP format is invalid');
    });

    it('should reject NPWP with letters', async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { role: 'ADMIN' },
      } as any);

      const request = createMockRequest({
        storeName: 'Test Store',
        npwp: 'AA.BBB.CCC.D-Eee.FFF',
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('NPWP format is invalid');
    });

    it('should reject NPWP with special characters except dots and dash', async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { role: 'ADMIN' },
      } as any);

      const request = createMockRequest({
        storeName: 'Test Store',
        npwp: '01.234.567.8-901.000!',
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('NPWP format is invalid');
    });
  });

  describe('Invalid NPWP Formats - Wrong Length', () => {
    it('should reject NPWP that is too short', async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { role: 'ADMIN' },
      } as any);

      const request = createMockRequest({
        storeName: 'Test Store',
        npwp: '01.234.567',
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('NPWP format is invalid');
    });

    it('should reject NPWP with extra digits at start', async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { role: 'ADMIN' },
      } as any);

      const request = createMockRequest({
        storeName: 'Test Store',
        npwp: '001.234.567.8-901.000',
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('NPWP format is invalid');
    });

    it('should reject NPWP with extra digits at end', async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { role: 'ADMIN' },
      } as any);

      const request = createMockRequest({
        storeName: 'Test Store',
        npwp: '01.234.567.8-901.0000',
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('NPWP format is invalid');
    });

    it('should reject NPWP with missing digits in middle section', async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { role: 'ADMIN' },
      } as any);

      const request = createMockRequest({
        storeName: 'Test Store',
        npwp: '01.234.56.8-901.000',
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('NPWP format is invalid');
    });
  });

  describe('Invalid NPWP Formats - Wrong Type', () => {
    it('should reject NPWP that is a number', async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { role: 'ADMIN' },
      } as any);

      const request = createMockRequest({
        storeName: 'Test Store',
        npwp: 1234567890123,
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('NPWP must be a string');
    });

    it('should reject NPWP that is a boolean', async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { role: 'ADMIN' },
      } as any);

      const request = createMockRequest({
        storeName: 'Test Store',
        npwp: true,
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('NPWP must be a string');
    });

    it('should reject NPWP that is an object', async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { role: 'ADMIN' },
      } as any);

      const request = createMockRequest({
        storeName: 'Test Store',
        npwp: { value: '01.234.567.8-901.000' },
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('NPWP must be a string');
    });

    it('should reject NPWP that is an array', async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { role: 'ADMIN' },
      } as any);

      const request = createMockRequest({
        storeName: 'Test Store',
        npwp: ['01.234.567.8-901.000'],
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('NPWP must be a string');
    });
  });

  describe('Edge Cases', () => {
    it('should trim whitespace from NPWP before validation', async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { role: 'ADMIN' },
      } as any);

      vi.mocked(prisma.setting.findFirst).mockResolvedValue({
        id: '1',
        storeName: 'Test Store',
        npwp: null,
      });

      vi.mocked(prisma.setting.update).mockResolvedValue({
        id: '1',
        storeName: 'Test Store',
        npwp: '01.234.567.8-901.000',
      });

      const request = createMockRequest({
        storeName: 'Test Store',
        npwp: '  01.234.567.8-901.000  ',
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.npwp).toBe('01.234.567.8-901.000');
    });

    it('should treat whitespace-only NPWP as empty', async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { role: 'ADMIN' },
      } as any);

      vi.mocked(prisma.setting.findFirst).mockResolvedValue({
        id: '1',
        storeName: 'Test Store',
        npwp: '01.234.567.8-901.000',
      });

      vi.mocked(prisma.setting.update).mockResolvedValue({
        id: '1',
        storeName: 'Test Store',
        npwp: null,
      });

      const request = createMockRequest({
        storeName: 'Test Store',
        npwp: '   ',
      });

      const response = await PUT(request);

      expect(response.status).toBe(200);
    });

    it('should not save settings when NPWP validation fails', async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { role: 'ADMIN' },
      } as any);

      const request = createMockRequest({
        storeName: 'Test Store',
        npwp: 'invalid-npwp',
      });

      const response = await PUT(request);

      // Verify that prisma.setting.update was not called
      expect(prisma.setting.update).not.toHaveBeenCalled();
      expect(response.status).toBe(400);
    });
  });

  describe('Error Message Quality', () => {
    it('should provide clear error message with expected format', async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { role: 'ADMIN' },
      } as any);

      const request = createMockRequest({
        storeName: 'Test Store',
        npwp: 'invalid',
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('NPWP format is invalid. Expected format: XX.XXX.XXX.X-XXX.XXX');
    });
  });
});
