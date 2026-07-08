import React from 'react';
import { PASSWORD_RULES } from '../utils/passwordPolicy';

// Checklist de requisitos de senha com feedback ao vivo (verde = atendido).
export default function PasswordChecklist({ password }) {
  return (
    <ul className="mt-2 space-y-1" aria-label="Requisitos da senha">
      {PASSWORD_RULES.map((rule) => {
        const ok = rule.test(password || '');
        return (
          <li
            key={rule.key}
            className={`flex items-center gap-2 text-sm transition-colors ${ok ? 'text-[#059669]' : 'text-[#94a3b8]'}`}
          >
            {ok ? (
              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            ) : (
              <span className="w-4 h-4 flex-shrink-0 flex items-center justify-center">
                <span className="w-1.5 h-1.5 rounded-full bg-current" />
              </span>
            )}
            {rule.label}
          </li>
        );
      })}
    </ul>
  );
}
