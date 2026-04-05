import { useEffect, useState, useCallback } from 'react';
import { Bell, Calendar, ExternalLink, CheckCircle, Clock, Globe, TrendingUp } from 'lucide-react';
import { FRAMEWORKS } from '../lib/cgef-framework';

interface Alert {
  id: string;
  framework: string;
  frameworkColor: string;
  title: string;
  description: string;
  severity: 'high' | 'medium' | 'low';
  deadline?: string;
  sourceUrl?: string;
  isNew: boolean;
  date: string;
}

interface Deadline {
  id: string;
  title: string;
  framework: string;
  color: string;
  date: string;
  daysLeft: number;
  type: 'reporting' | 'implementation' | 'audit';
}

// Static regulatory intelligence (in production: fetched from Supabase regulatory_alerts table)
const STATIC_ALERTS: Alert[] = [
  { id: '1', framework: 'NIS2', frameworkColor: '#2E7D32', title: 'Rapport annuel NIS2 — Délai approchant', description: 'Les entités essentielles et importantes doivent soumettre leur rapport annuel de conformité NIS2 à l\'ANSSI avant le 30 juin 2025.', severity: 'high', deadline: '2025-06-30', sourceUrl: 'https://www.ssi.gouv.fr', isNew: true, date: '2025-04-01' },
  { id: '2', framework: 'DORA', frameworkColor: '#F57C00', title: 'DORA — Date d\'application : janvier 2025', description: 'Le règlement DORA est pleinement applicable depuis le 17 janvier 2025. Les entités financières dans le périmètre doivent être conformes. Les rapports ICT incidents majeurs sont désormais obligatoires.', severity: 'high', deadline: '2025-01-17', sourceUrl: 'https://www.eba.europa.eu', isNew: false, date: '2025-01-17' },
  { id: '3', framework: 'DORA', frameworkColor: '#F57C00', title: 'DORA TLPT — Obligations de tests de pénétration avancés', description: 'Les entités financières significatives doivent planifier leur premier TLPT (Threat-Led Penetration Testing) avant fin 2025 conformément à l\'article 26 de DORA.', severity: 'medium', deadline: '2025-12-31', isNew: true, date: '2025-03-15' },
  { id: '4', framework: 'RGPD', frameworkColor: '#7B1FA2', title: 'CNIL — Nouvelles lignes directrices sur les cookies', description: 'La CNIL a mis à jour ses lignes directrices sur le recueil du consentement pour les traceurs. Les interfaces de consentement doivent être mises à jour.', severity: 'medium', isNew: false, date: '2025-02-20' },
  { id: '5', framework: 'ISO 27001', frameworkColor: '#1565C0', title: 'ISO 27001:2022 — Transition obligatoire', description: 'Les certifications ISO 27001:2013 expirent fin octobre 2025. Toutes les organisations certifiées doivent avoir migré vers la version 2022 avant cette date.', severity: 'high', deadline: '2025-10-31', isNew: false, date: '2025-01-01' },
  { id: '6', framework: 'NIS2', frameworkColor: '#2E7D32', title: 'NIS2 — Notifications d\'incidents significatifs', description: 'Rappel : les incidents significatifs doivent être notifiés à l\'ANSSI dans les 24h (alerte précoce), 72h (notification initiale) et 1 mois (rapport final). Le non-respect entraîne des sanctions.', severity: 'medium', isNew: false, date: '2025-03-01' },
];

function getDeadlines(): Deadline[] {
  const today = new Date();
  const deadlines = [
    { id: 'd1', title: 'Rapport annuel NIS2', framework: 'NIS2', color: '#2E7D32', date: '2025-06-30', type: 'reporting' as const },
    { id: 'd2', title: 'Transition ISO 27001:2022', framework: 'ISO 27001', color: '#1565C0', date: '2025-10-31', type: 'audit' as const },
    { id: 'd3', title: 'TLPT DORA premier cycle', framework: 'DORA', color: '#F57C00', date: '2025-12-31', type: 'audit' as const },
    { id: 'd4', title: 'Revue annuelle des tiers critiques (DORA)', framework: 'DORA', color: '#F57C00', date: '2025-09-30', type: 'reporting' as const },
    { id: 'd5', title: 'PIA — Revue annuelle des traitements', framework: 'RGPD', color: '#7B1FA2', date: '2025-12-31', type: 'implementation' as const },
  ];
  return deadlines.map(d => {
    const target = new Date(d.date);
    const daysLeft = Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return { ...d, daysLeft };
  }).filter(d => d.daysLeft > 0).sort((a, b) => a.daysLeft - b.daysLeft);
}

export function RegulatoryIntel() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [deadlines, setDeadlines] = useState<Deadline[]>([]);
  const [filter, setFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all');
  const [fwFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(() => {
    setAlerts(STATIC_ALERTS);
    setDeadlines(getDeadlines());
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const filtered = alerts.filter(a => {
    if (filter !== 'all' && a.severity !== filter) return false;
    if (fwFilter !== 'all' && !a.framework.toLowerCase().includes(fwFilter.toLowerCase())) return false;
    return true;
  });

  const sevColor = { high: 'text-red-700 bg-red-100 border-red-200', medium: 'text-orange-700 bg-orange-100 border-orange-200', low: 'text-green-700 bg-green-100 border-green-200' };
  const typeLabel = { reporting: 'Reporting', implementation: 'Implémentation', audit: 'Audit' };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-4 border-brand-green-500 border-t-transparent rounded-full" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-brand-slate-900">Veille Réglementaire</h1>
        <p className="text-brand-slate-500 mt-1">Alertes et échéances réglementaires pour NIS2, DORA, ISO 27001, RGPD</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Alertes actives', value: alerts.length, sub: `${alerts.filter(a => a.severity === 'high').length} critiques`, icon: Bell, color: 'text-red-600 bg-red-50' },
          { label: 'Nouveautés', value: alerts.filter(a => a.isNew).length, sub: 'Cette semaine', icon: TrendingUp, color: 'text-brand-blue-600 bg-brand-blue-50' },
          { label: 'Prochaine échéance', value: deadlines[0] ? `J-${deadlines[0].daysLeft}` : '—', sub: deadlines[0]?.title.slice(0, 20) || 'Aucune', icon: Calendar, color: 'text-orange-600 bg-orange-50' },
          { label: 'Référentiels surveillés', value: FRAMEWORKS.length, sub: 'ISO, NIS2, DORA, RGPD...', icon: Globe, color: 'text-brand-green-600 bg-brand-green-50' },
        ].map((c, i) => (
          <div key={i} className={`card ${c.color.split(' ')[1]}`}>
            <div className="card-body">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-brand-slate-500">{c.label}</span>
                <c.icon className={`w-5 h-5 ${c.color.split(' ')[0]}`} />
              </div>
              <p className={`text-2xl font-bold ${c.color.split(' ')[0]}`}>{c.value}</p>
              <p className="text-xs text-brand-slate-500 mt-0.5">{c.sub}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Alerts */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <h2 className="font-semibold text-brand-slate-900">Alertes réglementaires</h2>
            <div className="flex gap-2 flex-wrap">
              {(['all','high','medium','low'] as const).map(f => (
                <button key={f} onClick={() => setFilter(f)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${filter === f ? 'bg-brand-green-500 text-white' : 'bg-brand-slate-100 text-brand-slate-600 hover:bg-brand-slate-200'}`}>
                  {f === 'all' ? 'Toutes' : f === 'high' ? 'Critiques' : f === 'medium' ? 'Moyennes' : 'Basses'}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            {filtered.map(alert => (
              <div key={alert.id} className={`card border-l-4 ${alert.severity === 'high' ? 'border-l-red-500' : alert.severity === 'medium' ? 'border-l-orange-400' : 'border-l-green-400'}`}>
                <div className="card-body">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-2">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium text-white" style={{ backgroundColor: alert.frameworkColor }}>
                          {alert.framework}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-xs font-medium border ${sevColor[alert.severity]}`}>
                          {alert.severity === 'high' ? '⚠ Critique' : alert.severity === 'medium' ? '◉ Moyen' : '● Bas'}
                        </span>
                        {alert.isNew && <span className="px-2 py-0.5 rounded text-xs font-medium bg-brand-blue-100 text-brand-blue-700">Nouveau</span>}
                      </div>
                      <h3 className="font-semibold text-brand-slate-900 text-sm">{alert.title}</h3>
                      <p className="text-sm text-brand-slate-600 mt-1 leading-relaxed">{alert.description}</p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-brand-slate-400">
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{new Date(alert.date).toLocaleDateString('fr-FR')}</span>
                        {alert.deadline && <span className="flex items-center gap-1 text-orange-600"><Calendar className="w-3 h-3" />Échéance : {new Date(alert.deadline).toLocaleDateString('fr-FR')}</span>}
                      </div>
                    </div>
                    {alert.sourceUrl && (
                      <a href={alert.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-brand-slate-400 hover:text-brand-green-600 flex-shrink-0">
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {filtered.length === 0 && <div className="card card-body text-center py-8 text-brand-slate-400">Aucune alerte pour ce filtre</div>}
          </div>
        </div>

        {/* Deadlines sidebar */}
        <div className="space-y-4">
          <h2 className="font-semibold text-brand-slate-900">Calendrier des échéances</h2>
          <div className="space-y-3">
            {deadlines.map(d => {
              const urgent = d.daysLeft <= 30;
              const soon = d.daysLeft <= 90;
              return (
                <div key={d.id} className={`card border-l-4 ${urgent ? 'border-l-red-500 bg-red-50' : soon ? 'border-l-orange-400 bg-orange-50' : 'border-l-brand-green-400 bg-brand-green-50'}`}>
                  <div className="card-body py-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium text-white mb-1" style={{ backgroundColor: d.color }}>{d.framework}</span>
                        <p className="text-sm font-medium text-brand-slate-900">{d.title}</p>
                        <p className="text-xs text-brand-slate-500 mt-0.5">{new Date(d.date).toLocaleDateString('fr-FR')} · {typeLabel[d.type]}</p>
                      </div>
                      <div className={`text-right flex-shrink-0 ml-2 ${urgent ? 'text-red-600' : soon ? 'text-orange-600' : 'text-brand-green-600'}`}>
                        <p className="text-lg font-bold">J-{d.daysLeft}</p>
                        {urgent && <CheckCircle className="w-4 h-4 mx-auto mt-0.5" />}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
            {deadlines.length === 0 && <div className="card card-body text-center py-6 text-brand-slate-400 text-sm">Aucune échéance à venir</div>}
          </div>

          <div className="card bg-brand-slate-50">
            <div className="card-body py-3">
              <p className="text-xs font-medium text-brand-slate-500 uppercase tracking-wide mb-2">Sources surveillées</p>
              {[{n:'ANSSI',u:'ssi.gouv.fr'},{n:'ENISA',u:'enisa.europa.eu'},{n:'EUR-Lex',u:'eur-lex.europa.eu'},{n:'CNIL',u:'cnil.fr'},{n:'EBA/ESMA',u:'eba.europa.eu'}].map(s => (
                <div key={s.n} className="flex items-center justify-between py-1.5 border-b border-brand-slate-200 last:border-0">
                  <span className="text-sm text-brand-slate-700">{s.n}</span>
                  <span className="text-xs text-brand-slate-400">{s.u}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
