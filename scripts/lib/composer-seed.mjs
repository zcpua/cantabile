// 20-composer seed list for the Wikidata sync. QIDs are stable identifiers;
// verify with `node scripts/sync-wikidata.mjs --list-composers` before saving.
// id: matches src/data/composers.ts when one exists; otherwise a kebab-case slug.

export const composerSeed = [
  { id: "bach", qid: "Q1339", name: "Johann Sebastian Bach" },
  { id: "handel", qid: "Q7302", name: "George Frideric Handel" },
  { id: "vivaldi", qid: "Q1340", name: "Antonio Vivaldi" },
  { id: "mozart", qid: "Q254", name: "Wolfgang Amadeus Mozart" },
  { id: "haydn", qid: "Q7349", name: "Joseph Haydn" },
  { id: "beethoven", qid: "Q255", name: "Ludwig van Beethoven" },
  { id: "schubert", qid: "Q7312", name: "Franz Schubert" },
  { id: "chopin", qid: "Q1268", name: "Frédéric Chopin" },
  { id: "schumann", qid: "Q7351", name: "Robert Schumann" },
  { id: "mendelssohn", qid: "Q46096", name: "Felix Mendelssohn" },
  { id: "liszt", qid: "Q41309", name: "Franz Liszt" },
  { id: "wagner", qid: "Q1511", name: "Richard Wagner" },
  { id: "verdi", qid: "Q7317", name: "Giuseppe Verdi" },
  { id: "brahms", qid: "Q7294", name: "Johannes Brahms" },
  { id: "tchaikovsky", qid: "Q7315", name: "Pyotr Ilyich Tchaikovsky" },
  { id: "dvorak", qid: "Q7298", name: "Antonín Dvořák" },
  { id: "mahler", qid: "Q7304", name: "Gustav Mahler" },
  { id: "debussy", qid: "Q4700", name: "Claude Debussy" },
  { id: "ravel", qid: "Q1178", name: "Maurice Ravel" },
  { id: "stravinsky", qid: "Q7314", name: "Igor Stravinsky" },
];
