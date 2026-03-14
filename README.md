Unifee - app privée avec scan de facture

Ce bundle contient :
- une app privée avec code d'accès
- un formulaire d'audit électricité
- un scan de photo de facture
- un préremplissage automatique des champs
- un calcul des économies

Installation
1. npm install
2. copier .env.example vers .env
3. renseigner OPENAI_API_KEY
4. npm start
5. ouvrir http://localhost:3000

Pour la mise en ligne
- déployer sur Render, Railway, Fly.io, Vercel (avec backend Node supporté)
- ou sur un VPS simple
- partager uniquement l'URL à ton équipe

Important
- la clé API doit rester côté serveur
- le code d'accès UNIFEE2026 est une démo
- pour la production, prévoir une vraie authentification
