import { useEffect, useState, useCallback } from 'react';
import { FileText, Download, Clock, CheckCircle2, Loader2, TrendingUp, Shield, Target, BarChart3 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/auth';
import { PILLARS, FRAMEWORKS } from '../lib/cgef-framework';
import { getCGSTierColor, getCGSTierLabel } from '../lib/scoring';
import type { Assessment, AssessmentScore } from '../lib/types';

interface ReportData {
  assessment: Assessment;
  score: AssessmentScore;
}

export function Reporting() {
  const { organization } = useAuthStore();
  const [reports, setReports] = useState<ReportData[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState<string | null>(null);

  const fetchReports = useCallback(async () => {
    if (!organization?.id) { setLoading(false); return; }
    try {
      const { data: assessments } = await supabase
        .from('assessments')
        .select('*')
        .eq('organization_id', organization.id)
        .eq('status', 'completed')
        .order('completed_at', { ascending: false });

      if (!assessments?.length) { setLoading(false); return; }

      const scores = await Promise.all(
        assessments.map(a =>
          supabase.from('assessment_scores')
            .select('*').eq('assessment_id', a.id)
            .order('computed_at', { ascending: false }).limit(1).maybeSingle()
        )
      );

      const combined: ReportData[] = assessments
        .map((a, i) => ({ assessment: a, score: scores[i]?.data }))
        .filter(r => r.score) as ReportData[];

      setReports(combined);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [organization?.id]);

  useEffect(() => { fetchReports(); }, [fetchReports]);

  async function generatePDF(data: ReportData) {
    setGenerating(data.assessment.id);
    try {
      // Dynamic import jspdf
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const { score, assessment } = data;

      const green = [46, 125, 50];
      const slate = [15, 23, 42];
      const muted = [100, 116, 139];
      const w = 210;

      // ── COVER PAGE ──────────────────────────────────────────────
      doc.setFillColor(...slate as [number,number,number]);
      doc.rect(0, 0, w, 297, 'F');

      doc.setFillColor(...green as [number,number,number]);
      doc.rect(0, 0, 8, 297, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(28);
      doc.setFont('helvetica', 'bold');
      doc.text('CGEF Platform®', 20, 40);

      doc.setFontSize(14);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...muted as [number,number,number]);
      doc.text('Horizons Gov Advisors', 20, 50);

      doc.setFillColor(...green as [number,number,number]);
      doc.rect(20, 60, 160, 0.5, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(22);
      doc.setFont('helvetica', 'bold');
      doc.text('Board Pack', 20, 80);
      doc.setFontSize(16);
      doc.setFont('helvetica', 'normal');
      doc.text('Rapport de Gouvernance Cybersécurité', 20, 92);

      doc.setFontSize(11);
      doc.setTextColor(...muted as [number,number,number]);
      doc.text(`Organisation : ${organization?.name || 'N/A'}`, 20, 110);
      doc.text(`Évaluation : ${assessment.name}`, 20, 118);
      doc.text(`Date : ${new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}`, 20, 126);
      doc.text(`Statut : CONFIDENTIEL`, 20, 134);

      // CGS Score box
      const tierColor = getCGSTierColor(score.cgs_tier);
      const tierRgb = tierColor.startsWith('#') ?
        [parseInt(tierColor.slice(1,3),16), parseInt(tierColor.slice(3,5),16), parseInt(tierColor.slice(5,7),16)] :
        [13, 71, 161];
      doc.setFillColor(...tierRgb as [number,number,number]);
      doc.roundedRect(20, 150, 80, 50, 4, 4, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(36);
      doc.setFont('helvetica', 'bold');
      doc.text(score.cgs_tier, 37, 180);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text('Cyber Governance Score®', 22, 193);

      doc.setFillColor(18, 34, 24);
      doc.roundedRect(110, 150, 80, 50, 4, 4, 'F');
      doc.setTextColor(129, 199, 132);
      doc.setFontSize(30);
      doc.setFont('helvetica', 'bold');
      doc.text(`${score.global_score.toFixed(2)}/5`, 118, 178);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text('Score Global', 118, 190);
      doc.text(`CMI™ : ${score.cmi_index}/100`, 118, 196);

      doc.setFillColor(...green as [number,number,number]);
      doc.rect(0, 285, w, 12, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(8);
      doc.text('STRICTLY CONFIDENTIAL — Horizons Gov Advisors — CGEF Platform® v1.0', 20, 293);

      // ── PAGE 2 : SUMMARY ──────────────────────────────────────
      doc.addPage();
      doc.setFillColor(247, 248, 250);
      doc.rect(0, 0, w, 297, 'F');

      doc.setFillColor(...green as [number,number,number]);
      doc.rect(0, 0, w, 20, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(13);
      doc.setFont('helvetica', 'bold');
      doc.text('RÉSUMÉ EXÉCUTIF', 15, 13);

      doc.setTextColor(...slate as [number,number,number]);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('Scores par Pilier CGEF™', 15, 35);

      const pillarY = 42;
      PILLARS.forEach((pillar, i) => {
        const ps = score.pillar_scores[pillar.id] || 0;
        const y = pillarY + i * 22;
        const barW = Math.round((ps / 5) * 120);
        const barColor = ps >= 4 ? [13, 71, 161] : ps >= 3 ? [67, 160, 71] : ps >= 2 ? [245, 124, 0] : [211, 47, 47];

        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...muted as [number,number,number]);
        doc.text(`${pillar.id} — ${pillar.name}`, 15, y + 4);

        doc.setFillColor(226, 232, 240);
        doc.roundedRect(85, y, 120, 7, 2, 2, 'F');
        doc.setFillColor(...barColor as [number,number,number]);
        if (barW > 0) doc.roundedRect(85, y, barW, 7, 2, 2, 'F');

        doc.setTextColor(...slate as [number,number,number]);
        doc.setFont('helvetica', 'bold');
        doc.text(`${ps.toFixed(1)}`, 210, y + 6, { align: 'right' });
      });

      // Equivalence
      const eqY = pillarY + PILLARS.length * 22 + 10;
      const eqColor = score.equivalence_applies ? [232, 245, 233] : [255, 235, 238];
      const eqBorder = score.equivalence_applies ? [46, 125, 50] : [211, 47, 47];
      doc.setFillColor(...eqColor as [number,number,number]);
      doc.roundedRect(15, eqY, 180, 18, 3, 3, 'F');
      doc.setFillColor(...eqBorder as [number,number,number]);
      doc.rect(15, eqY, 2, 18, 'F');
      doc.setTextColor(...eqBorder as [number,number,number]);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text(
        score.equivalence_applies
          ? '✓ Principe d\'Équivalence CGEF™ applicable — Couverture 100% tous référentiels'
          : '⚠ Principe d\'Équivalence non applicable — Des piliers < 3.0 nécessitent attention',
        20, eqY + 11
      );

      // Coverage table
      const covY = eqY + 28;
      doc.setTextColor(...slate as [number,number,number]);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('Couverture des Référentiels', 15, covY);

      doc.setFillColor(...green as [number,number,number]);
      doc.rect(15, covY + 3, 180, 7, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(9);
      doc.text('Référentiel', 20, covY + 8.5);
      doc.text('Couverture', 130, covY + 8.5);
      doc.text('Statut', 170, covY + 8.5);

      FRAMEWORKS.slice(0, 6).forEach((fw, i) => {
        const fy = covY + 13 + i * 9;
        const bg = i % 2 === 0 ? [255, 255, 255] : [247, 248, 250];
        doc.setFillColor(...bg as [number,number,number]);
        doc.rect(15, fy - 3, 180, 9, 'F');
        doc.setTextColor(...slate as [number,number,number]);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.text(fw.name, 20, fy + 3);
        const cov = score.equivalence_applies ? 100 : Math.round(50 + score.global_score * 10);
        doc.text(`${cov}%`, 135, fy + 3);
        const statusColor = cov >= 80 ? [46, 125, 50] : cov >= 60 ? [245, 124, 0] : [211, 47, 47];
        doc.setTextColor(...statusColor as [number,number,number]);
        doc.text(cov >= 80 ? '● Conforme' : cov >= 60 ? '◉ Partiel' : '○ Non conforme', 172, fy + 3);
      });

      doc.setFillColor(...green as [number,number,number]);
      doc.rect(0, 285, w, 12, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(8);
      doc.text(`CGEF Platform® — ${organization?.name} — ${new Date().toLocaleDateString('fr-FR')} — CONFIDENTIEL`, 20, 293);

      // Save
      const filename = `CGEF_BoardPack_${(organization?.name || 'org').replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(filename);
    } catch (err) {
      console.error('PDF generation error:', err);
      alert('Erreur lors de la génération du PDF. Vérifiez que jspdf est installé.');
    } finally {
      setGenerating(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-brand-green-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-brand-slate-900">Reporting & Board Pack</h1>
        <p className="text-brand-slate-500 mt-1">
          Générez vos rapports de gouvernance cybersécurité pour le conseil d&apos;administration et les investisseurs.
        </p>
      </div>

      {/* Info cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { icon: FileText, label: 'Board Pack PDF', desc: 'Rapport complet C-suite avec score CGS®, radar 8 piliers, couverture réglementaire', color: 'text-brand-green-600 bg-brand-green-100' },
          { icon: TrendingUp, label: 'Rapport Investisseur', desc: 'Score CGS® et CMI™ formatés pour due diligence M&A et notation ESG', color: 'text-brand-blue-600 bg-brand-blue-100' },
          { icon: Shield, label: 'Rapport Réglementaire', desc: 'Mapping vers NIS2, DORA, ISO 27001, RGPD avec niveaux de couverture', color: 'text-purple-600 bg-purple-100' },
        ].map((c, i) => (
          <div key={i} className="card card-body">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${c.color}`}>
              <c.icon className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-brand-slate-900 mb-1">{c.label}</h3>
            <p className="text-sm text-brand-slate-500">{c.desc}</p>
          </div>
        ))}
      </div>

      {/* Reports list */}
      <div className="card">
        <div className="card-header">
          <h2 className="font-semibold text-brand-slate-900">Évaluations complétées</h2>
          <p className="text-sm text-brand-slate-500">Sélectionnez une évaluation pour générer un rapport</p>
        </div>
        <div className="card-body">
          {reports.length === 0 ? (
            <div className="text-center py-12">
              <BarChart3 className="w-12 h-12 text-brand-slate-300 mx-auto mb-4" />
              <p className="text-brand-slate-500 font-medium">Aucune évaluation complétée</p>
              <p className="text-brand-slate-400 text-sm mt-1">
                Complétez une évaluation CGEF™ pour générer votre premier Board Pack.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {reports.map((r) => {
                const tierColor = getCGSTierColor(r.score.cgs_tier);
                const isGen = generating === r.assessment.id;
                return (
                  <div key={r.assessment.id} className="border border-brand-slate-200 rounded-xl p-5 hover:border-brand-green-300 transition-colors">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2">
                          <span
                            className="px-2.5 py-1 rounded-lg text-sm font-bold text-white"
                            style={{ backgroundColor: tierColor }}
                          >
                            {r.score.cgs_tier}
                          </span>
                          <span className="font-semibold text-brand-slate-900 truncate">{r.assessment.name}</span>
                        </div>
                        <div className="flex flex-wrap gap-4 text-sm text-brand-slate-500">
                          <span className="flex items-center gap-1">
                            <Target className="w-4 h-4" />
                            Score : {r.score.global_score.toFixed(2)}/5 — CMI™ {r.score.cmi_index}/100
                          </span>
                          <span className="flex items-center gap-1">
                            <CheckCircle2 className="w-4 h-4 text-brand-green-500" />
                            {getCGSTierLabel(r.score.cgs_tier)}
                          </span>
                          {r.score.equivalence_applies && (
                            <span className="text-brand-green-600 font-medium">✓ Principe d&apos;Équivalence</span>
                          )}
                          <span className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {r.assessment.completed_at
                              ? new Date(r.assessment.completed_at).toLocaleDateString('fr-FR')
                              : 'N/A'}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => generatePDF(r)}
                        disabled={isGen}
                        className="btn-primary flex items-center gap-2 flex-shrink-0"
                      >
                        {isGen ? (
                          <><Loader2 className="w-4 h-4 animate-spin" /> Génération...</>
                        ) : (
                          <><Download className="w-4 h-4" /> Board Pack PDF</>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
