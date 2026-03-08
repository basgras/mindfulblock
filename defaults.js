export const DEFAULT_PROMPTS = [
  "box breathing 4 4 4 4 guide",
  "two minute grounding exercise",
  "short body scan meditation script",
  "how to reset your nervous system fast",
  "5 minute mindful movement routine",
  "simple breathing techniques for stress",
  "benefits of a 10 minute walk",
  "how to improve focus naturally",
  "quick gratitude practice ideas",
  "how to stop doomscrolling",
  "science of deep breathing",
  "micro habits that improve your day",
  "how to calm anxiety in the moment",
  "one minute meditation technique",
  "how to refocus after distraction",
  "short stretching routine at desk",
  "how to relax your jaw and shoulders",
  "morning routine for mental clarity",
  "evening wind down ritual ideas",
  "how to build attention span",
  "short loving kindness meditation",
  "how to reduce stress hormones naturally",
  "quick journaling prompts for clarity",
  "how to take a mindful break",
  "simple ways to boost mood naturally",
  "how to be present right now",
  "what is cognitive overload",
  "dopamine detox explained",
  "how to train your focus muscle",
  "benefits of slowing down",
  "breathing exercises for better sleep",
  "short mindfulness exercises for work",
  "how to feel grounded quickly",
  "tiny habits for personal growth",
  "science backed ways to relax",
  "how to improve self discipline",
  "how to create calm in daily life",
  "how to stop impulsive browsing",
  "mindful tech use strategies",
  "how to reset after overwhelm",
  "simple self compassion practice",
  "how to strengthen willpower",
  "short reflection questions for clarity",
  "how to increase deep work time",
  "how to reduce digital distraction",
  "how to pause before reacting",
  "what is parasympathetic activation",
  "quick energy reset without caffeine",
  "how to feel more centered",
  "benefits of mindful breathing",
  "small acts of kindness ideas",
  "how to help a neighbor today",
  "ways to support local community",
  "volunteering opportunities near me",
  "how to reduce food waste at home",
  "simple ways to lower carbon footprint",
  "how to support local businesses",
  "random acts of kindness stories",
  "how to start a community garden",
  "how to check in on a friend",
  "how to support someone grieving",
  "how to be a better listener",
  "climate actions individuals can take",
  "how to write to your representative",
  "how to organize a neighborhood cleanup",
  "how to donate blood process",
  "how to mentor someone in your field",
  "ways to support teachers locally",
  "how to foster animals near me",
  "how to adopt a rescue dog",
  "how to support refugees locally",
  "how to reduce plastic use daily",
  "how to compost at home",
  "how to host a clothing swap",
  "how to share skills in your community",
  "how to start a mutual aid group",
  "how to reduce energy use at home",
  "how to talk to someone who disagrees respectfully",
  "how to practice restorative justice",
  "how to support mental health awareness",
  "how to be an ally at work",
  "how to support small creators",
  "how to help elderly neighbors",
  "how to volunteer remotely",
  "how to plant native species garden",
  "how to create a kindness challenge",
  "how to support local journalism",
  "how to give constructive feedback kindly",
  "how to build community connections",
  "how to teach kids about empathy",
  "how to organize a book drive",
  "how to support sustainable brands",
  "how to reduce water waste at home",
  "how to make your workplace more inclusive",
  "how to practice ethical consumerism",
  "how to reduce fast fashion impact",
  "how to advocate for climate policy",
  "how to start a neighborhood tool library",
  "how to make a positive impact today"
];

export const DEFAULT_SETTINGS = {
  enabled: true,
  blockedDomains: ["facebook.com", "x.com", "instagram.com", "youtube.com", "reddit.com"],
  prompts: DEFAULT_PROMPTS,
  ecosiaEnabled: true,
  oceanHeroEnabled: true,
  imageSearchEnabled: false
};

export function normalizeDomain(input) {
  const value = (input || "").trim().toLowerCase();
  if (!value) {
    return "";
  }

  const parsedValue = value.includes("://") ? value : `https://${value}`;

  try {
    const url = new URL(parsedValue);
    return url.hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

export function sanitizePrompts(prompts) {
  return Array.isArray(prompts)
    ? [...new Set(prompts.map((prompt) => `${prompt}`.trim()).filter(Boolean))]
    : [];
}

export function sanitizeDomains(domains) {
  return Array.isArray(domains)
    ? [...new Set(domains.map(normalizeDomain).filter(Boolean))].sort()
    : [];
}

export function hasOwn(settings, key) {
  return Object.prototype.hasOwnProperty.call(settings, key);
}
