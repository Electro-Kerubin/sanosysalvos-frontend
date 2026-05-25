import React from 'react';
import { COLORS } from '../styles/theme';

export default function DatePickerInput({ value, onChange, placeholder }) {
  return (
    <input
      type="date"
      value={value || ''}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      style={{
        minHeight: 52,
        width: '100%',
        boxSizing: 'border-box',
        borderRadius: 16,
        border: `1px solid ${COLORS.border}`,
        backgroundColor: COLORS.surface,
        color: value ? COLORS.text : COLORS.muted,
        fontSize: 15,
        padding: '0 16px',
        outline: 'none',
        cursor: 'pointer',
        fontFamily: 'inherit',
      }}
    />
  );
}
