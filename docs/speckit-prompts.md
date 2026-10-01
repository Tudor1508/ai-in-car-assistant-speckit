# Prompturi pentru Speckit

Înlocuiește valorile dintre `<...>` înainte de folosire. Rulează prompturile în ordinea recomandată.

## 0. Constituția proiectului

```text
$speckit-constitution

Actualizează constituția proiectului pentru Drive Wise. Păstrează principiile deja
valabile și adaugă doar reguli verificabile pentru:
- separarea clară frontend/backend;
- React, TypeScript, Redux și MUI în frontend;
- Python în backend;
- contracte explicite între frontend și backend;
- validare dintr-un checkout curat;
- dezvoltare ghidată de specificație.

Nu modifica fișiere de aplicație și nu alege versiuni, framework-uri, baze de date,
protocoale API sau servicii externe care nu sunt aprobate explicit.
```

## 1. Specificația feature-ului

```text
$speckit-specify

Creează specificația pentru feature-ul „<numele feature-ului>”.

Context:
- produsul este Drive Wise, un asistent pentru șoferi;
- frontend-ul este în frontend/;
- backend-ul este în backend/;
- respectă constituția proiectului;
- nu presupune tehnologii, versiuni sau servicii care nu sunt aprobate.

Scop:
<descrierea clară a valorii pentru utilizator și a rezultatului dorit>

Include user stories prioritizate, scenarii Given/When/Then, cerințe testabile,
criterii de succes măsurabile, edge cases, presupuneri și limite explicite de
scope. Nu include implementare, cod sau detalii de task breakdown.
```

## 2. Clarificarea specificației

```text
$speckit-clarify

Analizează specificația activă pentru ambiguități care pot schimba arhitectura,
modelul de date, UX-ul, validarea sau securitatea. Pune cel mult 5 întrebări,
una câte una, cu opțiuni recomandate. După fiecare răspuns acceptat, actualizează
spec.md și păstrează un istoric scurt al clarificării.

Nu inventa cerințe și nu pune întrebări despre detalii de implementare dacă acestea
pot fi decise ulterior în plan.
```

## 3. Planul de implementare

```text
$speckit-plan

Construiește planul pentru specificația activă.

Reguli:
- verifică mai întâi constituția și constrângerile existente;
- separă deciziile aprobate de deciziile încă deschise;
- folosește structura reală a repository-ului: frontend/ și backend/;
- documentează riscurile, alternativele și motivul alegerilor;
- generează research.md, data-model.md, contracts/ și quickstart.md doar când
  sunt relevante;
- nu transforma tehnologii menționate doar ca exemple în dependențe aprobate;
- marchează explicit orice decizie care necesită aprobare.

Verifică din nou constitution gates după proiectarea artefactelor.
```

## 4. Generarea task-urilor

```text
$speckit-tasks

Generează tasks.md pentru feature-ul activ, pornind din spec.md, plan.md și toate
artefactele de design disponibile.

Cerințe:
- organizează task-urile pe user story, în ordinea priorității;
- fiecare task trebuie să aibă checkbox, ID secvențial, cale exactă de fișier și
  criteriu verificabil;
- marchează cu [P] numai task-urile cu adevărat independente;
- folosește [US1], [US2] etc. în fazele user story;
- include dependențe, oportunități de execuție în paralel și un MVP clar;
- nu adăuga task-uri pentru funcționalități declarate out of scope;
- adaugă teste doar dacă sunt cerute în specificație sau explicit de utilizator.
```

## 5. Analiza înainte de implementare

```text
$speckit-analyze

Analizează read-only consistența dintre spec.md, plan.md și tasks.md.

Caută în special:
- cerințe fără task asociat;
- task-uri fără cerință sau user story;
- conflicte între constituție, spec și plan;
- decizii tehnologice care au devenit implicit aprobate;
- criterii de succes fără validare;
- edge cases sau cerințe non-funcționale neacoperite.

Raportează problemele ordonate după severitate, cu locații exacte și recomandări.
Nu modifica niciun fișier.
```

## 6. Implementarea task-urilor

```text
$speckit-implement

Implementează toate task-urile rămase din tasks.md pentru feature-ul activ.

Lucrează incremental:
- citește mai întâi spec.md, plan.md, quickstart.md și tasks.md;
- respectă constituția și limitele de scope;
- finalizează task-urile în ordinea dependențelor;
- păstrează modificările mici și compatibile cu structura existentă;
- nu inventa dependențe sau funcționalități care nu apar în artefacte;
- după fiecare grup logic, rulează validarea relevantă;
- marchează task-ul ca finalizat numai după verificare;
- la final raportează task-urile realizate, verificările rulate și blocajele rămase.
```

## 7. Convergența după implementare

```text
$speckit-converge

Compară implementarea existentă cu spec.md, plan.md, tasks.md și constituția.

Verifică efectiv codul, nu doar checkbox-urile. Identifică diferențele ca
missing, partial, contradicts sau unrequested. Pentru fiecare diferență rămasă,
adaugă un task nou într-o singură secțiune Convergence la finalul tasks.md, fără
renumerotarea sau modificarea task-urilor existente.

Dacă totul este satisfăcut, nu modifica tasks.md și raportează că feature-ul este
converged.
```

## 8. Checklist pentru calitatea cerințelor

```text
$speckit-checklist

Generează un checklist de calitate pentru cerințele feature-ului activ.

Concentrează-te pe completitudine, claritate, consistență, măsurabilitate,
scenarii principale și de eroare, accesibilitate, securitate, dependențe și
presupuneri. Verifică cerințele scrise, nu comportamentul implementării.
Păstrează toate item-urile noi nebifate și include referințe către secțiunile
relevante din spec.md.
```

## Ordinea recomandată

```text
$speckit-constitution
$speckit-specify <descriere feature>
$speckit-clarify
$speckit-plan
$speckit-tasks
$speckit-checklist
$speckit-analyze
$speckit-implement
$speckit-converge
```

Pentru schimbări ulterioare, pornește de la `specify` sau `clarify`, apoi regenerează
planul și task-urile înainte de implementare. Nu folosi `converge` ca înlocuitor
pentru `tasks` sau `implement`.