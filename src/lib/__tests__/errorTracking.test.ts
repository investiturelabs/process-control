import { describe, it, expect, vi, beforeEach } from 'vitest';
import { captureException, captureMessage, setErrorTrackingUser, initErrorTracking } from '@/lib/errorTracking';

describe('errorTracking', () => {
  const mockProvider = {
    captureException: vi.fn(),
    captureMessage: vi.fn(),
    setUser: vi.fn(),
  };

  beforeEach(() => {
    mockProvider.captureException.mockReset();
    mockProvider.captureMessage.mockReset();
    mockProvider.setUser.mockReset();
  });

  describe('without provider', () => {
    it('captureException() does not throw when no provider', () => {
      expect(() => captureException(new Error('test'))).not.toThrow();
    });

    it('captureException() falls back to console.error', () => {
      const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const err = new Error('test');
      captureException(err, { component: 'Test' });
      expect(spy).toHaveBeenCalledWith('[errorTracking]', err, { component: 'Test' });
      spy.mockRestore();
    });

    it('captureMessage() does not throw when no provider', () => {
      expect(() => captureMessage('test message')).not.toThrow();
    });

    it('setErrorTrackingUser() does not throw when no provider', () => {
      expect(() => setErrorTrackingUser({ id: '1', email: 'a@b.c', name: 'Test' })).not.toThrow();
    });
  });

  describe('with provider', () => {
    beforeEach(() => {
      initErrorTracking(mockProvider);
    });

    it('captureException() calls provider.captureException', () => {
      const err = new Error('fail');
      captureException(err, { key: 'val' });
      expect(mockProvider.captureException).toHaveBeenCalledWith(err, { key: 'val' });
    });

    it('captureMessage() calls provider.captureMessage', () => {
      captureMessage('hello');
      expect(mockProvider.captureMessage).toHaveBeenCalledWith('hello');
    });

    it('setErrorTrackingUser() calls provider.setUser', () => {
      const user = { id: '1', email: 'a@b.c', name: 'Test' };
      setErrorTrackingUser(user);
      expect(mockProvider.setUser).toHaveBeenCalledWith(user);
    });

    it('setErrorTrackingUser(null) calls provider.setUser with null', () => {
      setErrorTrackingUser(null);
      expect(mockProvider.setUser).toHaveBeenCalledWith(null);
    });

    it('captureException() does not throw when provider throws', () => {
      mockProvider.captureException.mockImplementation(() => { throw new Error('fail'); });
      expect(() => captureException(new Error('test'))).not.toThrow();
    });

    it('captureMessage() does not throw when provider throws', () => {
      mockProvider.captureMessage.mockImplementation(() => { throw new Error('fail'); });
      expect(() => captureMessage('test')).not.toThrow();
    });
  });
});
