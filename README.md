# Latch.js

**Une seule bibliothèque pour les interactions serveur et la réactivité locale de vos applications web.**

Latch.js ajoute des comportements à votre HTML grâce à des attributs `lt-*`. Vous conservez votre backend, vos templates, vos routes et votre CSS. Le navigateur peut alors charger un fragment HTML, envoyer un formulaire, rafraîchir un tableau, ouvrir une modale ou mettre à jour un état local sans application SPA ni framework de composants.

L'ambition : couvrir, dans les applications web classiques, le terrain habituellement partagé entre **HTMX** (échanges serveur) et **Alpine.js** (réactivité et interactions locales). Il ne s'agit **pas** d'une compatibilité à 100 % avec leurs API ou leurs extensions. Les limites sont détaillées plus bas.

**[Découvrir la démo interactive](https://titomus.github.io/latchjs/)** · **[Lancer les benchmarks](https://titomus.github.io/latchjs/benchmark.html)** · **[État de la parité HTMX + Alpine](PARITY.md)**

> **Statut : version expérimentale 0.1.0.** L'API peut encore évoluer. Les exemples ci-dessous correspondent au code actuellement présent dans le dépôt ; les chemins `/api/...` désignent des endpoints à créer dans **votre** application.

## Sommaire

- [Pourquoi utiliser Latch.js ?](#pourquoi-utiliser-latchjs-)
- [Installation et premier essai](#installation-et-premier-essai)
- [1. Charger un fragment HTML depuis le serveur](#1-charger-un-fragment-html-depuis-le-serveur)
- [2. Créer un client avec un formulaire](#2-créer-un-client-avec-un-formulaire)
- [3. Supprimer une ligne avec confirmation](#3-supprimer-une-ligne-avec-confirmation)
- [4. Recherche instantanée](#4-recherche-instantanée)
- [5. Tableau avec recherche, filtres, tri et pagination](#5-tableau-avec-recherche-filtres-tri-et-pagination)
- [6. État réactif : calculateur, formulaires et événements](#6-état-réactif--calculateur-formulaires-et-événements)
- [7. Liste dynamique avec clés stables](#7-liste-dynamique-avec-clés-stables)
- [8. Affichage conditionnel et montage du DOM](#8-affichage-conditionnel-et-montage-du-dom)
- [9. Modales, tiroirs, onglets et notifications](#9-modales-tiroirs-onglets-et-notifications)
- [10. Actualiser plusieurs zones après une action](#10-actualiser-plusieurs-zones-après-une-action)
- [Référence des attributs](#référence-des-attributs)
- [API JavaScript et configuration](#api-javascript-et-configuration)
- [Exemple backend : PHP sans framework](#exemple-backend--php-sans-framework)
- [Sécurité et limites actuelles](#sécurité-et-limites-actuelles)
- [Performances, tests et contribution](#performances-tests-et-contribution)

## Pourquoi utiliser Latch.js ?

Imaginez un espace d'administration, un extranet client, un outil interne ou un SaaS développé avec PHP, FlightPHP, Symfony, Laravel, WordPress ou un autre backend HTML.

Vous avez besoin de :

- rechercher, filtrer et paginer sans recharger la page entière ;
- envoyer un formulaire et afficher les erreurs retournées par le serveur ;
- supprimer une ligne avec confirmation et rafraîchir un tableau ;
- ouvrir une fiche client en modale ;
- afficher un calcul de prix immédiatement, sans requête réseau ;
- gérer une liste d'éléments réactifs côté navigateur.

Avec Latch, le **serveur produit toujours les données et les fragments HTML**, et le navigateur n'ajoute que le comportement nécessaire. Pas de DOM virtuel, pas de routeur SPA obligatoire, pas de dépendance à Tailwind : votre choix CSS reste libre.

| Besoin | Dans Latch.js |
| --- | --- |
| Interactions HTTP + HTML partiel | `lt-get`, `lt-post`, `lt-delete`, `lt-target`, `lt-swap` |
| Réactivité locale | `lt-state`, `lt-text`, `lt-click`, `lt-model` |
| Listes dynamiques | `lt-for`, `lt-key` |
| DOM conditionnel | `lt-show`, `lt-if`, `lt-when` |
| Recherche, tri, filtres, pagination | `lt-table` et directives associées |
| Formulaires et erreurs | `lt-form`, `lt-error-target` |
| Interface | Modales, tiroirs, onglets, accordéons, notifications |
| Orchestration | Événements, `lt-refresh-on`, en-têtes `X-Latch-*` |

**Règle pratique :** ce qui doit être sauvegardé ou partagé avec d'autres utilisateurs reste côté serveur. Ce qui est temporaire (champ actif, sélection d'onglet, compteur, affichage d'un panneau) peut rester dans `lt-state`.

## Installation et premier essai

### Construire la bibliothèque depuis le dépôt

Le projet est disponible sur GitHub. Pour travailler avec **la version de ce dépôt** sans supposer qu'un paquet npm public a été publié :

```bash
git clone https://github.com/titomus/latchjs.git
cd latchjs
npm ci
npm run build
```

Les fichiers compilés sont créés dans `dist/` :

- `dist/latch.js` : bundle navigateur ;
- `dist/latch.min.js` : bundle minifié ;
- `dist/latch.esm.js` : module ES.

Copiez, par exemple, `dist/latch.min.js` dans `public/assets/latch.min.js` de votre projet.

### Première page HTML

```html
<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <title>Ma première page Latch</title>
</head>
<body>
  <div lt-state="{ compteur: 0 }">
    <button type="button" lt-click="compteur += 1">
      Ajouter
    </button>
    <strong lt-text="compteur">0</strong>
  </div>

  <script src="/assets/latch.min.js"></script>
  <script>Latch.start();</script>
</body>
</html>
```

Le compteur se met à jour **sans appel au serveur**. Latch initialise les directives avec `Latch.start()`. Ce script est placé après le HTML ; si vous chargez votre bundle avec `defer` dans le `head`, déclenchez l'initialisation après le chargement du DOM.

### Avec un bundler et le module ES compilé

```js
import { Latch } from "./dist/latch.esm.js";

Latch.start();
```

Le chemin d'import doit être adapté à votre arborescence et à votre outil de compilation.

## 1. Charger un fragment HTML depuis le serveur

**Cas concret :** un utilisateur clique sur « Voir les dernières commandes ». Votre endpoint renvoie uniquement le contenu à afficher.

```html
<button
  type="button"
  lt-get="/api/commandes/recentes"
  lt-target="#dernieres-commandes"
  lt-swap="innerHTML"
  lt-loading="Chargement..."
  lt-disabled-while="request">
  Voir les commandes
</button>

<div id="dernieres-commandes">
  Cliquez pour afficher les commandes.
</div>
```

Réponse HTTP attendue :

```http
HTTP/1.1 200 OK
Content-Type: text/html; charset=utf-8

<ul>
  <li>Commande #1042 : 49 €</li>
  <li>Commande #1043 : 89 €</li>
</ul>
```

Latch effectue le `GET`, remplace le contenu de `#dernieres-commandes` et initialise les directives `lt-*` éventuellement présentes dans le HTML reçu.

**Modes de remplacement (`lt-swap`) :** `innerHTML` (par défaut), `outerHTML`, `beforebegin`, `afterbegin`, `beforeend`, `afterend`, `remove` et `none`.

Le remplacement exige une **réponse réussie** dont le `Content-Type` contient `text/html`. Une réponse JSON n'est pas injectée dans le DOM comme du HTML.

## 2. Créer un client avec un formulaire

**Cas concret :** ajouter un contact à votre CRM sans recharger la page, en gérant la validation navigateur et les erreurs métier.

```html
<form
  lt-form
  lt-post="/api/clients"
  lt-target="#resultat-creation"
  lt-error-target="#erreurs-client"
  lt-reset-on-success
  lt-toast-success="Client enregistré">

  <div id="erreurs-client" role="alert"></div>

  <label for="client-nom">Nom</label>
  <input id="client-nom" name="nom" required minlength="2">
  <small data-latch-error-for="nom"></small>

  <label for="client-email">Email</label>
  <input id="client-email" name="email" type="email" required>
  <small data-latch-error-for="email"></small>

  <button type="submit">Créer le client</button>
</form>

<div id="resultat-creation" aria-live="polite"></div>
```

**Point important pour les développeurs PHP :** lorsqu'il n'y a pas de champ fichier, Latch sérialise actuellement les données du formulaire en **JSON** pour un `POST`, `PUT` ou `PATCH`. Vous les lirez avec `php://input`, et non avec `$_POST`. Pour un formulaire avec `input type="file"`, Latch utilise `FormData`.

En cas d'erreur de validation côté serveur, renvoyez un statut **422** et un corps JSON :

```json
{
  "message": "Vérifiez les champs.",
  "errors": {
    "email": "Cette adresse existe déjà."
  }
}
```

Avec `Content-Type: application/json`, Latch associe les erreurs aux champs `name` correspondants et aux éléments `data-latch-error-for`.

En cas de succès, renvoyez par exemple :

```http
HTTP/1.1 201 Created
Content-Type: text/html; charset=utf-8
X-Latch-Event: client:created

<p>Le client a été ajouté.</p>
```

Le formulaire est réinitialisé, la notification s'affiche et l'événement `client:created` peut déclencher le rafraîchissement d'autres blocs.

## 3. Supprimer une ligne avec confirmation

**Cas concret :** retirer un client d'un tableau après confirmation.

```html
<tr id="client-42">
  <td>Martin Dupont</td>
  <td>
    <button
      type="button"
      lt-delete="/api/clients/42"
      lt-target="#client-42"
      lt-swap="remove"
      lt-confirm="Supprimer ce client ?"
      lt-confirm-title="Confirmation de suppression"
      lt-confirm-confirm-text="Supprimer"
      lt-confirm-cancel-text="Annuler"
      lt-confirm-tone="danger"
      lt-toast-success="Client supprimé">
      Supprimer
    </button>
  </td>
</tr>
```

La ligne n'est retirée **qu'après une réponse HTTP réussie**. Pour le mode `remove` avec l'implémentation actuelle, prévoyez une réponse réussie avec `Content-Type: text/html`, même si le corps est vide. Un simple `204 No Content` ne déclenche pas ce remplacement HTML.

Le backend doit vérifier les permissions et effectuer la suppression réelle ; Latch n'est qu'une couche d'interface.

## 4. Recherche instantanée

**Cas concret :** proposer un autocompléteur de produits depuis votre backend.

```html
<label for="recherche-produit">Rechercher un produit</label>
<input
  id="recherche-produit"
  type="search"
  name="q"
  lt-get="/api/produits/recherche"
  lt-trigger="input delay:300ms"
  lt-target="#suggestions"
  placeholder="Nom ou référence">

<div id="suggestions" aria-live="polite"></div>
```

Le navigateur appelle notamment `/api/produits/recherche?q=clavier`. Le serveur renvoie un fragment HTML avec les produits trouvés.

Le délai évite un appel à chaque frappe. Pour les requêtes `GET` successives émises par un même élément, Latch annule la requête précédente et ignore une réponse devenue obsolète.

Autres déclencheurs utiles :

| `lt-trigger` | Comportement |
| --- | --- |
| `click` | Clic |
| `submit` | Envoi du formulaire |
| `change` | Changement de champ |
| `input delay:300ms` | Saisie temporisée |
| `load` | Chargement initial |
| `revealed` ou `intersect` | Apparition dans le viewport |
| `every:10s` | Actualisation périodique |
| `client:updated` | Événement applicatif |

Utilisez les appels périodiques avec discernement : ils créent de vraies requêtes réseau.

## 5. Tableau avec recherche, filtres, tri et pagination

**Cas concret :** la liste des factures dans un back-office. Vous gérez toujours la requête SQL, le tri et la pagination côté backend.

```html
<section
  lt-table
  lt-source="/admin/factures/fragment"
  lt-target="#factures-resultats"
  lt-sync-url
  lt-refresh-on="facture:created facture:updated">

  <input
    type="search"
    lt-table-search
    placeholder="Rechercher une facture">

  <select lt-table-filter="statut">
    <option value="">Tous les statuts</option>
    <option value="payee">Payée</option>
    <option value="attente">En attente</option>
  </select>

  <div id="factures-resultats"></div>
</section>
```

Latch appelle `/admin/factures/fragment` en ajoutant selon les actions :

- `q` : recherche textuelle ;
- `statut` : filtre provenant du sélecteur ;
- `sort` et `order` : colonne et sens du tri ;
- `page` : numéro de page.

Exemple de **fragment HTML renvoyé par le serveur** :

```html
<table>
  <thead>
    <tr>
      <th>
        <button type="button" lt-table-sort="numero">
          Numéro ↕
        </button>
      </th>
      <th>Montant</th>
      <th>Statut</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>F-2026-0142</td>
      <td>129 €</td>
      <td>Payée</td>
    </tr>
  </tbody>
</table>

<nav aria-label="Pagination">
  <button type="button" lt-table-page="prev">Précédent</button>
  <button type="button" lt-table-page="next">Suivant</button>
</nav>
```

Le tri et la pagination peuvent se trouver dans le fragment injecté : Latch délègue les clics au conteneur `lt-table`. La recherche est temporisée ; le tableau évite également qu'une ancienne réponse écrase les résultats plus récents.

`lt-sync-url` met les paramètres du tableau dans l'URL. C'est pratique pour partager un filtre ou revenir à un état de recherche.

## 6. État réactif : calculateur, formulaires et événements

### Calculer un tarif sans appel réseau

```html
<div lt-state="{ sites: 3, annuel: false }">
  <button type="button" lt-click="sites = sites > 1 ? sites - 1 : 1">−</button>
  <strong lt-text="sites"></strong>
  <button type="button" lt-click="sites += 1">+</button>

  <label>
    <input type="checkbox" lt-model="annuel">
    Facturation annuelle
  </label>

  <p>
    Total : <strong lt-text="sites * (annuel ? 29 : 39)"></strong> €
  </p>
  <span lt-show="annuel">Tarif annuel activé</span>
</div>
```

`lt-state` définit l'état local, `lt-click` modifie cet état, `lt-model` synchronise le champ et `lt-text` met à jour le résultat. Vous n'avez pas besoin d'une route serveur pour une opération purement locale.

### Exécuter une action lors d'un événement

```html
<div lt-state="{ recherche: '', compteur: 0 }"
     lt-init="compteur = 1">

  <input
    type="search"
    lt-on:input.debounce.250ms="recherche = $el.value">

  <button
    type="button"
    lt-on:click.prevent.once="compteur += 1">
    Exécuter une fois
  </button>

  <span lt-text="recherche"></span>
  <span lt-text="compteur"></span>
</div>
```

`lt-init` exécute son expression à l'initialisation. `lt-on:événement` prend en charge les modificateurs `prevent`, `stop`, `self`, `once`, `window`, `document` et `debounce.Nms`.

Vous pouvez accéder notamment à `$el` (l'élément), `$event` (l'événement) et `$store` (les états partagés déclarés via l'API).

## 7. Liste dynamique avec clés stables

**Cas concret :** gérer une liste de tâches directement dans une fiche projet.

```html
<div lt-state="{
  prochaineId: 3,
  taches: [
    { id: 1, titre: 'Créer la maquette', fait: true },
    { id: 2, titre: 'Intégrer la page', fait: false }
  ]
}">
  <button
    type="button"
    lt-click="taches = [...taches, {
      id: prochaineId,
      titre: 'Nouvelle tâche',
      fait: false
    }]; prochaineId += 1">
    Ajouter une tâche
  </button>

  <p>
    À terminer :
    <strong lt-text="taches.filter(t => !t.fait).length"></strong>
  </p>

  <ul>
    <template lt-for="tache in taches" lt-key="tache.id">
      <li>
        <input type="checkbox" lt-model="tache.fait">
        <span lt-text="tache.titre"></span>
        <button type="button"
          lt-click="taches = taches.filter(t => t.id !== tache.id)">
          Retirer
        </button>
      </li>
    </template>
  </ul>
</div>
```

`lt-for` accepte `item in items` ou `(item, index) in items`. Le `lt-key` identifie chaque ligne de façon stable : un réordonnancement peut réutiliser les mêmes nœuds HTML et leurs interactions.

**À noter :** le contenu du `template` doit posséder exactement **un élément HTML racine**. La liste est locale : pour sauvegarder ces tâches, ajoutez une requête serveur.

## 8. Affichage conditionnel et montage du DOM

Deux besoins différents :

- `lt-show` et `lt-if` masquent ou affichent un élément déjà présent dans le DOM.
- `lt-when` sur un `template` **crée et retire réellement** les éléments. Les directives du bloc sont initialisées à son insertion.

```html
<div lt-state="{ afficherDetails: false }">
  <button type="button"
    lt-click="afficherDetails = !afficherDetails">
    Afficher / masquer les détails
  </button>

  <template lt-when="afficherDetails">
    <section>
      <h2>Détails du client</h2>
      <p>Ce bloc n'existe dans le DOM que lorsqu'il est ouvert.</p>
    </section>
  </template>
</div>
```

Comme pour `lt-for`, le `template` de `lt-when` contient un unique élément racine.

## 9. Modales, tiroirs, onglets et notifications

### Ouvrir une fiche dans une modale

```html
<button type="button" lt-modal="/admin/clients/42/fiche">
  Voir la fiche client
</button>

<button type="button"
        lt-drawer="/admin/clients/42/edition"
        lt-drawer-side="right">
  Modifier le client
</button>
```

Les URL renvoient du HTML qui est affiché dans une modale ou dans un panneau latéral. Les boutons, champs et directives présents dans le contenu reçu sont ensuite initialisés.

Pour une modale locale, utilisez un `template` :

```html
<button type="button" lt-modal="#modale-aide">Aide</button>

<template id="modale-aide">
  <div>
    <h2>Comment utiliser cette page ?</h2>
    <p>Renseignez les champs puis enregistrez.</p>
    <button type="button" lt-close="modal">Fermer</button>
  </div>
</template>
```

### Onglets et accordéons

```html
<div lt-tabs="profil">
  <button type="button" lt-tab="profil">Profil</button>
  <button type="button" lt-tab="facturation">Facturation</button>

  <section lt-panel="profil">Informations du client</section>
  <section lt-panel="facturation">Historique des factures</section>
</div>

<div lt-accordion>
  <button type="button" lt-accordion-trigger="question-1">
    Comment régler mon abonnement ?
  </button>
  <div lt-accordion-panel="question-1">
    Rendez-vous dans votre espace de facturation.
  </div>
</div>
```

### Une notification en un attribut

```html
<button type="button" lt-toast="Votre préférence a été prise en compte">
  Enregistrer ma préférence
</button>

<div lt-toast-container></div>
```

Pour une requête HTTP, préférez `lt-toast-success` ou `lt-toast-error` : le retour dépendra de la réussite ou de l'échec de l'appel.

## 10. Actualiser plusieurs zones après une action

**Cas concret :** après l'ajout d'une facture, actualiser la liste et un encart de chiffre d'affaires.

Sur le formulaire :

```html
<form lt-form lt-post="/api/factures" lt-target="#ajout-resultat">
  <input name="libelle" required>
  <button type="submit">Créer la facture</button>
</form>
<div id="ajout-resultat"></div>
```

Le backend peut renvoyer :

```http
HTTP/1.1 201 Created
Content-Type: text/html; charset=utf-8
X-Latch-Event: facture:created
X-Latch-Toast: Facture créée

<p>Enregistrée.</p>
```

Ailleurs dans la page :

```html
<section
  lt-get="/admin/statistiques/ca"
  lt-trigger="load"
  lt-refresh-on="facture:created"
  lt-target="#ca-resultat">
  <div id="ca-resultat"></div>
</section>

<section
  lt-table
  lt-source="/admin/factures/fragment"
  lt-target="#liste-factures"
  lt-refresh-on="facture:created">
  <div id="liste-factures"></div>
</section>
```

Un seul événement serveur relance les deux zones. Le backend reste responsable du calcul, et les composants restent découplés.

Autres en-têtes actuellement compris : `X-Latch-Toast-Type`, `X-Latch-Redirect`, `X-Latch-Close`, `X-Latch-Refresh`, `X-Latch-Replace-Url`, `X-Latch-Push-Url` et `X-Latch-Title`.

## Référence des attributs

### Requêtes et réponses

| Attribut | Rôle |
| --- | --- |
| `lt-get`, `lt-post`, `lt-put`, `lt-patch`, `lt-delete` | Appel HTTP vers une URL |
| `lt-target` | Sélecteur CSS du bloc à mettre à jour |
| `lt-swap` | Mode d'insertion/remplacement |
| `lt-trigger` | Événement déclencheur |
| `lt-params` | Paramètres additionnels en objet JSON |
| `lt-headers` | En-têtes additionnels en objet JSON |
| `lt-timeout` | Délai d'expiration de la requête en millisecondes |
| `lt-confirm` et `lt-confirm-*` | Demande de confirmation |
| `lt-loading`, `lt-disabled-while="request"`, `lt-indicator` | État de chargement |
| `lt-toast-success`, `lt-toast-error` | Retour après succès ou erreur |
| `lt-emit` | Émettre un événement après une requête réussie |
| `lt-refresh`, `lt-refresh-on` | Déclencher ou écouter des rafraîchissements |

### Formulaires

| Attribut | Rôle |
| --- | --- |
| `lt-form` | Amélioration d'un formulaire HTML |
| `lt-error-target` | Emplacement du résumé d'erreurs |
| `lt-error-class` | Classe ajoutée aux champs invalides |
| `lt-reset-on-success` | Réinitialiser le formulaire après succès |
| `lt-close-on-success` | Fermer la modale/le tiroir après succès |
| `lt-submit-on-change` | Envoyer automatiquement au changement |
| `lt-debounce` | Délai de saisie pour le formulaire automatique, en ms |
| `lt-dirty-check` | Surveillance des modifications non enregistrées |

### État local

| Attribut | Rôle |
| --- | --- |
| `lt-state` | Déclaration de l'état |
| `lt-init` | Expression exécutée une fois à l'initialisation |
| `lt-click` | Expression exécutée au clic |
| `lt-on:evenement` | Écouteur d'événement et modificateurs |
| `lt-model` | Liaison bidirectionnelle d'un champ |
| `lt-text` | Texte réactif échappé par `textContent` |
| `lt-html` | HTML réactif **de confiance seulement** |
| `lt-show`, `lt-if` | Visibilité d'un élément existant |
| `lt-when` | Montage/démontage réel d'un template |
| `lt-for`, `lt-key` | Itération réactive et identité des lignes |
| `lt-class`, `lt-bind:*` | Classes et attributs réactifs |

### Interfaces et tableaux

| Attribut | Rôle |
| --- | --- |
| `lt-modal`, `lt-drawer`, `lt-drawer-side`, `lt-close` | Superpositions et fermeture |
| `lt-dropdown`, `lt-dropdown-trigger`, `lt-dropdown-menu` | Menu déroulant |
| `lt-tabs`, `lt-tab`, `lt-panel` | Onglets |
| `lt-accordion`, `lt-accordion-trigger`, `lt-accordion-panel` | Accordéon |
| `lt-toast`, `lt-toast-container` | Notifications |
| `lt-table`, `lt-source` | Tableau dont le HTML vient du serveur |
| `lt-table-search`, `lt-table-filter`, `lt-table-sort`, `lt-table-page` | Contrôles du tableau |
| `lt-sync-url` | Synchronisation des paramètres du tableau avec l'URL |

## API JavaScript et configuration

Vous pouvez utiliser l'API lorsque les attributs ne suffisent pas.

```js
// Initialiser les éléments de la page.
Latch.start();

// Scanner un bloc HTML ajouté par votre propre code.
Latch.scan(document.querySelector("#contenu"));

// Définir un état partagé accessible avec $store.
Latch.store("session", { devise: "EUR" });

// Émettre un événement métier.
Latch.emit("facture:created", { id: 42 });

// Écouter l'événement (la fonction retournée désabonne).
const arreter = Latch.on("facture:created", (event) => {
  console.log("Facture créée", event.detail);
});

// Déclencher le rafraîchissement des zones qui savent le gérer.
Latch.refresh("#liste-factures");

// Afficher une notification.
Latch.toast("Modification enregistrée", { type: "success" });

// Ouvrir une modale à partir d'un template local.
Latch.modal("#modale-aide");

// Se désabonner quand ce n'est plus nécessaire.
arreter();
```

### Configuration des requêtes et protection CSRF

```js
Latch.configure({
  csrf: {
    header: "X-CSRF-Token",
    token: document.querySelector('meta[name="csrf-token"]')?.content
  },
  credentials: "same-origin",
  defaultSwap: "innerHTML"
});

Latch.start();
```

Ce paramétrage envoie un jeton fourni par **votre backend**. Il ne remplace pas la vérification côté serveur, ni la gestion des permissions. Les options de configuration comprennent également `prefix`, `requestHeaders` et `toastDuration`.

### Ajouter une directive personnalisée

```js
Latch.plugin((app) => {
  app.directive("focus", ({ el }) => {
    queueMicrotask(() => el.focus());
  });
});

Latch.start();
```

Vous pouvez ensuite utiliser `lt-focus` sur un champ. Consultez les exemples du dépôt pour développer des extensions plus élaborées.

## Exemple backend : PHP sans framework

Ce petit exemple illustre le contrat HTTP attendu. Pour un vrai projet, ajoutez authentification, autorisations, stockage en base et protection CSRF.

**Vue HTML :**

```html
<form
  lt-form
  lt-post="/api/clients.php"
  lt-target="#retour-api"
  lt-error-target="#erreurs-api">
  <div id="erreurs-api"></div>

  <input name="nom" required>
  <input name="email" type="email" required>
  <button type="submit">Ajouter</button>
</form>
<div id="retour-api"></div>
```

**Fichier `public/api/clients.php` :**

```php
<?php
declare(strict_types=1);

header('Content-Type: text/html; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    exit;
}

// Latch envoie du JSON pour les formulaires sans fichier.
$data = json_decode(file_get_contents('php://input'), true);
$nom = trim((string)($data['nom'] ?? ''));
$email = trim((string)($data['email'] ?? ''));

$errors = [];
if (mb_strlen($nom) < 2) {
    $errors['nom'] = 'Le nom doit contenir au moins 2 caractères.';
}
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    $errors['email'] = 'Adresse email invalide.';
}

if ($errors !== []) {
    http_response_code(422);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode([
        'message' => 'Veuillez corriger le formulaire.',
        'errors' => $errors
    ]);
    exit;
}

// À remplacer par un INSERT en base de données, après
// vérification de la session, des droits et du jeton CSRF.
http_response_code(201);
header('X-Latch-Event: client:created');

echo '<p>Client ajouté : '
    . htmlspecialchars($nom, ENT_QUOTES, 'UTF-8')
    . '</p>';
```

**Le contrat est simple :** le client envoie une requête, le backend vérifie et modifie les données, puis retourne un statut HTTP, des en-têtes et éventuellement un fragment HTML. Vous n'avez pas à sérialiser tout votre back-office en JSON pour réafficher une ligne.

La même philosophie fonctionne avec FlightPHP, Laravel, Symfony, WordPress ou un backend Node.

## Sécurité et limites actuelles

Latch reste une bibliothèque **en développement**. Avant de l'utiliser sur une application exposée au public :

1. **Expressions :** `lt-state`, `lt-click` et les autres expressions utilisent actuellement `new Function`. Ce n'est **pas un bac à sable**. N'y injectez jamais des expressions provenant d'utilisateurs ou d'une source non fiable. Une CSP stricte interdisant `unsafe-eval` n'est pas encore prise en charge.
2. **HTML :** les fragments de serveur et `lt-html` peuvent être injectés dans le DOM via `innerHTML`. Ne traitez pas du HTML utilisateur brut comme du HTML de confiance. Échappez les données dans vos templates et appliquez les règles de sécurité de votre backend.
3. **Droits :** contrôlez sur le serveur l'identité, l'accès aux ressources, la validation, le CSRF et les opérations destructrices. Masquer un bouton n'est pas une autorisation.
4. **Compatibilité :** Latch ne remplace pas automatiquement toutes les extensions de HTMX et Alpine (SSE/WebSockets, teleport, transitions avancées, etc.). `lt-if` masque un élément ; pour créer ou supprimer réellement le nœud, utilisez `lt-when`.
5. **Cycle de vie :** `Latch.stop()` arrête le statut du runtime, mais ne doit pas être considéré comme un désinstallateur complet de tous les écouteurs. Testez le montage/démontage lors de transitions complexes.
6. **État partagé :** les mutations locales de `lt-state` ne persistent pas automatiquement en base de données.

Pour un état précis des fonctionnalités couvertes, consultez **[PARITY.md](PARITY.md)** et **[AUDIT.md](AUDIT.md)**.

## Performances, tests et contribution

Le dépôt inclut une démo complète et un laboratoire de comparaison permettant de mesurer :

- les mises à jour réactives (Latch face à Alpine) ;
- les remplacements de fragments HTML (Latch face à HTMX) ;
- un parcours combiné (Latch seul face à HTMX + Alpine ensemble).

Les résultats changent selon le navigateur, le nombre de nœuds, le cache et la machine. **Aucun benchmark isolé ne prouve que Latch est plus rapide partout.** Le protocole, les versions des bibliothèques comparées et les limites sont documentés dans **[BENCHMARK.md](BENCHMARK.md)**.

### Lancer les tests en local

```bash
npm ci
npm run typecheck
npm test
npm run build
```

Pour les tests navigateur, installez d'abord les navigateurs Playwright nécessaires selon votre environnement, puis lancez :

```bash
npm run test:e2e
```

La suite GitHub Pages vérifie aussi la vitrine et les comparaisons dans un vrai navigateur. Consultez les workflows sous `.github/workflows/`.

### Essayer le site de démonstration localement

```bash
npm run build
npm install --no-save --no-package-lock --ignore-scripts alpinejs@3.17.5 htmx.org@2.0.11
npm run build:pages
python3 -m http.server 4180 --bind 127.0.0.1 --directory _site
```

Ouvrez `http://127.0.0.1:4180/` pour la vitrine et `http://127.0.0.1:4180/benchmark.html` pour le laboratoire.

### Démo, sources et suivi

- **[Vitrine interactive](https://titomus.github.io/latchjs/)** : cas d'usage orientés applications web et SaaS ;
- **[Laboratoire HTMX + Alpine](https://titomus.github.io/latchjs/benchmark.html)** : mesures reproductibles ;
- **[Petit laboratoire](https://titomus.github.io/latchjs/lab.html)** : scénarios minimaux ;
- **[Matrice de parité](PARITY.md)** : fonctions couvertes et manquantes ;
- **[Audit technique](AUDIT.md)** : points de vigilance ;
- **[Méthodologie des benchmarks](BENCHMARK.md)** : protocole et résultats bruts ;
- **[Exemples du dépôt](examples/)** : démonstrations de directives et extensions.

**Contribuer :** ouvrez une issue pour décrire un cas réel, puis proposez une pull request avec un test de non-régression. La priorité est de garder la bibliothèque petite, prévisible et agréable à utiliser avec un backend HTML.

---

**Latch.js : gardez votre backend. Rendez votre HTML interactif.**

*Projet expérimental, version 0.1.0. Licence déclarée : MIT.*
