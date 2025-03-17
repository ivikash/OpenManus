'use client';

// This file is kept for backward compatibility
// Import from the new location
import { getSocket, useSocketStatus } from '@/app/lib/socket';

export { getSocket, useSocketStatus };

// Re-export the socket instance for backward compatibility
export const socket = getSocket();
