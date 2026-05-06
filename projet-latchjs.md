# projet.md — Latch.js

## 1. Nom du projet

Nom recommandé : **Latch.js**

## 1.1 Pourquoi ce nom ?

**Latch** signifie “loquet”, “verrou”, “attache”.

C’est un bon nom pour une librairie HTML-first, car elle sert précisément à **attacher des comportements dynamiques à du HTML** :

- une action serveur ;
- un état local ;
- une modal ;
- un drawer ;
- un toast ;
- une table dynamique ;
- un formulaire augmenté ;
- un événement ;
- un fragment HTML remplacé dans la page.

Latch.js ne cherche pas à remplacer le HTML.  
Elle vient s’y accrocher proprement.

Positionnement court :

> Latch.js — Attach behavior to HTML.

Positionnement plus complet :

> Latch.js lets you build dynamic server-rendered apps with HTML attributes, local state, server actions, DOM swaps, forms, modals, tables and events. No SPA required.

## 1.2 Promesse

Construire des interfaces web modernes sans devoir créer une SPA complète.

Latch.js doit permettre de créer des applications dynamiques avec :

- du HTML lisible ;
- des attributs déclaratifs ;
- un backend qui reste la source de vérité ;
- des fragments HTML renvoyés par le serveur ;
- un état local minimal ;
- des composants UI courants ;
- peu ou pas de JavaScript métier.

---

# 2. Vision du projet

Créer une librairie JavaScript légère, déclarative et HTML-first pour construire des applications web dynamiques sans framework frontend lourd.

Latch.js fusionne deux idées fortes :

- les interactions serveur et swaps DOM façon HTMX ;
- l’état local et les comportements UI simples façon Alpine.js.

Mais Latch.js ne doit pas être “HTMX + Alpine copiés-collés”.

Elle doit devenir une couche cohérente pour créer des applications web server-rendered modernes.

Objectif :

> Une librairie tout terrain pour ajouter de l’interactivité à du HTML, sans virtual DOM, sans compilation obligatoire, sans architecture SPA.

Elle doit rester :

- légère ;
- lisible ;
- progressive ;
- server-first ;
- compatible avec tout backend ;
- utilisable avec ou sans framework CSS ;
- facile à intégrer dans un projet existant ;
- compréhensible en lisant le HTML.

Elle ne doit pas devenir un clone de React, Vue ou Svelte.

---

# 3. Positionnement

Positionnement recommandé :

> Une librairie HTML-first pour créer des interfaces dynamiques avec état local, requêtes serveur, swaps DOM, formulaires augmentés, modales, tables, événements et composants déclaratifs.

Promesse produit :

> Build dynamic apps from plain HTML.

Ou :

> Server-rendered apps with modern interactions. No SPA circus.

Ce que Latch.js doit permettre :

- remplacer une partie du besoin de React/Vue/Svelte pour les applications CRUD classiques ;
- ajouter des interactions modernes sans complexifier le frontend ;
- standardiser les patterns fréquents : modales, drawers, toasts, confirmations, formulaires, tables, chargements, erreurs ;
- garder le HTML lisible ;
- garder le backend au centre ;
- réduire la quantité de JavaScript métier ;
- s’intégrer progressivement dans un site ou une app existante.

---

# 4. Philosophie

## 4.1 HTML-first

Le comportement doit être décrit directement dans le HTML.

Exemple :

```html
<button
  lt-post="/items/123/archive"
  lt-confirm="Archiver cet élément ?"
  lt-toast-success="Élément archivé"
  lt-emit="item:archived"
>
  Archiver
</button>
```

Le développeur doit comprendre ce que fait l’élément sans devoir ouvrir trois fichiers JavaScript.

## 4.2 Server-first

Le serveur reste la source de vérité.

Latch.js ne doit pas encourager à stocker de gros volumes de données métier côté client.

Le serveur peut renvoyer :

- un fragment HTML ;
- des headers de contrôle ;
- une redirection ;
- un événement ;
- un message de toast ;
- une instruction de refresh ;
- un statut HTTP exploitable ;
- des erreurs de formulaire.

## 4.3 État local limité

Latch.js peut gérer un état local simple :

- modal ouverte / fermée ;
- dropdown ouvert / fermé ;
- onglet actif ;
- champ visible / masqué ;
- sélection temporaire ;
- loading local ;
- erreurs de formulaire ;
- valeurs simples pour calculs immédiats.

Latch.js ne doit pas devenir un gestionnaire d’état global complexe.

## 4.4 Magie visible

Un attribut doit correspondre à un comportement clair.

À éviter :

```html
<div lt-controller="remote-stateful-resource-handler"></div>
```

À préférer :

```html
<button lt-post="/save" lt-target="#result">
  Sauvegarder
</button>
```

Règle :

> Un attribut = un comportement évident.

## 4.5 Progressive enhancement

Latch.js doit fonctionner comme une amélioration progressive.

Si JavaScript est désactivé, les formulaires et liens standards doivent rester utilisables quand c’est possible.

Exemple :

```html
<form action="/contact" method="post" lt-form lt-target="#result">
  ...
</form>
```

---

# 5. Préfixe des attributs

Préfixe officiel recommandé :

```txt
lt-
```

Pourquoi `lt-` ?

- court ;
- lié à Latch ;
- lisible ;
- peu intrusif ;
- plus distinctif que `x-`, `hx-`, `data-*` ou `ui-`.

Exemples :

```html
<button lt-post="/save">Sauvegarder</button>
<div lt-state="{ open: false }"></div>
<form lt-form lt-post="/users"></form>
```

Le préfixe doit être configurable :

```js
Latch.configure({
  prefix: "lt"
})
```

Un développeur pourrait choisir :

```js
Latch.configure({
  prefix: "ui"
})
```

Ce qui permettrait :

```html
<button ui-post="/save">Sauvegarder</button>
```

Mais le préfixe officiel de Latch.js doit rester `lt-`.

---

# 6. Installation

Objectif v1 :

```html
<script src="/latch.js" defer></script>
```

Ou via module :

```js
import { Latch } from "@latchjs/core"

Latch.start()
```

La librairie doit exposer :

```js
window.Latch
window.latch
```

API minimale :

```js
Latch.start()
Latch.stop()
Latch.configure(options)
Latch.on(event, callback)
Latch.off(event, callback)
Latch.emit(event, detail)
Latch.plugin(plugin)
Latch.store(name, value)
Latch.refresh(target)
Latch.request(options)
Latch.toast(message, options)
Latch.modal(source, options)
Latch.drawer(source, options)
```

---

# 7. Architecture interne recommandée

Structure :

```txt
/src
  /core
    index.ts
    config.ts
    scanner.ts
    events.ts
    state.ts
    evaluator.ts
    request.ts
    swap.ts
    headers.ts
    lifecycle.ts
    dom.ts
    store.ts
    errors.ts
  /directives
    request.ts
    state.ts
    events.ts
    visibility.ts
    class.ts
    model.ts
    text.ts
    bind.ts
  /plugins
    modal.ts
    drawer.ts
    toast.ts
    dropdown.ts
    tabs.ts
    table.ts
    form.ts
    upload.ts
    shortcuts.ts
  /types
    index.ts
  latch.ts
```

Builds recommandés :

```txt
dist/latch.js
dist/latch.min.js
dist/latch.esm.js
```

---

# 8. Core à développer

## 8.1 Scanner DOM

Le scanner détecte les attributs `lt-*` au chargement et après chaque swap DOM.

Fonctions :

- scanner le document au démarrage ;
- initialiser les directives ;
- éviter les doubles initialisations ;
- rescanner les fragments injectés ;
- nettoyer les composants supprimés si nécessaire.

Pseudo-API :

```js
Latch.scan(document.body)
Latch.scan(fragment)
```

Chaque élément initialisé doit être suivi via `WeakMap`, pas uniquement via des attributs DOM.

## 8.2 Lifecycle

Événements internes recommandés :

```txt
latch:beforeStart
latch:afterStart
latch:beforeScan
latch:afterScan
latch:beforeRequest
latch:afterRequest
latch:beforeSwap
latch:afterSwap
latch:requestError
latch:afterSettle
```

Ces événements doivent être écoutables en JavaScript :

```js
Latch.on("latch:afterSwap", (event) => {
  console.log(event.detail)
})
```

Et en HTML :

```html
<div lt-on="latch:afterSwap -> refresh"></div>
```

## 8.3 Event bus

Créer un système d’événements simple.

API :

```js
Latch.emit("item:saved", { id: 123 })
Latch.on("item:saved", (detail) => {})
Latch.off("item:saved", callback)
```

Syntaxe HTML :

```html
<div lt-on="item:saved -> refresh"></div>
```

Ou :

```html
<div
  lt-get="/stats"
  lt-trigger="item:saved"
  lt-target="#stats"
></div>
```

Objectif : permettre à une action de mettre à jour plusieurs zones sans SPA.

## 8.4 Request engine

Gérer les requêtes HTTP.

Directives :

```txt
lt-get
lt-post
lt-put
lt-patch
lt-delete
```

Exemple :

```html
<button
  lt-post="/items/123/done"
  lt-target="#item-123"
  lt-swap="outerHTML"
>
  Terminer
</button>
```

Fonctionnalités :

- méthode HTTP ;
- URL ;
- target ;
- swap ;
- trigger ;
- params ;
- headers ;
- loading ;
- disabled during request ;
- error handling ;
- timeout ;
- abort ;
- réponse HTML ;
- réponse JSON optionnelle ;
- support FormData ;
- support CSRF ;
- credentials configurable.

## 8.5 Swap engine

Supporter plusieurs stratégies de remplacement :

```txt
innerHTML
outerHTML
beforebegin
afterbegin
beforeend
afterend
remove
none
```

Exemples :

```html
<div lt-get="/users" lt-target="#users-list" lt-swap="innerHTML"></div>
```

```html
<form lt-post="/comments" lt-target="#comments" lt-swap="beforeend"></form>
```

Après swap :

- scanner le nouveau fragment ;
- déclencher `latch:afterSwap` ;
- appliquer les transitions optionnelles ;
- restaurer le focus si possible.

## 8.6 Header parser

Le serveur peut piloter l’interface via headers.

Headers v1 :

```txt
X-Latch-Toast
X-Latch-Toast-Type
X-Latch-Event
X-Latch-Redirect
X-Latch-Close
X-Latch-Refresh
X-Latch-Replace-Url
X-Latch-Push-Url
X-Latch-Title
```

Exemples :

```txt
X-Latch-Toast: Élément sauvegardé
X-Latch-Toast-Type: success
X-Latch-Event: item:saved
X-Latch-Close: modal
X-Latch-Refresh: #sidebar,#stats
```

Comportement :

- afficher un toast si `X-Latch-Toast` ;
- émettre un événement si `X-Latch-Event` ;
- rediriger si `X-Latch-Redirect` ;
- fermer modal/drawer si `X-Latch-Close` ;
- rafraîchir des zones si `X-Latch-Refresh` ;
- mettre à jour l’URL si `X-Latch-Push-Url` ou `X-Latch-Replace-Url`.

## 8.7 Error handling

Gérer proprement :

- erreurs réseau ;
- erreurs serveur 4xx ;
- erreurs serveur 5xx ;
- timeout ;
- réponse invalide ;
- target introuvable ;
- erreur de parsing ;
- abort.

Directives :

```txt
lt-error-target
lt-error-toast
lt-error-class
```

Exemple :

```html
<form
  lt-post="/login"
  lt-target="#result"
  lt-error-target="#form-errors"
  lt-toast-error="Connexion impossible"
>
  ...
</form>
```

---

# 9. Directives serveur

## 9.1 lt-get

Déclenche une requête GET.

```html
<button lt-get="/users/123" lt-target="#panel">
  Voir
</button>
```

## 9.2 lt-post

Déclenche une requête POST.

```html
<button lt-post="/items" lt-target="#list" lt-swap="beforeend">
  Ajouter
</button>
```

## 9.3 lt-put

Déclenche une requête PUT.

```html
<form lt-put="/profile" lt-target="#profile">
  ...
</form>
```

## 9.4 lt-patch

Déclenche une requête PATCH.

```html
<button lt-patch="/tasks/123" lt-target="#task-123">
  Mettre à jour
</button>
```

## 9.5 lt-delete

Déclenche une requête DELETE.

```html
<button
  lt-delete="/items/123"
  lt-confirm="Supprimer cet élément ?"
  lt-target="#item-123"
  lt-swap="remove"
>
  Supprimer
</button>
```

## 9.6 lt-target

Sélecteur CSS de la zone à remplacer.

```html
lt-target="#result"
```

Si absent, comportement par défaut :

- bouton/lien : élément lui-même ;
- formulaire : formulaire lui-même ou target configurée globalement ;
- trigger lazy : élément courant.

## 9.7 lt-swap

Méthode de remplacement.

```html
lt-swap="outerHTML"
```

Valeurs :

```txt
innerHTML
outerHTML
beforebegin
afterbegin
beforeend
afterend
remove
none
```

## 9.8 lt-trigger

Déclencheur.

Exemples :

```html
<div lt-get="/stats" lt-trigger="load" lt-target="#stats"></div>
```

```html
<input lt-get="/search" lt-trigger="input delay:300ms" lt-target="#results">
```

```html
<div lt-get="/notifications" lt-trigger="every:30s" lt-target="#notifications"></div>
```

```html
<div lt-get="/stats" lt-trigger="item:saved" lt-target="#stats"></div>
```

Triggers à supporter :

```txt
click
submit
change
input
load
revealed
intersect
every:10s
event custom
input delay:300ms
```

## 9.9 lt-params

Permet d’envoyer des paramètres additionnels.

```html
<button
  lt-get="/search"
  lt-params='{"status":"active"}'
  lt-target="#results"
>
  Actifs
</button>
```

## 9.10 lt-headers

Ajoute des headers personnalisés.

```html
<button
  lt-post="/save"
  lt-headers='{"X-Source":"dashboard"}'
>
  Sauvegarder
</button>
```

## 9.11 lt-confirm

Demande confirmation avant action.

```html
<button
  lt-delete="/items/123"
  lt-confirm="Confirmer la suppression ?"
>
  Supprimer
</button>
```

V1 : utiliser `window.confirm`.

V2 : permettre une modal de confirmation personnalisée.

## 9.12 lt-loading

Affiche un état de chargement.

```html
<button
  lt-post="/save"
  lt-loading="Sauvegarde..."
>
  Sauvegarder
</button>
```

Comportement :

- changer le texte pendant la requête ;
- désactiver le bouton ;
- restaurer après la réponse.

## 9.13 lt-disabled-while

Désactive un élément pendant une requête.

```html
<button lt-post="/save" lt-disabled-while="request">
  Sauvegarder
</button>
```

## 9.14 lt-indicator

Affiche un indicateur pendant la requête.

```html
<button lt-post="/save" lt-indicator="#spinner">
  Sauvegarder
</button>

<span id="spinner" hidden>Chargement...</span>
```

## 9.15 lt-emit

Émet un événement après succès.

```html
<button
  lt-post="/items/123/archive"
  lt-emit="item:archived"
>
  Archiver
</button>
```

## 9.16 lt-refresh

Rafraîchit une cible.

```html
<button lt-refresh="#stats">
  Rafraîchir
</button>
```

---

# 10. Directives état local

## 10.1 lt-state

Déclare un état local.

```html
<div lt-state="{ open: false, count: 0 }">
  ...
</div>
```

L’état est disponible aux directives enfants.

## 10.2 lt-click

Exécute une expression au clic.

```html
<button lt-click="open = !open">
  Toggle
</button>
```

## 10.3 lt-show

Affiche ou masque selon une expression.

```html
<div lt-show="open">
  Contenu
</div>
```

V1 :

- utiliser `hidden` ;
- ou `display: none`.

V2 :

- ajouter transitions optionnelles.

## 10.4 lt-if

Rendu conditionnel.

```html
<div lt-if="items.length === 0">
  Aucun résultat
</div>
```

Pour la v1, `lt-show` suffit. `lt-if` peut être reporté.

## 10.5 lt-class

Ajoute des classes selon une expression.

```html
<button lt-class="{ 'is-active': open }">
  Menu
</button>
```

Compatible Tailwind :

```html
<button lt-class="{ 'bg-black text-white': active, 'bg-white': !active }">
  Filtre
</button>
```

## 10.6 lt-bind

Lie un attribut HTML.

```html
<button lt-bind:disabled="loading">
  Envoyer
</button>
```

## 10.7 lt-model

Lie un champ à l’état local.

```html
<div lt-state="{ name: '' }">
  <input lt-model="name">
  <p lt-text="name"></p>
</div>
```

## 10.8 lt-text

Affiche une expression.

```html
<span lt-text="quantity * price"></span>
```

## 10.9 lt-html

Injecte du HTML depuis une expression.

```html
<div lt-html="content"></div>
```

Attention : risque XSS. À éviter en v1 ou à documenter fortement.

---

# 11. Composants natifs

## 11.1 Toast

Objectif : notifications globales.

API HTML :

```html
<div lt-toast-container></div>
```

Déclenchement :

```html
<button lt-toast="Sauvegardé">
  Test toast
</button>
```

Ou après requête :

```html
<button
  lt-post="/save"
  lt-toast-success="Sauvegardé"
  lt-toast-error="Erreur pendant la sauvegarde"
>
  Sauvegarder
</button>
```

API JS :

```js
Latch.toast("Message")
Latch.toast("Message", { type: "success" })
```

Types :

```txt
success
error
warning
info
neutral
```

## 11.2 Modal

Objectif : ouvrir du contenu local ou distant.

Exemple distant :

```html
<button lt-modal="/users/new">
  Nouvel utilisateur
</button>
```

Comportement :

- ouvrir modal ;
- charger URL ;
- injecter contenu ;
- focus premier champ ;
- fermer avec Escape ;
- fermer au clic extérieur ;
- restaurer focus ;
- scanner le contenu injecté ;
- fermer si header `X-Latch-Close: modal`.

Exemple local :

```html
<button lt-modal="#my-modal">Ouvrir</button>

<template id="my-modal">
  <div>
    Contenu modal
  </div>
</template>
```

## 11.3 Drawer

Même principe que modal, mais latéral.

```html
<button lt-drawer="/users/123">
  Voir utilisateur
</button>
```

Options :

```html
<button lt-drawer="/users/123" lt-drawer-side="right">
  Voir
</button>
```

Sides :

```txt
left
right
top
bottom
```

## 11.4 Dropdown

```html
<div lt-dropdown>
  <button lt-dropdown-trigger>Actions</button>

  <div lt-dropdown-menu>
    <button>Modifier</button>
    <button>Supprimer</button>
  </div>
</div>
```

Comportement :

- ouvrir / fermer ;
- clic extérieur ;
- Escape ;
- navigation clavier en v2.

## 11.5 Tabs

```html
<div lt-tabs lt-state="{ active: 'profile' }">
  <button lt-tab="profile">Profil</button>
  <button lt-tab="settings">Paramètres</button>

  <section lt-panel="profile">...</section>
  <section lt-panel="settings">...</section>
</div>
```

## 11.6 Accordion

```html
<div lt-accordion>
  <button lt-accordion-trigger="one">Section 1</button>
  <div lt-accordion-panel="one">...</div>
</div>
```

## 11.7 Confirm

Confirmation simple :

```html
<button
  lt-delete="/items/123"
  lt-confirm="Supprimer définitivement ?"
>
  Supprimer
</button>
```

V2 : modal custom :

```html
<button
  lt-delete="/items/123"
  lt-confirm-modal
  lt-confirm-title="Supprimer ?"
  lt-confirm-text="Cette action est irréversible."
>
  Supprimer
</button>
```

## 11.8 Data table

Composant majeur.

Exemple :

```html
<div
  lt-table
  lt-source="/users/table"
  lt-target="#users-table"
  lt-sync-url
>
  <input
    lt-table-search
    placeholder="Rechercher"
  >

  <select lt-table-filter="status">
    <option value="">Tous</option>
    <option value="active">Actifs</option>
    <option value="archived">Archivés</option>
  </select>

  <div id="users-table"></div>
</div>
```

Fonctions :

- recherche avec debounce ;
- filtres ;
- pagination ;
- tri ;
- sync URL ;
- loading state ;
- empty state ;
- refresh après événement ;
- reset filtres ;
- conservation des paramètres.

## 11.9 Inline edit

```html
<span
  lt-inline-edit
  lt-patch="/users/123/name"
  lt-field="name"
>
  John Doe
</span>
```

Comportement :

- clic pour éditer ;
- Enter pour sauvegarder ;
- Escape pour annuler ;
- blur configurable ;
- erreur affichée localement.

## 11.10 Autosave

```html
<form
  lt-form
  lt-autosave="delay:800ms"
  lt-patch="/settings"
  lt-toast-success="Sauvegardé"
>
  ...
</form>
```

Fonctions :

- debounce ;
- dirty state ;
- indication “sauvegarde…” ;
- indication “sauvegardé” ;
- rollback optionnel.

## 11.11 Upload

```html
<form
  lt-upload
  lt-post="/files"
  lt-target="#files"
  lt-swap="beforeend"
>
  <input type="file" name="file">
  <progress lt-upload-progress></progress>
</form>
```

Fonctions :

- upload FormData ;
- progression ;
- preview image optionnel ;
- erreurs ;
- annulation.

---

# 12. Formulaires augmentés

## 12.1 lt-form

```html
<form
  lt-form
  lt-post="/users"
  lt-target="#users-list"
  lt-swap="beforeend"
  lt-reset-on-success
  lt-toast-success="Utilisateur ajouté"
>
  ...
</form>
```

Fonctions :

- interception submit ;
- FormData ;
- validation navigateur ;
- gestion erreurs serveur ;
- reset optionnel ;
- close modal optionnel ;
- dirty check ;
- loading ;
- disabled ;
- focus erreur.

## 12.2 Erreurs serveur

Le serveur peut renvoyer un fragment HTML d’erreurs.

```html
<form
  lt-post="/login"
  lt-error-target="#login-errors"
>
  <div id="login-errors"></div>
</form>
```

Ou un JSON standard en v2 :

```json
{
  "errors": {
    "email": "Email invalide",
    "password": "Mot de passe obligatoire"
  }
}
```

## 12.3 Dirty check

```html
<form lt-form lt-dirty-check>
  ...
</form>
```

Comportement :

- détecter modifications non sauvegardées ;
- prévenir avant fermeture page ;
- prévenir avant fermeture modal.

## 12.4 Submit on change

```html
<select lt-submit-on-change>
  ...
</select>
```

Ou :

```html
<form lt-form lt-submit-on-change>
  ...
</form>
```

## 12.5 Reset on success

```html
<form lt-reset-on-success>
  ...
</form>
```

## 12.6 Close on success

```html
<form lt-close-on-success="modal">
  ...
</form>
```

---

# 13. Optimistic UI

Objectif : donner une sensation de vitesse sur certaines actions simples.

Exemple :

```html
<button
  lt-post="/tasks/123/done"
  lt-optimistic-class="line-through opacity-60"
  lt-rollback-on-error
>
  Terminer
</button>
```

Cas adaptés :

- cocher une tâche ;
- archiver un élément ;
- masquer une notification ;
- liker ;
- snooze ;
- changement de statut non critique.

Cas à éviter :

- paiement ;
- facture ;
- suppression définitive ;
- action légale ;
- action irréversible.

Directives :

```txt
lt-optimistic-class
lt-optimistic-remove
lt-optimistic-text
lt-rollback-on-error
```

---

# 14. Store global minimal

API :

```js
Latch.store("app", {
  sidebarOpen: false,
  theme: "light",
  unreadNotifications: 0
})
```

Usage HTML :

```html
<button lt-click="$store.app.sidebarOpen = true">
  Menu
</button>
```

Règles :

- le store global ne doit contenir que de petits états transversaux ;
- ne pas stocker des listes métier longues ;
- ne pas transformer Latch.js en Redux ;
- le serveur reste source de vérité.

---

# 15. Plugin system

Latch.js doit accepter des plugins.

API :

```js
Latch.plugin((app) => {
  app.directive("tooltip", {
    mounted(el, value) {
      // ...
    }
  })
})
```

Ou :

```js
Latch.plugin(toastPlugin)
Latch.plugin(modalPlugin)
Latch.plugin(tablePlugin)
```

Chaque plugin peut ajouter :

- directives ;
- composants ;
- méthodes API ;
- handlers d’événements ;
- hooks lifecycle.

Structure plugin :

```ts
type LatchPlugin = {
  name: string
  install: (app: LatchApp) => void
}
```

---

# 16. Sécurité

## 16.1 XSS

Attention forte sur :

- `lt-html`
- fragments HTML serveur
- templates injectés
- réponses JSON transformées en HTML

Règles :

- ne jamais évaluer du HTML utilisateur non nettoyé ;
- documenter que le serveur doit échapper les données ;
- éviter `lt-html` en v1 ;
- privilégier `textContent` pour `lt-text`.

## 16.2 Expression evaluator

Les directives comme `lt-click`, `lt-show`, `lt-text` nécessitent d’évaluer des expressions.

Options :

1. Evaluator simple basé sur `new Function`.
2. Parser maison minimal.
3. Mode strict sans expressions complexes.

Pour une v1 rapide :

- utiliser `new Function` avec documentation claire ;
- ne jamais évaluer du contenu utilisateur ;
- scope limité à l’état local et helpers autorisés.

À moyen terme :

- envisager un evaluator plus sûr.

## 16.3 CSRF

Prévoir configuration :

```js
Latch.configure({
  csrf: {
    header: "X-CSRF-Token",
    token: document.querySelector('meta[name="csrf-token"]')?.content
  }
})
```

## 16.4 Credentials

```js
Latch.configure({
  credentials: "same-origin"
})
```

---

# 17. Accessibilité

Latch.js doit intégrer des comportements accessibles par défaut pour les composants natifs.

## Modal

- role dialog ;
- aria-modal true ;
- focus trap ;
- Escape pour fermer ;
- restauration du focus ;
- label accessible.

## Dropdown

- aria-expanded ;
- aria-controls ;
- navigation clavier en v2 ;
- fermeture Escape.

## Tabs

- role tablist ;
- role tab ;
- role tabpanel ;
- aria-selected ;
- navigation clavier en v2.

## Toast

- aria-live polite ou assertive selon type ;
- ne pas bloquer l’utilisateur.

---

# 18. Performance

Objectifs :

- core très léger ;
- pas de dépendance obligatoire ;
- scanner DOM optimisé ;
- WeakMap pour stocker les états ;
- debounce pour input/search/autosave ;
- abort controller pour requêtes concurrentes ;
- pas de virtual DOM ;
- pas de compilation obligatoire ;
- build ESM et CDN.

Fonctions utiles :

```js
AbortController
MutationObserver
IntersectionObserver
CustomEvent
WeakMap
```

---

# 19. Compatibilité

Navigateurs cibles :

- Chrome récent ;
- Firefox récent ;
- Safari récent ;
- Edge récent.

IE non supporté.

La librairie doit fonctionner dans :

- apps server-rendered ;
- sites statiques ;
- Laravel ;
- Rails ;
- Django ;
- Flask ;
- Go ;
- Express ;
- Next.js en mode server-heavy ;
- Astro ;
- Eleventy ;
- WordPress custom ;
- Symfony ;
- Phoenix ;
- tout backend capable de renvoyer du HTML.

---

# 20. Exemples d’usage

## 20.1 Bouton simple POST

```html
<button
  lt-post="/tasks/123/done"
  lt-target="#task-123"
  lt-swap="outerHTML"
  lt-toast-success="Tâche terminée"
>
  Terminer
</button>
```

## 20.2 Recherche dynamique

```html
<input
  type="search"
  name="q"
  lt-get="/search"
  lt-trigger="input delay:300ms"
  lt-target="#results"
  placeholder="Rechercher..."
>

<div id="results"></div>
```

## 20.3 Modal distante

```html
<button lt-modal="/users/new">
  Nouvel utilisateur
</button>
```

## 20.4 Formulaire modal

```html
<form
  lt-form
  lt-post="/users"
  lt-target="#users-table"
  lt-swap="beforeend"
  lt-toast-success="Utilisateur ajouté"
  lt-close-on-success="modal"
  lt-reset-on-success
>
  <input name="name" required>
  <input name="email" type="email" required>
  <button type="submit">Créer</button>
</form>
```

## 20.5 Refresh multi-zones via headers

Réponse serveur :

```txt
X-Latch-Toast: Élément sauvegardé
X-Latch-Event: item:saved
X-Latch-Refresh: #stats,#sidebar
```

## 20.6 État local

```html
<div lt-state="{ open: false }">
  <button lt-click="open = !open">
    Actions
  </button>

  <div lt-show="open">
    <button>Modifier</button>
    <button>Supprimer</button>
  </div>
</div>
```

## 20.7 Calcul local

```html
<div lt-state="{ quantity: 1, price: 0 }">
  <input type="number" lt-model="quantity">
  <input type="number" lt-model="price">

  <strong lt-text="quantity * price"></strong>
</div>
```

## 20.8 Table complète

```html
<div
  lt-table
  lt-source="/products/table"
  lt-target="#products-table"
  lt-sync-url
>
  <input lt-table-search placeholder="Rechercher un produit">

  <select lt-table-filter="status">
    <option value="">Tous</option>
    <option value="active">Actifs</option>
    <option value="draft">Brouillons</option>
  </select>

  <div id="products-table"></div>
</div>
```

---

# 21. Roadmap produit

## Version 0.1 — Core request + swap

Objectif : prouver le modèle.

À faire :

- [ ] Créer package TypeScript
- [ ] Créer build ESM + UMD
- [ ] Implémenter `Latch.start`
- [ ] Implémenter scanner DOM
- [ ] Implémenter `lt-get`
- [ ] Implémenter `lt-post`
- [ ] Implémenter `lt-target`
- [ ] Implémenter `lt-swap`
- [ ] Implémenter lifecycle events
- [ ] Implémenter rescan après swap
- [ ] Ajouter exemples HTML

Critères d’acceptation :

- Un bouton peut charger du HTML distant.
- Un formulaire peut envoyer des données.
- Une zone DOM peut être remplacée.
- Le nouveau HTML injecté est rescanné.

## Version 0.2 — Formulaires et erreurs

À faire :

- [ ] `lt-form`
- [ ] FormData
- [ ] validation navigateur
- [ ] `lt-error-target`
- [ ] `lt-toast-success`
- [ ] `lt-toast-error`
- [ ] `lt-reset-on-success`
- [ ] `lt-close-on-success`
- [ ] support CSRF
- [ ] loading sur submit

Critères d’acceptation :

- Un formulaire peut être soumis sans rechargement complet.
- Les erreurs serveur peuvent être affichées.
- Le succès peut fermer une modal ou reset le formulaire.

## Version 0.3 — État local

À faire :

- [ ] `lt-state`
- [ ] `lt-click`
- [ ] `lt-show`
- [ ] `lt-class`
- [ ] `lt-bind`
- [ ] `lt-model`
- [ ] `lt-text`
- [ ] store local par composant
- [ ] propagation état vers enfants

Critères d’acceptation :

- Un dropdown peut fonctionner sans code custom.
- Un champ peut mettre à jour un texte.
- Une classe peut dépendre d’un état local.

## Version 0.4 — Headers serveur et event bus

À faire :

- [ ] `X-Latch-Toast`
- [ ] `X-Latch-Event`
- [ ] `X-Latch-Redirect`
- [ ] `X-Latch-Close`
- [ ] `X-Latch-Refresh`
- [ ] `Latch.emit`
- [ ] `Latch.on`
- [ ] `lt-emit`
- [ ] `lt-on`
- [ ] `lt-trigger` custom event

Critères d’acceptation :

- Une action serveur peut déclencher un toast.
- Une action serveur peut rafraîchir plusieurs zones.
- Un événement peut déclencher une requête ailleurs dans la page.

## Version 0.5 — Composants UI

À faire :

- [ ] Toast container
- [ ] Modal
- [ ] Drawer
- [ ] Dropdown
- [ ] Tabs
- [ ] Confirm
- [ ] accessibilité de base
- [ ] focus management

Critères d’acceptation :

- Une modal distante peut s’ouvrir avec `lt-modal`.
- Un drawer distant peut s’ouvrir avec `lt-drawer`.
- Les toasts fonctionnent via JS, HTML et headers serveur.

## Version 0.6 — Table

À faire :

- [ ] `lt-table`
- [ ] `lt-source`
- [ ] `lt-table-search`
- [ ] `lt-table-filter`
- [ ] pagination
- [ ] tri
- [ ] debounce
- [ ] sync URL
- [ ] refresh events
- [ ] loading state

Critères d’acceptation :

- Une table peut être filtrée, recherchée, triée et paginée sans code custom.
- L’URL peut refléter les filtres.
- La table peut se rafraîchir après un événement.

## Version 0.7 — Plugins et extension

À faire :

- [ ] API plugin
- [ ] API directive custom
- [ ] documentation plugin
- [ ] exemple plugin tooltip
- [ ] exemple plugin keyboard shortcuts

Critères d’acceptation :

- Un développeur peut créer sa propre directive.
- Un plugin peut ajouter un comportement réutilisable.

## Version 1.0 — Stabilisation

À faire :

- [ ] API stable
- [ ] documentation complète
- [ ] site de démo
- [ ] tests unitaires
- [ ] tests navigateur
- [ ] exemples backend
- [ ] bundle minifié
- [ ] guide migration
- [ ] guide sécurité
- [ ] guide accessibilité
- [ ] benchmarks simples

Critères d’acceptation :

- Latch.js peut être utilisé dans un projet réel.
- La documentation couvre les cas courants.
- L’API est suffisamment stable pour une v1.

---

# 22. Sprints de développement

## Sprint 1 — Setup et fondations

Objectif : créer la base technique.

Todos :

- [ ] Initialiser projet TypeScript
- [ ] Configurer build avec Vite, tsup ou Rollup
- [ ] Créer export ESM
- [ ] Créer export UMD/CDN
- [ ] Créer `Latch.start`
- [ ] Créer config globale
- [ ] Créer scanner DOM
- [ ] Créer système de directives
- [ ] Créer mini page de test
- [ ] Ajouter tests simples

Livrable :

- Une lib chargeable dans une page HTML.
- Le scanner détecte les attributs `lt-*`.

## Sprint 2 — Requêtes HTTP

Objectif : reproduire le cœur server-interaction.

Todos :

- [ ] Implémenter `lt-get`
- [ ] Implémenter `lt-post`
- [ ] Implémenter `lt-put`
- [ ] Implémenter `lt-patch`
- [ ] Implémenter `lt-delete`
- [ ] Implémenter `lt-target`
- [ ] Implémenter `lt-swap`
- [ ] Implémenter requêtes formulaire
- [ ] Implémenter FormData
- [ ] Implémenter gestion erreurs basique

Livrable :

- Boutons, liens et formulaires peuvent envoyer des requêtes et remplacer du HTML.

## Sprint 3 — Triggers et loading

Objectif : rendre les interactions pratiques.

Todos :

- [ ] `lt-trigger`
- [ ] trigger click
- [ ] trigger submit
- [ ] trigger input delay
- [ ] trigger load
- [ ] trigger every
- [ ] `lt-loading`
- [ ] `lt-disabled-while`
- [ ] `lt-indicator`
- [ ] AbortController pour requêtes input concurrentes

Livrable :

- Recherche dynamique, chargement automatique, polling léger, loading propre.

## Sprint 4 — État local

Objectif : ajouter la partie Alpine-like.

Todos :

- [ ] `lt-state`
- [ ] evaluator
- [ ] scope local
- [ ] `lt-click`
- [ ] `lt-show`
- [ ] `lt-class`
- [ ] `lt-bind`
- [ ] `lt-model`
- [ ] `lt-text`
- [ ] mise à jour réactive simple

Livrable :

- Dropdowns, toggles, tabs simples et calculs locaux fonctionnent sans code custom.

## Sprint 5 — Event bus et headers serveur

Objectif : orchestrer les zones.

Todos :

- [ ] `Latch.emit`
- [ ] `Latch.on`
- [ ] `Latch.off`
- [ ] `lt-emit`
- [ ] `lt-on`
- [ ] custom trigger via événement
- [ ] parser `X-Latch-Toast`
- [ ] parser `X-Latch-Event`
- [ ] parser `X-Latch-Redirect`
- [ ] parser `X-Latch-Close`
- [ ] parser `X-Latch-Refresh`

Livrable :

- Une action peut déclencher des mises à jour dans plusieurs zones de la page.

## Sprint 6 — Toast, modal, drawer

Objectif : ajouter les composants les plus utiles.

Todos :

- [ ] `lt-toast-container`
- [ ] `Latch.toast`
- [ ] `lt-toast`
- [ ] `lt-toast-success`
- [ ] `lt-toast-error`
- [ ] `lt-modal`
- [ ] contenu modal distant
- [ ] contenu modal local
- [ ] fermeture Escape/clic extérieur
- [ ] focus management
- [ ] `lt-drawer`

Livrable :

- Modales et drawers fonctionnent avec contenu local ou distant.

## Sprint 7 — Formulaires avancés

Objectif : rendre les CRUD agréables.

Todos :

- [ ] `lt-form`
- [ ] `lt-error-target`
- [ ] `lt-reset-on-success`
- [ ] `lt-close-on-success`
- [ ] `lt-dirty-check`
- [ ] `lt-submit-on-change`
- [ ] focus première erreur
- [ ] messages erreurs
- [ ] CSRF

Livrable :

- Les formulaires sont utilisables dans modales, drawers et pages classiques.

## Sprint 8 — Table

Objectif : créer une vraie brique SaaS générique.

Todos :

- [ ] `lt-table`
- [ ] `lt-source`
- [ ] `lt-table-search`
- [ ] `lt-table-filter`
- [ ] `lt-table-sort`
- [ ] pagination
- [ ] sync URL
- [ ] debounce
- [ ] refresh après événement
- [ ] loading table
- [ ] empty state

Livrable :

- Une table dynamique complète sans code JS custom.

## Sprint 9 — Plugins

Objectif : ouvrir l’écosystème.

Todos :

- [ ] API `Latch.plugin`
- [ ] API `Latch.directive`
- [ ] hooks lifecycle pour plugins
- [ ] exemple plugin tooltip
- [ ] exemple plugin shortcut
- [ ] documentation plugin

Livrable :

- Un développeur peut étendre Latch.js proprement.

## Sprint 10 — Documentation et stabilisation

Objectif : rendre le projet utilisable.

Todos :

- [ ] README complet
- [ ] guide quickstart
- [ ] documentation directives
- [ ] documentation composants
- [ ] documentation headers serveur
- [ ] exemples backend
- [ ] tests navigateur
- [ ] démo publique
- [ ] bundle minifié
- [ ] changelog

Livrable :

- Une v1 candidate prête à être testée dans un projet réel.

---

# 23. Priorités absolues

À ne pas rater :

1. Syntaxe lisible.
2. Requêtes serveur fiables.
3. Swaps DOM propres.
4. État local simple.
5. Gestion loading/error cohérente.
6. Events serveur via headers.
7. Modales et formulaires impeccables.
8. Documentation claire.
9. Pas de sur-abstraction.
10. Pas de dépendance lourde.

---

# 24. Ce qu’il ne faut pas faire

Ne pas construire :

- un virtual DOM ;
- un routeur SPA complet ;
- un système de composants compilés ;
- un clone de React ;
- un clone complet de Vue ;
- un Redux maison ;
- une syntaxe magique incompréhensible ;
- une couche qui cache entièrement le HTML ;
- une usine à plugins avant d’avoir un core solide.

Ne pas ajouter trop tôt :

- animations complexes ;
- transitions avancées ;
- SSR spécifique ;
- devtools ;
- compilation ;
- hydratation ;
- store global sophistiqué ;
- cache client métier ;
- système de routing complet.

---

# 25. Design de l’API finale idéale

Exemple complet :

```html
<div
  lt-table
  lt-source="/users/table"
  lt-target="#users-table"
  lt-sync-url
  lt-refresh-on="user:created user:updated user:deleted"
>
  <header>
    <input lt-table-search placeholder="Rechercher...">

    <select lt-table-filter="status">
      <option value="">Tous</option>
      <option value="active">Actifs</option>
      <option value="archived">Archivés</option>
    </select>

    <button lt-modal="/users/new">
      Ajouter
    </button>
  </header>

  <div id="users-table"></div>
</div>
```

Dans une ligne HTML renvoyée par le serveur :

```html
<tr id="user-123">
  <td>Jane Doe</td>
  <td>jane@example.com</td>
  <td>
    <button lt-drawer="/users/123">Voir</button>

    <button
      lt-modal="/users/123/edit"
    >
      Modifier
    </button>

    <button
      lt-delete="/users/123"
      lt-confirm="Supprimer cet utilisateur ?"
      lt-target="#user-123"
      lt-swap="remove"
      lt-toast-success="Utilisateur supprimé"
      lt-emit="user:deleted"
    >
      Supprimer
    </button>
  </td>
</tr>
```

Réponse serveur après création :

```txt
HTTP/1.1 200 OK
Content-Type: text/html
X-Latch-Toast: Utilisateur créé
X-Latch-Event: user:created
X-Latch-Close: modal
X-Latch-Refresh: #users-table,#stats
```

---

# 26. Prompt à donner à l’IA de développement

Tu dois coder une librairie JavaScript nommée **Latch.js**.

Latch.js est une librairie HTML-first qui combine :

- les requêtes serveur et swaps DOM façon HTMX ;
- l’état local et les petites interactions UI façon Alpine.js ;
- des composants natifs fréquents : modal, drawer, toast, dropdown, tabs, table, formulaires augmentés ;
- une API serveur via headers `X-Latch-*`.

Contraintes :

- TypeScript.
- Pas de dépendance obligatoire.
- Pas de virtual DOM.
- Pas de SPA router.
- Pas de framework UI imposé.
- Compatible HTML classique.
- Compatible tout backend.
- Préfixe officiel des directives : `lt-`.
- Préfixe configurable.
- Code modulaire.
- Plugins possibles.
- Documentation claire.

Commence par le Sprint 1, puis avance sprint par sprint.

À chaque sprint :

1. Implémente uniquement le périmètre prévu.
2. Ajoute des exemples HTML.
3. Ajoute des tests.
4. Mets à jour la documentation.
5. Vérifie que le nouveau HTML injecté est rescanné.
6. Vérifie que la syntaxe reste simple et lisible.

Priorité absolue : une librairie utile, petite, compréhensible, productive.

Ne transforme pas Latch.js en clone de React ou Vue.
