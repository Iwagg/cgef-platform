# Mettre en route CGEF Platform avec Supabase

Ce guide part de zéro : aucun compte, aucune base de données. Comptez environ 15 minutes.

## 1. Créer un projet Supabase (gratuit)

1. Allez sur <https://supabase.com> et cliquez sur **Start your project**. Créez un compte (GitHub ou e-mail).
2. Cliquez sur **New project** :
   - **Name** : `cgef-platform`
   - **Database Password** : générez-en un et conservez-le dans un gestionnaire de mots de passe
   - **Region** : *West EU (Paris)* ou *Central EU (Frankfurt)* (données hébergées en Europe, utile pour le RGPD)
   - Plan **Free**
3. Patientez environ 2 minutes, le temps que le projet soit prêt.

## 2. Créer la base de données (migrations)

1. Dans le menu de gauche du projet, ouvrez **SQL Editor**, puis **New query**.
2. Ouvrez le premier fichier ci-dessous dans un éditeur de texte, copiez **tout** son contenu, collez-le dans l'éditeur SQL et cliquez sur **Run**. Attendez le message `Success`.
3. Recommencez avec chaque fichier, **dans cet ordre exact** :

   | # | Fichier (dossier `supabase/migrations/`) |
   |---|---|
   | 1 | `20260301000000_base_schema.sql` |
   | 2 | `20260328025316_fix_security_and_performance_issues.sql` |
   | 3 | `20260404012444_cleanup_unused_indexes_and_merge_policies.sql` |
   | 4 | `20260405000000_complete_schema.sql` |
   | 5 | `20260509121548_fix_handle_new_user_execute_permissions.sql` |
   | 6 | `20261022000000_grc_modules.sql` |

   Si une étape affiche une erreur, arrêtez-vous et notez le message : les migrations suivantes dépendent des précédentes.

4. Vérification : ouvrez **Table Editor**. Vous devez voir entre autres `organizations`, `profiles`, `risks`, `controls`, `incidents`, `evidences`, `policy_documents`. Dans **Storage**, un bucket privé `evidence` doit exister.

## 3. Configurer l'authentification

Dans **Authentication → Sign In / Providers → Email** :

- Pour **tester en local**, vous pouvez désactiver **Confirm email**. Sinon, chaque nouvel utilisateur doit cliquer sur le lien reçu par e-mail avant de pouvoir se connecter.
- En **production**, laissez la confirmation activée et configurez un serveur SMTP (**Authentication → Emails → SMTP Settings**). L'envoi d'e-mails intégré à Supabase est limité à quelques messages par heure.

Dans **Authentication → URL Configuration**, mettez **Site URL** à `http://localhost:5173` pendant le développement, puis à l'URL de production une fois l'application déployée.

## 4. Relier l'application au projet

1. Dans Supabase : **Project Settings → API** (ou **Data API**). Copiez :
   - **Project URL** (`https://xxxx.supabase.co`)
   - la clé **anon public** (elle commence par `eyJ...`)

   > N'utilisez **jamais** la clé `service_role` dans l'application : elle contourne toutes les règles de sécurité.

2. À la racine du projet (`Documents\CGEF\cgef-platform`), copiez `.env.example` en `.env`, puis remplissez :

   ```
   VITE_SUPABASE_URL=https://xxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJ...
   ```

   Le fichier `.env` est ignoré par git : il ne sera jamais publié.

## 5. Lancer l'application

```bash
npm install
npm run dev
```

Ouvrez <http://localhost:5173> :

1. **Request access** : créez votre compte.
2. **Create an organisation** : vous en devenez automatiquement l'administrateur.
3. Le tableau de bord affiche une liste de démarrage : première évaluation CGEF, registre des risques, exigences NIS2/DORA/ISO 27001/RGPD, invitation de l'équipe.

## 6. Inviter des collègues

**Settings → Team & Roles** affiche l'**ID de l'organisation**. Votre collègue crée son compte, choisit **Join an organisation** et colle cet ID. Il arrive avec le rôle *Analyst*, que vous pouvez modifier dans le même écran.

| Rôle | Droits |
|---|---|
| Analyst | Créer et modifier des fiches, mener des évaluations |
| Manager | + supprimer, approuver politiques et preuves, exporter les rapports PDF |
| CISO | + paramètres de l'organisation, rôles de l'équipe, journal d'audit |
| Admin | Contrôle total, dont le retrait de membres |

Ces droits sont appliqués **dans la base de données** (Row Level Security), pas seulement dans l'interface.

## 7. Mise en production (facultatif)

```bash
npm run build
```

Le dossier `dist/` contient un site statique, hébergeable sur Netlify, Vercel ou Cloudflare Pages. Sur l'hébergeur, définissez `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY`, et configurez une redirection de toutes les routes vers `index.html` (application monopage). Pensez à mettre à jour **Site URL** dans Supabase.

## Dépannage

| Symptôme | Cause probable |
|---|---|
| Écran « Supabase is not configured » | `.env` absent ou mal nommé, ou `npm run dev` pas relancé après sa création |
| « Email not confirmed » à la connexion | Confirmation d'e-mail activée : cliquez le lien reçu, ou désactivez-la pour les tests (étape 3) |
| `relation "..." does not exist` | Une migration n'a pas été exécutée, ou l'ordre n'a pas été respecté |
| « Delete refused: manager role or higher required » | Comportement voulu : un analyste ne peut pas supprimer de fiches |
| L'envoi d'une preuve échoue | La migration 6 (bucket `evidence`) n'a pas été exécutée, ou le fichier dépasse 50 Mo |
