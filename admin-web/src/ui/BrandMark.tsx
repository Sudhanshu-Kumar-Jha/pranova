import React from 'react';
import { color } from '../design/tokens.js';

/** PRANOVA mark — a rounded teal tile with a medical cross. Decorative by default. */
export const BrandMark: React.FC<{ size?: number; inverted?: boolean; title?: string }> = ({ size = 28, inverted = false, title }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 32 32"
    role={title ? 'img' : undefined}
    aria-hidden={title ? undefined : true}
    aria-label={title}
    style={{ flexShrink: 0, display: 'block' }}
  >
    <rect width="32" height="32" rx="8" fill={inverted ? '#FFFFFF' : color.primary} />
    <path d="M13.5 8h5v5.5H24v5h-5.5V24h-5v-5.5H8v-5h5.5z" fill={inverted ? color.primary : '#FFFFFF'} />
  </svg>
);

export default BrandMark;
