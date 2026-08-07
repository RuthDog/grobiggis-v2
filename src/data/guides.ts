import type { GuideSection, GuideSource, KnowledgeGuide } from "./guide-types";

const accessedAt = "2026-07-31";

const smhi: GuideSource = {
  title: "Frost och markfrost",
  publisher: "SMHI",
  url: "https://www.smhi.se/kunskapsbanken/meteorologi/sno--och-isfenomen/frost-och-markfrost",
  accessedAt,
  kind: "myndighetsfakta",
};

const tomato: GuideSource = {
  title: "Odla tomater - för växthus och friland",
  publisher: "Riksförbundet Svensk Trädgård",
  url: "https://svensktradgard.se/tradgardsrad/hallbar-odling/odla-egen-mat/odla-tomater/",
  accessedAt,
  kind: "etablerad odlingserfarenhet",
};

const weeds: GuideSource = {
  title: "Ogräsrådgivaren - odlingsåtgärder",
  publisher: "SLU",
  url: "https://ograsradgivaren.slu.se/artiklar/index.cfm?id=8&pageAct=txt",
  accessedAt,
  kind: "myndighetsfakta",
};

const yellow: GuideSource = {
  title: "Varför gulnar squashen",
  publisher: "Riksförbundet Svensk Trädgård",
  url: "https://svensktradgard.se/faq-radgivarna/aktuella-fragor-i-maj/forodlad-squash/",
  accessedAt,
  kind: "etablerad odlingserfarenhet",
};

const rotation: GuideSource = {
  title: "Så funkar växelbruk och växtföljd",
  publisher: "Riksförbundet Svensk Trädgård",
  url: "https://svensktradgard.se/tradgardsrad/hallbar-odling/odla-egen-mat/vaxelbruk-och-vaxtfoljd/",
  accessedAt,
  kind: "etablerad odlingserfarenhet",
};

const section = (id: string, heading: string, paragraphs: string[], steps?: string[]): GuideSection => ({
  id,
  heading,
  paragraphs,
  steps,
});

export const guides = [
  {
    id: "guide-tomato",
    slug: "lyckas-med-tomater",
    title: "Så lyckas du med tomater",
    intro: "Från lagom tidig sådd till jämn vattning och skörd, med skillnader mellan friland, kruka och växthus.",
    category: "Växtguider",
    audience: "Hemmaodlare",
    reviewedAt: accessedAt,
    relatedPlants: ["tomat", "korsbarstomat"],
    relatedEvents: ["sådd", "omplantering", "utplantering", "skörd"],
    version: 1,
    sources: [tomato],
    sections: [
      section("start", "Börja efter dina förutsättningar", [
        "Tomat kan odlas från frö eller köpt planta. En frösådd behöver gott om ljus; en köpt planta ska börja sin plan i den fas den faktiskt befinner sig i.",
      ], ["Så ytligt i fuktad såjord.", "Ställ varmt till groning och därefter ljust och svalare.", "Plantera om när plantan behöver mer rotutrymme."]),
      section("ute", "Flytta ut först när läget passar", [
        "Vänj förodlade plantor gradvis vid utomhusklimat och undvik frost. Friland passar främst i gynnsamma lägen och för lämpade sorter; kruka och växthus ger större möjlighet att styra värme och säsong.",
      ]),
      section("care", "Vatten, jord och skörd", [
        "Tomater trivs i näringsrik jord och behöver jämn bevattning. Kontrollera jorden i stället för att vattna slentrianmässigt. Skörda mogna frukter löpande och följ sortens växtsätt innan du tar bort sidoskott.",
      ]),
    ],
  },
  {
    id: "guide-transplant",
    slug: "dags-att-plantera-ut",
    title: "När är det dags att plantera ut?",
    intro: "Bedöm frost, jord, väderläge och plantans utveckling tillsammans i stället för att lita på ett enda kalenderdatum.",
    category: "Säsong",
    audience: "Alla odlare",
    reviewedAt: accessedAt,
    relatedPlants: [],
    relatedEvents: ["avhärdning", "utplantering"],
    version: 1,
    sources: [smhi, weeds],
    caution: "Lokala köldlägen kan avvika från regional prognos.",
    sections: [
      section("signals", "Fyra signaler att kontrollera", [
        "Ett rekommenderat intervall är en startpunkt. Kontrollera nattprognos, markens skick, plantans stadga och om arten tål kyla.",
      ], ["Följ lägsta natt-temperatur.", "Kontrollera att jorden inte är kall och blöt.", "Avhärda förodlade plantor.", "Ha täckning redo vid osäkert väder."]),
      section("frost", "Frost och markfrost är inte samma mätning", [
        "SMHI beskriver att markytan kan vara kallare än luften på två meters höjd. Klara och vindsvaga nätter samt öppna lägen kan därför ge lokal markfrost även när en vanlig prognossiffra ser mindre dramatisk ut.",
      ]),
      section("method", "Anpassa efter odlingssätt", [
        "Växthus och skyddat läge kan ge tidigare start men kräver fortfarande kontroll av nattkyla. På friland är ett flexibelt intervall säkrare än ett exakt datum.",
      ]),
    ],
  },
  {
    id: "guide-water",
    slug: "kanner-du-vattenbehov",
    title: "Så känner du om en planta behöver vatten",
    intro: "Lär dig skilja torr yta från torr rotzon och undvik både rutinbevattning och uttorkning.",
    category: "Bevattning",
    audience: "Alla odlare",
    reviewedAt: accessedAt,
    relatedPlants: [],
    relatedEvents: [],
    version: 1,
    sources: [tomato],
    sections: [
      section("check", "Kontrollera före du vattnar", [
        "Känn några centimeter ner i jorden och jämför krukans vikt med när den är genomvattnad. Slokande blad kan betyda vattenbrist, men också rotproblem eller tillfällig värmestress.",
      ], ["Känn i rotzonen.", "Kontrollera väder och senaste vattning.", "Vattna igenom när jorden faktiskt är torr.", "Kontrollera att överskottsvatten kan rinna undan."]),
      section("rhythm", "Jämnhet framför schema", [
        "Krukor, växthus och upphöjda bäddar torkar ofta snabbare än friland. Tomater gynnas av jämn bevattning; stora svängningar kan bidra till problem med frukterna.",
      ]),
      section("mistakes", "Vanliga misstag", [
        "Lite vatten ofta kan lämna djupare rötter torra. Vattenmättad jord kan samtidigt ge syrebrist. Anpassa mängd och intervall efter jord, kärl, väder och växtens fas.",
      ]),
    ],
  },
  {
    id: "guide-harden",
    slug: "avharda-plantor",
    title: "Så avhärdar du plantor",
    intro: "En lugn övergång minskar stress när förodlade plantor möter sol, vind och svalare nätter.",
    category: "Säsong",
    audience: "Den som förodlar",
    reviewedAt: accessedAt,
    relatedPlants: [],
    relatedEvents: ["avhärdning", "utplantering"],
    version: 1,
    sources: [weeds, tomato],
    sections: [
      section("why", "Varför avhärdning behövs", [
        "Inomhusplantor är vana vid jämn temperatur, svagare ljus och lite vind. Etablerade odlingsråd rekommenderar att de får vänja sig vid utomhusklimat före utplantering.",
      ]),
      section("steps", "Stegvis under flera dagar", ["Låt väder och art styra tempot."], [
        "Börja kort i skyddat, ljust men inte brännande läge.",
        "Öka tiden ute gradvis.",
        "Introducera mer sol och vind försiktigt.",
        "Ta in frostkänsliga plantor vid kalla nätter.",
      ]),
      section("ready", "När plantan är redo", [
        "Plantan ska hålla spänsten och inte få tydliga sol- eller köldskador efter passen ute. Avhärdning gör inte en frostkänslig art frosttålig.",
      ]),
    ],
  },
  {
    id: "guide-easy",
    slug: "fem-lattodlade-gronsaker",
    title: "Fem lättodlade grönsaker för nybörjare",
    intro: "Välj grödor som ger snabb återkoppling och går att odla i liten skala.",
    category: "Nybörjarguider",
    audience: "Nybörjare",
    reviewedAt: accessedAt,
    relatedPlants: ["radisa", "sallat", "sockerarta", "zucchini", "potatis"],
    relatedEvents: ["direktsådd", "skörd"],
    version: 1,
    sources: [rotation],
    sections: [
      section("choices", "Fem praktiska starter", [
        "Rädisa, sallat, sockerärt, zucchini och potatis ger olika typer av erfarenhet. Välj två eller tre i stället för att fylla hela ytan första året.",
      ], ["Rädisa: snabb men vill ha jämn fukt.", "Sallat: så små omgångar för jämn skörd.", "Sockerärt: ge stöd tidigt.", "Zucchini: ge gott om plats.", "Potatis: lätt att följa från sättning till skörd."]),
      section("place", "Matcha platsen", [
        "Sol, jorddjup och tillgång till vatten är viktigare än en generell topplista. Följ växtföljd över tid och dokumentera vad som fungerade på just din plats.",
      ]),
      section("learn", "Lär med små omgångar", [
        "Så en begränsad mängd, registrera datum och skapa en ny odlingsomgång vid nästa sådd. Då blandas inte resultaten ihop.",
      ]),
    ],
  },
  {
    id: "guide-frost",
    slug: "skydda-mot-nattfrost",
    title: "Skydda växter mot nattfrost",
    intro: "Förstå lokala frostlägen och välj en proportionerlig åtgärd innan en kall natt.",
    category: "Säsong",
    audience: "Alla odlare",
    reviewedAt: accessedAt,
    relatedPlants: [],
    relatedEvents: ["utplantering"],
    version: 1,
    sources: [smhi, weeds],
    caution: "GroBiggis visar vägledning, inte en lokal frostgaranti.",
    sections: [
      section("risk", "När risken ökar", [
        "Klara, vindsvaga nätter kan kyla markytan kraftigt. Öppna och lågt belägna platser kan vara mer utsatta än ett skyddat läge.",
      ]),
      section("protect", "Rimliga skydd", ["Förebygg hellre än att försöka reparera frostskada."], [
        "Flytta små krukor till frostfritt läge.",
        "Täck känsliga plantor med lämplig odlingsväv.",
        "Förankra skyddet och undvik att tungt material pressar plantan.",
        "Ta bort eller vädra skydd när temperaturen stiger.",
      ]),
      section("after", "Efter en kall natt", [
        "Vänta tills växten tinat och bedöm skadan innan du beskär. Registrera observationen; en prognos ska aldrig skrivas om som om frost faktiskt inträffade.",
      ]),
    ],
  },
  {
    id: "guide-yellow",
    slug: "vanliga-orsaker-gula-blad",
    title: "Vanliga orsaker till gula blad",
    intro: "Gula blad är ett symptom. Börja med mönster, jord och tillväxt i stället för en snabb diagnos.",
    category: "Växtproblem",
    audience: "Alla odlare",
    reviewedAt: accessedAt,
    relatedPlants: [],
    relatedEvents: [],
    version: 1,
    sources: [yellow, tomato],
    caution: "Liknande symptom kan ha flera orsaker; undvik behandling utan rimlig diagnos.",
    sections: [
      section("observe", "Se var gulningen börjar", [
        "Äldre blad, unga blad, fläckar och jämn blekning ger olika ledtrådar. Kontrollera samtidigt ny tillväxt, jordfukt, rötter och nyliga förändringar.",
      ]),
      section("causes", "Vanliga förklaringar", [
        "Näringsbrist kan ge gulnande äldre blad när växten flyttar resurser till ny tillväxt. För blöt eller torr jord, ljusbrist, kyla och naturligt åldrande kan se liknande ut.",
      ], ["Kontrollera fukten i rotzonen.", "Se efter dränering och rotträngsel.", "Jämför gamla och nya blad.", "Ändra en sak i taget och följ resultatet."]),
      section("help", "När du behöver mer hjälp", [
        "Snabb försämring, tydliga angrepp eller återkommande problem motiverar art- och platsanpassad rådgivning. Ett foto kan stödja observationen men är inte en säker diagnos.",
      ]),
    ],
  },
  {
    id: "guide-harvest",
    slug: "skorda-for-smak",
    title: "Skörda för mer smak och längre säsong",
    intro: "Skörda i rätt utvecklingsfas och återkom ofta till grödor som fortsätter producera.",
    category: "Skörd",
    audience: "Alla odlare",
    reviewedAt: accessedAt,
    relatedPlants: ["tomat", "sallat", "sockerarta", "zucchini"],
    relatedEvents: ["skörd"],
    version: 1,
    sources: [tomato, rotation],
    sections: [
      section("ready", "Läs växten, inte bara datumet", [
        "Färg, storlek, fasthet och smak är bättre mognadstecken än ett generellt kalenderdatum. Sort och väder påverkar utvecklingen.",
      ]),
      section("often", "Skörda regelbundet", [
        "Många frukt- och baljväxter fortsätter sätta skörd när mogna delar plockas. Sallat kan skördas bladvis om plantan och sorten lämpar sig.",
      ], ["Skörda svalt på dagen när det passar grödan.", "Använd rena redskap där stjälkar behöver klippas.", "Registrera första skörd som faktisk händelse.", "Skapa inte historik för skörd som bara är prognostiserad."]),
      section("season", "Förläng utan falska löften", [
        "Skyddat läge och lämplig sort kan förlänga perioden, men frost och avtagande ljus sätter gränser. Gröna tomater kan ofta eftermogna inomhus enligt etablerade odlingsråd.",
      ]),
    ],
  },
] satisfies KnowledgeGuide[];

export const guideCategories = ["Alla", ...new Set(guides.map((guide) => guide.category))] as const;

export function articleWordCount(article: KnowledgeGuide) {
  return [
    article.title,
    article.intro,
    ...article.sections.flatMap((item) => [item.heading, ...item.paragraphs, ...(item.steps ?? [])]),
  ]
    .join(" ")
    .trim()
    .split(/\s+/u)
    .filter(Boolean).length;
}

export function readingMinutes(article: KnowledgeGuide, wordsPerMinute = 200) {
  return Math.max(1, Math.ceil(articleWordCount(article) / wordsPerMinute));
}

export function findGuideBySlug(slug: string) {
  return guides.find((guide) => guide.slug === slug);
}

export function relatedGuidesFor(article: KnowledgeGuide, limit = 3) {
  return guides
    .filter((guide) => {
      if (guide.slug === article.slug) return false;
      if (guide.category === article.category) return true;
      return guide.relatedPlants.some((plant) => article.relatedPlants.includes(plant));
    })
    .slice(0, limit);
}
