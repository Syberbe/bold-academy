/* BOLD Academy: oefeningenbibliotheek en standaardschema */
(function () {
  const LIBRARY = {
 "wrist": {
  "id": "wrist",
  "name": "Wrist warm up",
  "kind": "warmup",
  "equipment": [],
  "muscles": "Polsen",
  "hl": [
   "arms"
  ],
  "phases": [
   [
    "Naar voren wiegen",
    1.1,
    0,
    1
   ],
   [
    "Even rekken",
    0.5,
    1,
    1
   ],
   [
    "Terug wiegen",
    1.1,
    1,
    0
   ],
   [
    "Terug wiegen",
    0.35,
    0,
    0
   ]
  ],
  "cues": [
   "Handen onder je schouders, knieën onder je heupen.",
   "Wieg rustig naar voren over je polsen en weer terug.",
   "Eerst 8 keer met je vingers naar voren, dan 8 keer met je vingers naar je knieën."
  ]
 },
 "pikewalk": {
  "id": "pikewalk",
  "name": "Pike walks + holds",
  "kind": "warmup",
  "equipment": [],
  "muscles": "Hamstrings, kuiten, schouders",
  "hl": [
   "legs"
  ],
  "phases": [
   [
    "Voeten naar handen",
    2.6,
    0,
    1
   ],
   [
    "Hou 15 sec vast",
    3,
    1,
    1,
    "Animatie ingekort"
   ],
   [
    "Terug naar plank",
    2.2,
    1,
    0
   ],
   [
    "Plank",
    0.6,
    0,
    0
   ]
  ],
  "cues": [
   "Start in plank met gestrekte armen.",
   "Wandel met kleine pasjes je voeten naar je handen, benen zo recht mogelijk.",
   "Duw je heupen hoog, hou 15 sec vast en wandel terug."
  ]
 },
 "foetus": {
  "id": "foetus",
  "name": "Foetus houding",
  "kind": "warmup",
  "equipment": [],
  "muscles": "Buikspieren",
  "hl": [
   "torso"
  ],
  "phases": [
   [
    "Oprollen",
    1.2,
    0,
    1
   ],
   [
    "Hou 15 sec vast",
    3,
    1,
    1,
    "Animatie ingekort"
   ],
   [
    "Loslaten",
    1.1,
    1,
    0
   ],
   [
    "Rust",
    0.7,
    0,
    0
   ]
  ],
  "cues": [
   "Lig op je rug en trek je knieën naar je borst.",
   "Til je schouders van de grond, kin licht naar je borst.",
   "Je onderrug blijft plat op de grond. Hou 15 sec vast."
  ],
  "note": "<b>Interpretatie:</b> hier getoond als tuck hold op je rug. Bedoelt je coach een andere houding, volg dan zijn uitleg."
 },
 "scapula": {
  "id": "scapula",
  "name": "Scapula push ups",
  "kind": "warmup",
  "equipment": [],
  "muscles": "Schouderbladen, serratus",
  "hl": [
   "torso"
  ],
  "phases": [
   [
    "Borst laten zakken",
    1.0,
    0,
    1
   ],
   [
    "Schouderbladen samen",
    0.35,
    1,
    1
   ],
   [
    "Grond wegduwen",
    1.0,
    1,
    0
   ],
   [
    "Bovenrug bol",
    0.45,
    0,
    0
   ]
  ],
  "cues": [
   "Plank met gestrekte armen. Je ellebogen buigen niet.",
   "Laat je borst zakken door je schouderbladen samen te knijpen.",
   "Duw de grond weg tot je bovenrug bol staat."
  ]
 },
 "pikepush": {
  "id": "pikepush",
  "name": "Pike push ups",
  "kind": "main",
  "equipment": [],
  "muscles": "Schouders, triceps",
  "hl": [
   "arms"
  ],
  "labels": "push",
  "cues": [
   "Heupen hoog, voeten dicht bij je handen.",
   "Zak met je hoofd naar een punt net vóór je handen, ellebogen naar achter.",
   "Duw explosief terug naar boven."
  ]
 },
 "deficit": {
  "id": "deficit",
  "name": "Deficit push ups",
  "kind": "main",
  "equipment": [
   "blokken"
  ],
  "muscles": "Borst, triceps, schouders",
  "hl": [
   "arms"
  ],
  "labels": "push",
  "cues": [
   "Handen op blokken of parallettes, lichaam in één rechte lijn.",
   "Zak tot je borst onder je handen komt en hou 2 sec.",
   "Duw explosief omhoog en zak meteen weer."
  ]
 },
 "rows": {
  "id": "rows",
  "name": "Inverted rows",
  "kind": "main",
  "equipment": [
   "ringen"
  ],
  "muscles": "Rug, biceps, achterste schouders",
  "hl": [
   "arms"
  ],
  "labels": "row",
  "cues": [
   "Hielen op de grond, lichaam gestrekt onder de ringen.",
   "Trek de ringen naar je borst, ellebogen langs je lichaam.",
   "Knijp bovenaan 2 sec je schouderbladen samen."
  ],
  "has3d": true,
  "bad": "Heupen zakken door en je trekt maar half op."
 },
 "bss": {
  "id": "bss",
  "name": "Bulgarian split squat",
  "kind": "main",
  "equipment": [
   "bank"
  ],
  "muscles": "Quadriceps, bilspieren",
  "hl": [
   "legsN"
  ],
  "labels": "squat",
  "cues": [
   "Achterste voet op een bank, voorste voet een grote stap ervoor.",
   "Zak tot je achterste knie bijna de grond raakt en hou 2 sec.",
   "Duw krachtig op via je voorste hiel. Reps tel je per been."
  ]
 },
 "pistol": {
  "id": "pistol",
  "name": "Ring assisted pistol squat",
  "kind": "main",
  "equipment": [
   "ringen"
  ],
  "muscles": "Quadriceps, bilspieren, evenwicht",
  "hl": [
   "legsN"
  ],
  "labels": "squat",
  "cues": [
   "Hou de ringen voor je vast en sta op één been.",
   "Zak gecontroleerd zo diep mogelijk, je vrije been gestrekt naar voren.",
   "Duw explosief op via je hiel. Trek alleen mee met je armen als het nodig is. Reps tel je per been."
  ]
 },
 "ringpush": {
  "id": "ringpush",
  "name": "Ring push ups",
  "kind": "main",
  "equipment": [
   "ringen"
  ],
  "muscles": "Borst, triceps, core",
  "hl": [
   "arms"
  ],
  "labels": "push",
  "cues": [
   "Ringen net boven de grond, lichaam in één rechte lijn.",
   "Zak tot de ringen naast je borst komen, ellebogen licht naar achter.",
   "Duw omhoog en draai bovenaan je duimen licht naar buiten."
  ]
 },
 "rowswide": {
  "id": "rowswide",
  "name": "Wide inverted rows",
  "kind": "main",
  "equipment": [
   "ringen"
  ],
  "muscles": "Bovenrug, achterste schouders",
  "hl": [
   "arms"
  ],
  "labels": "row",
  "cues": [
   "Hielen op de grond. Neem de ringen vast en duw je handen naar buiten tot ongeveer anderhalve schouderbreedte.",
   "Trek de ringen in 1 sec naar je bovenborst, ellebogen wijd naar buiten.",
   "Knijp bovenaan 2 sec je schouderbladen samen."
  ],
  "note": "<b>Brede greep:</b> de ankers blijven op 50 cm. Hou je handen ongeveer 70 à 80 cm uit elkaar, zodat de banden licht schuin naar buiten hangen."
 },
 "hamcurl": {
  "id": "hamcurl",
  "name": "Ring hamstring curls",
  "kind": "main",
  "equipment": [
   "ringen"
  ],
  "muscles": "Hamstrings, bilspieren",
  "hl": [
   "legs"
  ],
  "labels": "ham",
  "cues": [
   "Lig op je rug met je hielen in de ringen, armen naast je lichaam.",
   "Hou je heupen hoog en strek je benen gecontroleerd.",
   "Trek je hielen naar je billen. Je heupen blijven omhoog."
  ]
 },
 "pelican": {
  "id": "pelican",
  "name": "Pelican curls",
  "kind": "main",
  "equipment": [
   "ringen"
  ],
  "muscles": "Biceps (in stretch), schouders",
  "hl": [
   "arms"
  ],
  "labels": "pelican",
  "cues": [
   "Ringen laag, handpalmen naar boven. Start met de ringen tegen je borst.",
   "Leun gecontroleerd naar voren tot je armen gestrekt achter je zijn.",
   "Curl jezelf terug omhoog naar de startpositie."
  ],
  "note": "<b>Opbouwen:</b> begin met weinig voorover leunen. De stretch op je elleboog is fel in het begin."
 },
 "diamond": {
  "id": "diamond",
  "name": "Diamond push ups",
  "kind": "main",
  "equipment": [],
  "muscles": "Triceps, borst",
  "hl": [
   "arms"
  ],
  "labels": "push",
  "cues": [
   "Handen samen onder je borst, duimen en wijsvingers vormen een ruit.",
   "Zak tot je borst je handen bijna raakt, ellebogen langs je lichaam.",
   "Duw explosief omhoog en zak meteen weer."
  ]
 },
 "chinup": {
  "id": "chinup",
  "name": "Ring assisted chin ups",
  "kind": "main",
  "equipment": [
   "ringen"
  ],
  "muscles": "Rug, biceps",
  "hl": [
   "arms"
  ],
  "labels": "pull",
  "cues": [
   "Onderhandse greep, voeten op de grond als hulp.",
   "Trek tot je kin boven de ringen komt. Gebruik je benen zo weinig mogelijk.",
   "Zak gecontroleerd tot je armen gestrekt zijn en hang 1 sec."
  ]
 },
 "sissy": {
  "id": "sissy",
  "name": "Sissy squats",
  "kind": "main",
  "equipment": [],
  "muscles": "Quadriceps",
  "hl": [
   "legs"
  ],
  "labels": "squat",
  "cues": [
   "Sta op je tenen. Hou je eventueel vast aan iets voor je evenwicht.",
   "Laat je knieën naar voren en omlaag zakken terwijl je achterover leunt.",
   "Knieën, heupen en schouders blijven in één lijn. Je heupen buigen niet."
  ]
 },
 "facepull": {
  "id": "facepull",
  "name": "Face pulls",
  "kind": "main",
  "equipment": [
   "ringen"
  ],
  "muscles": "Achterste schouders, bovenrug",
  "hl": [
   "arms"
  ],
  "labels": "face",
  "cues": [
   "Bovenhandse greep, leun achterover met gestrekte armen.",
   "Trek de ringen naar je gezicht, ellebogen hoog en wijd.",
   "Knijp bovenaan 2 sec je schouderbladen samen."
  ]
 },
 "ringcurl": {
  "id": "ringcurl",
  "name": "Ring bicep curls",
  "kind": "main",
  "equipment": [
   "ringen"
  ],
  "muscles": "Biceps",
  "hl": [
   "arms"
  ],
  "labels": "curl",
  "cues": [
   "Onderhandse greep, leun achterover met gestrekte armen.",
   "Curl je handen naar je voorhoofd. Je bovenarmen blijven op hun plaats.",
   "Hou je lichaam gestrekt en zwaai niet met je heupen."
  ]
 },
 "skull": {
  "id": "skull",
  "name": "Ring skull crushers",
  "kind": "main",
  "equipment": [
   "ringen"
  ],
  "muscles": "Triceps",
  "hl": [
   "arms"
  ],
  "labels": "skull",
  "cues": [
   "Bovenhandse greep, leun naar voren met gestrekte armen.",
   "Buig je ellebogen en laat je hoofd tussen je handen zakken.",
   "Strek je armen terug. Je bovenarmen blijven op hun plaats."
  ]
 }
};
  const LABELS = {"push": {"cells": ["Zakken", "Onder", "Omhoog", "Boven"], "long": ["Zakken", "Pauze onderaan", "Omhoog", "Pauze bovenaan"]}, "pull": {"cells": ["Zakken", "Onder", "Trekken", "Boven"], "long": ["Zakken", "Hangen", "Optrekken", "Pauze bovenaan"]}, "row": {"cells": ["Zakken", "Onder", "Trekken", "Boven"], "long": ["Zakken", "Pauze onderaan", "Optrekken", "Samenknijpen"]}, "pelican": {"cells": ["Leunen", "Stretch", "Curlen", "Boven"], "long": ["Voorover leunen", "Pauze in stretch", "Omhoog curlen", "Pauze bovenaan"]}, "squat": {"cells": ["Zakken", "Onder", "Omhoog", "Boven"], "long": ["Zakken", "Pauze onderaan", "Omhoog", "Pauze bovenaan"]}, "ham": {"cells": ["Strekken", "Gestrekt", "Curlen", "Boven"], "long": ["Benen strekken", "Pauze gestrekt", "Hielen intrekken", "Pauze bovenaan"]}, "face": {"cells": ["Zakken", "Gestrekt", "Trekken", "Boven"], "long": ["Armen strekken", "Pauze gestrekt", "Naar je gezicht trekken", "Samenknijpen"]}, "curl": {"cells": ["Strekken", "Gestrekt", "Curlen", "Boven"], "long": ["Armen strekken", "Pauze gestrekt", "Omhoog curlen", "Pauze bovenaan"]}, "skull": {"cells": ["Buigen", "Onder", "Strekken", "Boven"], "long": ["Ellebogen buigen", "Pauze onderaan", "Armen strekken", "Pauze bovenaan"]}};
  const DEFAULT_PROGRAM = {
 "name": "12 week program",
 "startDate": "2026-10-22",
 "weeks": 12,
 "days": [
  {
   "id": "A",
   "name": "Full Body A",
   "weekday": 4,
   "warmup": [
    {
     "id": "A.wrist",
     "ex": "wrist",
     "sets": 2,
     "target": "8 elke kant"
    },
    {
     "id": "A.pikewalk",
     "ex": "pikewalk",
     "sets": 2,
     "target": "5 · 15 sec hold"
    },
    {
     "id": "A.foetus",
     "ex": "foetus",
     "sets": 2,
     "target": "15 sec hold"
    },
    {
     "id": "A.scapula",
     "ex": "scapula",
     "sets": 2,
     "target": "10"
    }
   ],
   "blocks": [
    {
     "label": "A",
     "items": [
      {
       "id": "A.pikepush",
       "ex": "pikepush",
       "sets": 2,
       "repsMin": 6,
       "repsMax": 10,
       "tempo": "2-1-0-1",
       "rest": 120,
       "rir": "0–1"
      },
      {
       "id": "A.chinup",
       "ex": "chinup",
       "sets": 2,
       "repsMin": 6,
       "repsMax": 10,
       "tempo": "2-1-0-0",
       "rest": 120,
       "rir": "0–1"
      }
     ]
    },
    {
     "label": "B",
     "items": [
      {
       "id": "A.deficit",
       "ex": "deficit",
       "sets": 3,
       "repsMin": 8,
       "repsMax": 12,
       "tempo": "2-2-0-0",
       "rest": 120,
       "rir": "0–1"
      },
      {
       "id": "A.rows",
       "ex": "rows",
       "sets": 1,
       "repsMin": 8,
       "repsMax": 12,
       "tempo": "2-1-0-2",
       "rest": 120,
       "rir": "0–1"
      }
     ]
    },
    {
     "label": "C",
     "items": [
      {
       "id": "A.pelican",
       "ex": "pelican",
       "sets": 2,
       "repsMin": 8,
       "repsMax": 12,
       "tempo": "3-1-0-1",
       "rest": 120,
       "rir": "0–1"
      },
      {
       "id": "A.bss",
       "ex": "bss",
       "sets": 2,
       "repsMin": 8,
       "repsMax": 12,
       "tempo": "2-2-0-0",
       "rest": 120,
       "rir": "0–1"
      }
     ]
    }
   ]
  },
  {
   "id": "B",
   "name": "Full Body B",
   "weekday": 5,
   "warmup": [
    {
     "id": "B.wrist",
     "ex": "wrist",
     "sets": 2,
     "target": "8 elke kant"
    },
    {
     "id": "B.pikewalk",
     "ex": "pikewalk",
     "sets": 2,
     "target": "5 · 15 sec hold"
    },
    {
     "id": "B.foetus",
     "ex": "foetus",
     "sets": 2,
     "target": "15 sec hold"
    },
    {
     "id": "B.scapula",
     "ex": "scapula",
     "sets": 2,
     "target": "10"
    }
   ],
   "blocks": [
    {
     "label": "A",
     "items": [
      {
       "id": "B.pistol",
       "ex": "pistol",
       "sets": 2,
       "repsMin": 8,
       "repsMax": 12,
       "tempo": "3-1-0-0",
       "rest": 120,
       "rir": "0–1"
      },
      {
       "id": "B.ringpush",
       "ex": "ringpush",
       "sets": 2,
       "repsMin": 10,
       "repsMax": 15,
       "tempo": "2-2-0-1",
       "rest": 120,
       "rir": "0–1"
      }
     ]
    },
    {
     "label": "B",
     "items": [
      {
       "id": "B.rowswide",
       "ex": "rowswide",
       "sets": 4,
       "repsMin": 10,
       "repsMax": 15,
       "tempo": "2-1-1-2",
       "rest": 120,
       "rir": "0–1"
      },
      {
       "id": "B.hamcurl",
       "ex": "hamcurl",
       "sets": 4,
       "repsMin": 8,
       "repsMax": 12,
       "tempo": "2-1-0-1",
       "rest": 120,
       "rir": "0–1"
      }
     ]
    },
    {
     "label": "C",
     "items": [
      {
       "id": "B.pelican",
       "ex": "pelican",
       "sets": 2,
       "repsMin": 8,
       "repsMax": 12,
       "tempo": "2-2-0-1",
       "rest": 120,
       "rir": "0–1"
      },
      {
       "id": "B.diamond",
       "ex": "diamond",
       "sets": 2,
       "repsMin": 10,
       "repsMax": 15,
       "tempo": "2-1-0-0",
       "rest": 120,
       "rir": "0–1"
      }
     ]
    }
   ]
  },
  {
   "id": "C",
   "name": "Full Body C",
   "weekday": 0,
   "warmup": [
    {
     "id": "C.wrist",
     "ex": "wrist",
     "sets": 2,
     "target": "8 elke kant"
    },
    {
     "id": "C.pikewalk",
     "ex": "pikewalk",
     "sets": 2,
     "target": "5 · 15 sec hold"
    },
    {
     "id": "C.foetus",
     "ex": "foetus",
     "sets": 2,
     "target": "15 sec hold"
    },
    {
     "id": "C.scapula",
     "ex": "scapula",
     "sets": 2,
     "target": "10"
    }
   ],
   "blocks": [
    {
     "label": "A",
     "items": [
      {
       "id": "C.ringpush",
       "ex": "ringpush",
       "sets": 2,
       "repsMin": 6,
       "repsMax": 10,
       "tempo": "2-2-0-1",
       "rest": 120,
       "rir": "0–1"
      },
      {
       "id": "C.chinup",
       "ex": "chinup",
       "sets": 2,
       "repsMin": 6,
       "repsMax": 10,
       "tempo": "2-1-0-0",
       "rest": 120,
       "rir": "0–1"
      }
     ]
    },
    {
     "label": "B",
     "items": [
      {
       "id": "C.sissy",
       "ex": "sissy",
       "sets": 2,
       "repsMin": 8,
       "repsMax": 12,
       "tempo": "3-2-0-0",
       "rest": 120,
       "rir": "0–1"
      },
      {
       "id": "C.facepull",
       "ex": "facepull",
       "sets": 2,
       "repsMin": 10,
       "repsMax": 15,
       "tempo": "2-1-0-2",
       "rest": 120,
       "rir": "0–1"
      }
     ]
    },
    {
     "label": "C",
     "items": [
      {
       "id": "C.ringcurl",
       "ex": "ringcurl",
       "sets": 2,
       "repsMin": 10,
       "repsMax": 15,
       "tempo": "2-1-0-1",
       "rest": 120,
       "rir": "0–1"
      },
      {
       "id": "C.skull",
       "ex": "skull",
       "sets": 2,
       "repsMin": 10,
       "repsMax": 15,
       "tempo": "2-2-0-1",
       "rest": 120,
       "rir": "0–1"
      }
     ]
    }
   ]
  }
 ],
 "activities": [
  {
   "weekday": 1,
   "name": "Boulderen"
  },
  {
   "weekday": 2,
   "name": "PT"
  },
  {
   "weekday": 6,
   "name": "Boulderen"
  }
 ],
 "notes": [
  "Progressive overload: probeer wekelijks een rep extra met correcte vorm.",
  "Rep range: haal je makkelijk het hoogste aantal, maak de oefening dan moeilijker: trager tempo, ringen verder uit elkaar of lager, of gewicht erbij.",
  "Reps in reserve: bij zware oefeningen 1 tot 3 reps van falen, bij isolatie 0 tot 2."
 ]
};
  window.BoldData = { LIBRARY, LABELS, DEFAULT_PROGRAM };
})();
