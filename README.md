# CGEF Platform® — Horizons Gov Advisors

Plateforme SaaS de gouvernance cybersécurité de niveau institutionnel.

[![CI/CD](https://github.com/Iwagg/cgef-platform/actions/workflows/ci.yml/badge.svg)](https://github.com/Iwagg/cgef-platform/actions)

## Stack Technique

- **Frontend** : React 18 + TypeScript 5.5 + Vite + Tailwind CSS
- **Backend** : Supabase (Auth, PostgreSQL, RLS)
- **Scoring** : Moteur CGEF™ — 120 processus, 8 piliers, CGS® / CMI™
- **PDF** : jsPDF (génération Board Pack côté client)
- **État** : Zustand + React Hook Form

## Installation

```bash
# 1. Cloner
git clone https://github.com/Iwagg/cgef-platform.git
cd cgef-platform

# 2. Installer les dépendances
npm install

# 3. Configurer les variables d'environnement
cp .env.example .env
# Remplir VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY

# 4. Appliquer les migrations Supabase
# Dans Supabase Dashboard > SQL Editor, exécuter les migrations dans l'ordre :
# supabase/migrations/20260328...sql
# supabase/migrations/20260404...sql
# supabase/migrations/20260405000000_complete_schema.sql  ← NOUVEAU

# 5. Lancer le serveur de développement
npm run dev
```

## Variables d'Environnement

| Variable | Requis | Description |
|---|---|---|
| `VITE_SUPABASE_URL` | ✓ | URL de votre projet Supabase |
| `VITE_SUPABASE_ANON_KEY` | ✓ | Clé anonyme Supabase |

## Architecture

```
src/
├── components/
│   ├── layout/          # AppLayout, Sidebar
│   ├── ErrorBoundary    # Gestion d'erreurs globale
│   └── RBACGuard        # Contrôle d'accès par rôle
├── lib/
│   ├── cgef-framework   # 120 processus CGEF™ (8 piliers)
│   ├── scoring          # Moteur CGS® / CMI™
│   ├── rbac             # Matrice de permissions
│   ├── supabase         # Client + helper audit
│   └── types            # Types TypeScript partagés
├── pages/
│   ├── Dashboard        # Vue d'ensemble (données réelles)
│   ├── Assessments      # Liste et gestion des évaluations
│   ├── AssessmentEvaluate # Wizard d'évaluation (autosave 30s)
│   ├── AssessmentDetail # Résultats et score CGS®
│   ├── Compliance       # Couverture réglementaire (calculée)
│   ├── ActionPlans      # Plans d'action RACI
│   ├── Reporting        # Board Pack PDF (jsPDF)
│   ├── RegulatoryIntel  # Veille réglementaire NIS2/DORA
│   ├── Onboarding       # Création/join d'organisation
│   └── Settings         # Profil, org, notifications, MFA
└── stores/
    └── auth             # Auth + org + MFA (Zustand)
```

## Référentiels supportés

| Code | Nom | Contrôles |
|---|---|---|
| ISO27001_2022 | ISO 27001:2022 | 93 |
| NIS2 | Directive NIS2 | 21 |
| DORA | DORA (secteur financier) | 30 |
| RGPD | RGPD | 99 |
| NIST_CSF_2 | NIST CSF 2.0 | 106 |
| CIS_V8 | CIS Controls v8.1 | 153 |
| SOC2 | SOC 2 Type II | 64 |
| PCI_DSS_V4 | PCI-DSS v4.0 | 281 |

## Scripts

```bash
npm run dev        # Serveur développement
npm run build      # Build production
npm run type-check # Vérification TypeScript
npm run lint       # ESLint
```

## Identifiant Organisation

Pour inviter un collaborateur, partagez l'**ID Organisation** disponible dans
**Paramètres > Organisation**. Votre collègue saisit cet UUID lors de son inscription.

---

© 2025 Horizons Gov Advisors — STRICTLY CONFIDENTIAL
