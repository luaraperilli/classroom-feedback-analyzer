import React from 'react';

const FEATURES = [
  'Registre feedbacks após cada aula',
  'Visualize sua evolução ao longo do tempo',
  'Identifique padrões no seu aprendizado',
];

function AuthLeftPanel() {
  return (
    <div className="hidden lg:flex lg:w-5/12 bg-gradient-to-br from-primary to-primary-dark flex-col items-center justify-center p-12 relative overflow-hidden flex-shrink-0">
      <div className="absolute -top-24 -left-24 w-80 h-80 rounded-full bg-white/5" />
      <div className="absolute -bottom-32 -right-16 w-96 h-96 rounded-full bg-white/5" />
      <div className="absolute top-1/2 left-1/4 w-32 h-32 rounded-full bg-white/5" />

      <div className="relative z-10 text-center max-w-xs">
        <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center mx-auto mb-6">
          <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2zM8.5 13v-1.5M12 13v-3.5M15.5 13v-5.5" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">Voz Discente</h2>
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
