import React from 'react';
import { ACCOUNT_TYPE_OPTIONS } from '../constants/accountTypes';

interface AccountTypeSelectProps {
  value: string;
  onChange: (value: string) => void;
  className: string;
  disabled?: boolean;
}

const AccountTypeSelect: React.FC<AccountTypeSelectProps> = ({ value, onChange, className, disabled = false }) => (
  <select
    value={value}
    onChange={(e) => onChange(e.target.value)}
    className={className}
    disabled={disabled}
  >
    {ACCOUNT_TYPE_OPTIONS.map((option) => (
      <option key={option} value={option} className="bg-deep-charcoal text-white">
        {option}
      </option>
    ))}
  </select>
);

export default AccountTypeSelect;
