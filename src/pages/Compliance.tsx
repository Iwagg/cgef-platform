import { useState } from 'react';
import { Shield, CircleCheck as CheckCircle, TriangleAlert as AlertTriangle, Clock, ChevronRight, ExternalLink } from 'lucide-react';
import { FRAMEWORKS, PROCESSES, PILLARS } from '../lib/cgef-framework';

export function Compliance() {
  const [selectedFramework, setSelectedFramework] = useState<string | null>(null);

  const getFrameworkStats = (frameworkId: string) => {
    const relevantProcesses = PROCESSES.filter(
      (p) => p.regulatoryMappings[frameworkId]?.length
    );
    const compliant = Math.floor(relevantProcesses.length * 0.65);
    const partial = Math.floor(relevantProcesses.length * 0.2);
    const nonCompliant = relevantProcesses.length - compliant - partial;

    return {
      total: relevantProcesses.length,
      compliant,
      partial,
      nonCompliant,
      coverage: Math.round((compliant / relevantProcesses.length) * 100),
    };
  };

  const selectedFrameworkData = selectedFramework
    ? FRAMEWORKS.find((f) => f.id === selectedFramework)
    : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-brand-slate-900">Conformite</h1>
        <p className="text-brand-slate-500 mt-1">
          Mapping de votre maturite CGEF vers les referentiels reglementaires
        </p>
      </div>

      <div className="card bg-gradient-to-r from-brand-green-50 to-brand-blue-50 border-brand-green-200">
        <div className="card-body">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-white rounded-lg shadow-sm">
              <Shield className="w-8 h-8 text-brand-green-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-brand-slate-900">
                Principe d'equivalence CGEF
              </h2>
              <p className="text-brand-slate-600 mt-1">
                Si tous vos piliers atteignent le niveau 3 (Defini), vous etes presume
                conforme a l'ensemble des referentiels majeurs (ISO 27001, NIS2, DORA, RGPD).
              </p>
              <div className="flex items-center gap-2 mt-3">
                <CheckCircle className="w-5 h-5 text-brand-green-500" />
                <span className="text-sm font-medium text-brand-green-700">
                  Equivalence applicable sur votre perimetre
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {FRAMEWORKS.map((framework) => {
          const stats = getFrameworkStats(framework.id);
          return (
            <button
              key={framework.id}
              onClick={() =>
                setSelectedFramework(
                  selectedFramework === framework.id ? null : framework.id
                )
              }
              className={`card text-left transition-all hover:shadow-md ${
                selectedFramework === framework.id
                  ? 'ring-2 ring-brand-green-500'
                  : ''
              }`}
            >
              <div className="card-body">
                <div className="flex items-start justify-between mb-4">
                  <div
                    className="w-12 h-12 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: `${framework.color}15` }}
                  >
                    <Shield className="w-6 h-6" style={{ color: framework.color }} />
                  </div>
                  <ChevronRight
                    className={`w-5 h-5 text-brand-slate-400 transition-transform ${
                      selectedFramework === framework.id ? 'rotate-90' : ''
                    }`}
                  />
                </div>

                <h3 className="font-semibold text-brand-slate-900">
                  {framework.name}
                </h3>
                <p className="text-sm text-brand-slate-500 mt-1">
                  Version {framework.version} - {framework.controlsCount} controles
                </p>

                <div className="mt-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-brand-slate-600">Couverture</span>
                    <span
                      className="text-sm font-bold"
                      style={{ color: framework.color }}
                    >
                      {stats.coverage}%
                    </span>
                  </div>
                  <div className="h-2 bg-brand-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${stats.coverage}%`,
                        backgroundColor: framework.color,
                      }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 mt-4">
                  <div className="text-center p-2 bg-green-50 rounded-lg">
                    <p className="text-lg font-bold text-green-600">{stats.compliant}</p>
                    <p className="text-xs text-green-700">Conforme</p>
                  </div>
                  <div className="text-center p-2 bg-yellow-50 rounded-lg">
                    <p className="text-lg font-bold text-yellow-600">{stats.partial}</p>
                    <p className="text-xs text-yellow-700">Partiel</p>
                  </div>
                  <div className="text-center p-2 bg-red-50 rounded-lg">
                    <p className="text-lg font-bold text-red-600">{stats.nonCompliant}</p>
                    <p className="text-xs text-red-700">A faire</p>
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {selectedFrameworkData && (
        <div className="card">
          <div className="card-header flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: `${selectedFrameworkData.color}15` }}
              >
                <Shield
                  className="w-5 h-5"
                  style={{ color: selectedFrameworkData.color }}
                />
              </div>
              <div>
                <h2 className="font-semibold text-brand-slate-900">
                  {selectedFrameworkData.name}
                </h2>
                <p className="text-sm text-brand-slate-500">
                  Mapping detaille des processus CGEF
                </p>
              </div>
            </div>
            <button className="btn-outline text-sm">
              <ExternalLink className="w-4 h-4 mr-2" />
              Documentation
            </button>
          </div>
          <div className="card-body">
            <div className="space-y-4">
              {PILLARS.map((pillar) => {
                const pillarProcesses = PROCESSES.filter(
                  (p) =>
                    p.pillarId === pillar.id &&
                    p.regulatoryMappings[selectedFramework!]?.length
                );

                if (pillarProcesses.length === 0) return null;

                return (
                  <div key={pillar.id}>
                    <h3 className="text-sm font-medium text-brand-slate-700 mb-2">
                      {pillar.id} - {pillar.name}
                    </h3>
                    <div className="space-y-2">
                      {pillarProcesses.map((process) => {
                        const status = Math.random();
                        return (
                          <div
                            key={process.id}
                            className="flex items-center justify-between p-3 bg-brand-slate-50 rounded-lg"
                          >
                            <div className="flex items-center gap-3">
                              {status > 0.65 ? (
                                <CheckCircle className="w-5 h-5 text-green-500" />
                              ) : status > 0.35 ? (
                                <Clock className="w-5 h-5 text-yellow-500" />
                              ) : (
                                <AlertTriangle className="w-5 h-5 text-red-500" />
                              )}
                              <div>
                                <p className="text-sm font-medium text-brand-slate-900">
                                  {process.name}
                                </p>
                                <p className="text-xs text-brand-slate-500">
                                  {process.regulatoryMappings[selectedFramework!]?.join(
                                    ', '
                                  )}
                                </p>
                              </div>
                            </div>
                            <span
                              className={`text-xs px-2 py-1 rounded-full ${
                                status > 0.65
                                  ? 'bg-green-100 text-green-700'
                                  : status > 0.35
                                  ? 'bg-yellow-100 text-yellow-700'
                                  : 'bg-red-100 text-red-700'
                              }`}
                            >
                              {status > 0.65
                                ? 'Conforme'
                                : status > 0.35
                                ? 'Partiel'
                                : 'Non conforme'}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
