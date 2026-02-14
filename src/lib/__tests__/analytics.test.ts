import { describe, it, expect, vi, beforeEach } from 'vitest';
import { track, identify, initAnalytics } from '@/lib/analytics';

describe('analytics', () => {
  const mockProvider = {
    track: vi.fn(),
    identify: vi.fn(),
  };

  beforeEach(() => {
    mockProvider.track.mockReset();
    mockProvider.identify.mockReset();
  });

  // Tests for no-provider behavior first
  describe('without provider', () => {
    it('track() does not throw when no provider', () => {
      expect(() => track({ name: 'user_logout', properties: {} })).not.toThrow();
    });

    it('track() calls console.debug in DEV mode when no provider', () => {
      const spy = vi.spyOn(console, 'debug').mockImplementation(() => {});
      track({ name: 'page_view', properties: { path: '/test' } });
      expect(spy).toHaveBeenCalledWith('[analytics]', 'page_view', { path: '/test' });
      spy.mockRestore();
    });

    it('identify() does not throw when no provider', () => {
      expect(() => identify('u1', { name: 'Test' })).not.toThrow();
    });
  });

  describe('with provider', () => {
    beforeEach(() => {
      initAnalytics(mockProvider);
    });

    it('initAnalytics() sets the provider', () => {
      track({ name: 'user_logout', properties: {} });
      expect(mockProvider.track).toHaveBeenCalledWith({ name: 'user_logout', properties: {} });
    });

    it('track() calls provider.track', () => {
      track({ name: 'backup_exported', properties: {} });
      expect(mockProvider.track).toHaveBeenCalledOnce();
    });

    it('identify() calls provider.identify', () => {
      identify('u1', { name: 'Test', role: 'admin' });
      expect(mockProvider.identify).toHaveBeenCalledWith('u1', { name: 'Test', role: 'admin' });
    });

    it('track() does not throw when provider.track throws', () => {
      mockProvider.track.mockImplementation(() => { throw new Error('fail'); });
      expect(() => track({ name: 'user_logout', properties: {} })).not.toThrow();
    });
  });
});
