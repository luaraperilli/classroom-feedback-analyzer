import React from 'react';

const FEATURES = [
  'Registre feedbacks após cada aula',
  'Visualize sua evolução ao longo do tempo',
  'Identifique padrões no seu aprendizado',
];

function AuthLeftPanel() {
  return (
    <div className="hidden lg:flex lg:w-5/12 bg-primary flex-col items-center justify-center p-12 relative overflow-hidden flex-shrink-0">
      <div className="absolute -top-24 -left-24 w-80 h-80 rounded-full bg-white/5" />
      <div className="absolute -bottom-32 -right-16 w-96 h-96 rounded-full bg-white/5" />
      <div className="absolute top-1/2 left-1/4 w-32 h-32 rounded-full bg-white/5" />

      <div className="relative z-10 text-center max-w-xs">
        <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center mx-auto mb-6">
          <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.966 8.966 0 00-6 2.292m0-14.25v14.25" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">FeedbackClass</h2>
        <p className="text-white/70 text-sm leading-relaxed mb-8">
          Acompanhe sua jornada de aprendizado com análise inteligente de sentimentos.
        </p>

        <div className="space-y-3 text-left">
          {FEATURES.map((feat) => (
            <div key={feat} className="flex items-start gap-3">
              <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              </div>
              <span className="text-white/80 text-sm">{feat}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default AuthLeftPanel;
