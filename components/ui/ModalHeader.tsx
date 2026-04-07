import React from 'react';
import { Icon } from '../Icon';

type ModalHeaderProps = {
  title: string;
  subtitle?: string;
  kicker?: string;
  icon?: string;
  onClose: () => void;
  actions?: React.ReactNode;
  compact?: boolean;
};

const ModalHeader: React.FC<ModalHeaderProps> = ({
  title,
  subtitle,
  kicker,
  icon = 'diamond',
  onClose,
  actions,
  compact = false
}) => {
  return (
    <div className={`royal-modal-header ${compact ? 'px-5 py-4 sm:px-6' : 'px-5 py-5 sm:px-7 sm:py-6'}`}>
      <div className="royal-modal-orb" />
      <div className="relative z-10 flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-4">
          <div className="royal-modal-icon shrink-0">
            <Icon name={icon} size="22" />
          </div>
          <div className="min-w-0">
            {kicker && <div className="royal-kicker mb-2">{kicker}</div>}
            <h2 className="royal-modal-title">{title}</h2>
            {subtitle && <p className="royal-modal-subtitle">{subtitle}</p>}
          </div>
        </div>
        <div className="relative z-10 flex shrink-0 items-center gap-3">
          {actions}
          <button
            type="button"
            onClick={onClose}
            className="royal-modal-close"
            aria-label="Close modal"
          >
            <Icon name="close" size="22" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ModalHeader;
