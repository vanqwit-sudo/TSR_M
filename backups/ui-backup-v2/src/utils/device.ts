import { createContext } from 'react';

export type DeviceType = 'phone' | 'tablet' | 'laptop';

export function getDeviceType(): DeviceType {
  if (typeof window === 'undefined') {
    return 'laptop';
  }

  const width = window.innerWidth;

  if (width <= 768) {
    return 'phone';
  }

  if (width <= 1200) {
    return 'tablet';
  }

  return 'laptop';
}

export const DeviceContext = createContext<DeviceType>('laptop');
