# Refonte de la vitrine Kalagban

Branche de travail : codex/refonte-mode. Base : 20cffce672f56a30f838aaff3cdf1ab6fa55a3fc.

## Changements

- Accueil mode, navigation persistante, présentation des collections, catalogue à quatre colonnes sur grand écran et deux sur mobile.
- Recherche combinée aux filtres de catégorie et de budget ; tri par prix ; sélection des prix réduits et budget de 10 000 FCFA.
- Liens Chaussures et Accessoires résolus par les sous-catégories existantes.
- Cartes produits avec photos au format 3:4, chargement différé et actions panier/favoris conservées.
- Arrêt du chargement au bout de 15 secondes en cas de requêtes indisponibles et bouton de nouvelle tentative.
- Les campagnes actives, leurs prix, la modération et les liens vers les espaces existants sont conservés.
- Suppression du compteur de vente flash qui redémarrait artificiellement.

## Limites et points à revoir

- Le nouvel accueil remplace les anciens blocs CMS hero_section, category_bubbles, promo_banner et flash_sale_timer ; leurs réglages ne pilotent plus la mise en page. Les réglages top_banner et popup_banner restent consommés. Les campagnes promotionnelles actives restent affichées et leurs prix appliqués.
- Les photographies proviennent des fichiers déjà présents dans le dépôt. Prévoir ensuite les photographies produit et les collections définitives, y compris les styles autres que le wax.
- La page produit détaillée, le paiement et les applications mobiles ne font pas partie de cette première version.
- Aucun accès Supabase/Vercel de production n'a été ajouté. Sans variables locales Supabase, la prévisualisation ne permet pas de valider les produits réels, l'authentification ou un paiement.
- La nouvelle navigation et les cartes sont partagées avec les autres pages ; vérifier leurs parcours dans un déploiement de prévisualisation Vercel avant intégration.

## Vérifications

- TypeScript : npx tsc --noEmit -p apps/web-buyer/tsconfig.json — réussi.
- Production : npm run build --workspace web-buyer — réussi, 25 pages statiques générées.
- git diff --check — réussi.
- Contrôle navigateur sur le HTML pré-rendu et les assets du build : accueil ordinateur, présentation dans un cadre mobile de 390 px, bouton budget 10 000 FCFA, sélection du tri par prix et affichage de l'état indisponible.
- Le serveur de développement n'a pas pu être lancé avec le gestionnaire de prévisualisation. La vérification visuelle utilise les fichiers pré-rendus du build ; les routes serveur et les données de production restent non testées.

## Intégration

Les changements sont préparés localement ; ils n'ont pas été envoyés sur GitHub ni déployés sur kalagban.com. Appliquer la branche ou le patch dans le dépôt, créer une prévisualisation Vercel avec les variables existantes puis vérifier catalogue, recherche, favoris, panier et accès aux catégories avant fusion.
