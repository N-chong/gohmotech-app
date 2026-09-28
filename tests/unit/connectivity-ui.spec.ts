import { afterEach, describe, expect, test, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { nextTick } from 'vue';
import NetworkBanner from '@/components/NetworkBanner.vue';
import { clearDeviceState, markServerOffline, markServerOnline } from '@/stores/device.store';

afterEach(() => {
  clearDeviceState();
  vi.restoreAllMocks();
});

describe('connection and stale-data messaging', () => {
  test('distinguishes online, offline, unknown, and synchronizing states', async () => {
    vi.spyOn(window.navigator, 'onLine', 'get').mockReturnValue(true);
    const wrapper = mount(NetworkBanner, {
      props: { lastUpdatedAt: '2026-09-28T00:00:00Z' },
      global: { stubs: { IonIcon: true } },
    });

    expect(wrapper.text()).toContain('Connection status unknown');
    markServerOnline();
    await nextTick();
    expect(wrapper.text()).toContain('Farm server online');
    markServerOffline();
    await nextTick();
    expect(wrapper.text()).toContain('Farm server offline');
    expect(wrapper.text()).toContain('Showing last loaded data');
    await wrapper.setProps({ busy: true });
    expect(wrapper.text()).toContain('Synchronizing farm data');
  });

  test('offers a non-intrusive retry action while offline', async () => {
    vi.spyOn(window.navigator, 'onLine', 'get').mockReturnValue(true);
    markServerOffline();
    const retry = vi.fn();
    const wrapper = mount(NetworkBanner, {
      props: { retry },
      global: { stubs: { IonIcon: true } },
    });

    await wrapper.get('button').trigger('click');

    expect(retry).toHaveBeenCalledOnce();
    expect(wrapper.attributes('role')).toBe('status');
    expect(wrapper.attributes('aria-live')).toBe('polite');
  });
});
