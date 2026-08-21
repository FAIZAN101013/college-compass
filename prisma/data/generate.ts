import type { CollegeSeed, CollegeTypeName, StreamName } from "./colleges";

/**
 * Deterministic generators for the seed dataset.
 *
 * ── Why "deterministic" matters ───────────────────────────────────────────
 * The obvious way to fake data is Math.random(). Do not. With Math.random(),
 * every `npm run db:seed` produces a different database, which means:
 *   - A bug you hit while demoing cannot be reproduced afterwards.
 *   - Screenshots and the Loom stop matching the live site after a reseed.
 *   - "IIT Bombay has a 4.6 rating" is true today and false tomorrow.
 *
 * Instead we hash each college's slug into a 32-bit seed and run a small
 * seeded PRNG. Same input, same output, forever. Reseeding the database
 * reproduces it byte for byte, on any machine.
 */

// ---------------------------------------------------------------------------
// Seeded pseudo-random number generator
// ---------------------------------------------------------------------------

/**
 * FNV-1a hash. Turns an arbitrary string into a well-distributed 32-bit int.
 * We use it to derive a distinct PRNG seed per college from its slug, so
 * "iit-bombay" always produces the same numbers regardless of what order the
 * colleges are processed in — adding a college to the list does not change
 * the data of any other college.
 */
function hashString(input: string): number {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    // The FNV prime, applied with shifts because JS bitwise ops are 32-bit
    // and a plain multiply would overflow into a float.
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }
  return hash >>> 0; // coerce to unsigned 32-bit
}

/**
 * mulberry32 — a compact, well-tested seeded PRNG. Not cryptographically
 * secure, which is fine: we are generating demo fees, not session tokens.
 * (Anything security-sensitive in this project uses node:crypto instead.)
 */
function mulberry32(seed: number): () => number {
  let a = seed;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A small ergonomic wrapper so call sites read as intent, not arithmetic. */
export type Rng = {
  /** Random integer in [min, max], inclusive on both ends. */
  int(min: number, max: number): number;
  /** Random float in [min, max), rounded to `decimals` places. */
  float(min: number, max: number, decimals?: number): number;
  /** One random element. */
  pick<T>(items: readonly T[]): T;
  /** `count` distinct elements, order preserved from the source array. */
  sample<T>(items: readonly T[], count: number): T[];
  /** True with the given probability (0..1). */
  chance(probability: number): boolean;
};

export function makeRng(seedSource: string): Rng {
  const next = mulberry32(hashString(seedSource));

  return {
    int: (min, max) => Math.floor(next() * (max - min + 1)) + min,
    float: (min, max, decimals = 2) => {
      const value = next() * (max - min) + min;
      const factor = 10 ** decimals;
      return Math.round(value * factor) / factor;
    },
    pick: (items) => items[Math.floor(next() * items.length)],
    sample: (items, count) => {
      // Copy before shuffling — mutating the caller's array would corrupt the
      // shared constant pools below on the very first call.
      const pool = [...items];
      // Fisher-Yates. Unlike `sort(() => rand - 0.5)`, this is genuinely
      // uniform; the sort trick produces a measurably biased distribution.
      for (let i = pool.length - 1; i > 0; i--) {
        const j = Math.floor(next() * (i + 1));
        [pool[i], pool[j]] = [pool[j], pool[i]];
      }
      return pool.slice(0, Math.min(count, pool.length));
    },
    chance: (probability) => next() < probability,
  };
}

// ---------------------------------------------------------------------------
// Slugs
// ---------------------------------------------------------------------------

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD") // splits accented characters into letter + accent mark
    .replace(/[̀-ͯ]/g, "") // drops the accent marks
    .replace(/[^a-z0-9]+/g, "-") // everything else becomes a separator
    .replace(/^-+|-+$/g, ""); // trim leading/trailing separators
}

// ---------------------------------------------------------------------------
// Fees
// ---------------------------------------------------------------------------

/**
 * Annual fee in whole rupees for a TIER-2 institution, by stream and
 * ownership type. Tier multiplies on top.
 *
 * This is an explicit 8x4 table rather than a formula because Indian fee
 * structures genuinely do not follow one rule: a government engineering seat
 * costs far more than a government medical seat, while a deemed medical seat
 * costs far more than a deemed engineering seat. A single "government is
 * cheap" multiplier would produce numbers an Indian reviewer spots as wrong
 * immediately.
 */
const FEE_TABLE: Record<StreamName, Record<CollegeTypeName, number>> = {
  ENGINEERING: { GOVERNMENT: 150_000, AUTONOMOUS: 180_000, DEEMED: 320_000, PRIVATE: 220_000 },
  MANAGEMENT:  { GOVERNMENT: 900_000, AUTONOMOUS: 600_000, DEEMED: 750_000, PRIVATE: 1_000_000 },
  MEDICAL:     { GOVERNMENT: 45_000,  AUTONOMOUS: 120_000, DEEMED: 1_400_000, PRIVATE: 900_000 },
  LAW:         { GOVERNMENT: 220_000, AUTONOMOUS: 90_000,  DEEMED: 350_000, PRIVATE: 500_000 },
  SCIENCE:     { GOVERNMENT: 30_000,  AUTONOMOUS: 45_000,  DEEMED: 180_000, PRIVATE: 200_000 },
  COMMERCE:    { GOVERNMENT: 20_000,  AUTONOMOUS: 35_000,  DEEMED: 150_000, PRIVATE: 180_000 },
  ARTS:        { GOVERNMENT: 18_000,  AUTONOMOUS: 30_000,  DEEMED: 130_000, PRIVATE: 160_000 },
  DESIGN:      { GOVERNMENT: 350_000, AUTONOMOUS: 250_000, DEEMED: 400_000, PRIVATE: 450_000 },
};

const TIER_FEE_MULTIPLIER: Record<1 | 2 | 3, number> = { 1: 1.4, 2: 1.0, 3: 0.75 };

// ---------------------------------------------------------------------------
// Course catalogue
// ---------------------------------------------------------------------------

type DegreeName =
  | "BTECH" | "MTECH" | "MBA" | "BBA" | "MBBS" | "BDS"
  | "BSC" | "MSC" | "BA" | "BCOM" | "LLB" | "BDES";

type CourseTemplate = {
  name: string;
  degree: DegreeName;
  durationMonths: number;
  /** Multiplies the college's base fee. An M.Tech costs less than a B.Tech. */
  feeMultiplier: number;
  seats: [min: number, max: number];
  exams: string[];
};

const COURSE_CATALOG: Record<StreamName, CourseTemplate[]> = {
  ENGINEERING: [
    { name: "B.Tech Computer Science and Engineering", degree: "BTECH", durationMonths: 48, feeMultiplier: 1.1, seats: [60, 240], exams: ["JEE Main"] },
    { name: "B.Tech Electronics and Communication Engineering", degree: "BTECH", durationMonths: 48, feeMultiplier: 1.0, seats: [60, 180], exams: ["JEE Main"] },
    { name: "B.Tech Mechanical Engineering", degree: "BTECH", durationMonths: 48, feeMultiplier: 0.95, seats: [60, 180], exams: ["JEE Main"] },
    { name: "B.Tech Civil Engineering", degree: "BTECH", durationMonths: 48, feeMultiplier: 0.9, seats: [40, 120], exams: ["JEE Main"] },
    { name: "B.Tech Artificial Intelligence and Data Science", degree: "BTECH", durationMonths: 48, feeMultiplier: 1.15, seats: [60, 180], exams: ["JEE Main"] },
    { name: "M.Tech Computer Science and Engineering", degree: "MTECH", durationMonths: 24, feeMultiplier: 0.7, seats: [20, 60], exams: ["GATE"] },
  ],
  MANAGEMENT: [
    { name: "Master of Business Administration", degree: "MBA", durationMonths: 24, feeMultiplier: 1.0, seats: [60, 600], exams: ["CAT", "XAT"] },
    { name: "MBA Business Analytics", degree: "MBA", durationMonths: 24, feeMultiplier: 1.1, seats: [40, 120], exams: ["CAT", "GMAT"] },
    { name: "Bachelor of Business Administration", degree: "BBA", durationMonths: 36, feeMultiplier: 0.35, seats: [60, 300], exams: ["CUET"] },
  ],
  MEDICAL: [
    { name: "Bachelor of Medicine and Bachelor of Surgery", degree: "MBBS", durationMonths: 66, feeMultiplier: 1.0, seats: [100, 250], exams: ["NEET UG"] },
    { name: "Bachelor of Dental Surgery", degree: "BDS", durationMonths: 60, feeMultiplier: 0.7, seats: [40, 100], exams: ["NEET UG"] },
  ],
  LAW: [
    { name: "B.A. LL.B. (Hons.)", degree: "LLB", durationMonths: 60, feeMultiplier: 1.0, seats: [60, 240], exams: ["CLAT"] },
    { name: "B.B.A. LL.B. (Hons.)", degree: "LLB", durationMonths: 60, feeMultiplier: 1.0, seats: [40, 180], exams: ["CLAT", "LSAT India"] },
  ],
  SCIENCE: [
    { name: "B.Sc. (Hons.) Physics", degree: "BSC", durationMonths: 36, feeMultiplier: 1.0, seats: [40, 120], exams: ["CUET"] },
    { name: "B.Sc. (Hons.) Mathematics", degree: "BSC", durationMonths: 36, feeMultiplier: 1.0, seats: [40, 120], exams: ["CUET"] },
    { name: "M.Sc. Chemistry", degree: "MSC", durationMonths: 24, feeMultiplier: 1.15, seats: [20, 60], exams: ["IIT JAM"] },
  ],
  COMMERCE: [
    { name: "B.Com. (Hons.)", degree: "BCOM", durationMonths: 36, feeMultiplier: 1.0, seats: [80, 400], exams: ["CUET"] },
    { name: "Bachelor of Business Administration", degree: "BBA", durationMonths: 36, feeMultiplier: 1.1, seats: [60, 240], exams: ["CUET"] },
  ],
  ARTS: [
    { name: "B.A. (Hons.) Economics", degree: "BA", durationMonths: 36, feeMultiplier: 1.1, seats: [40, 160], exams: ["CUET"] },
    { name: "B.A. (Hons.) English", degree: "BA", durationMonths: 36, feeMultiplier: 1.0, seats: [40, 160], exams: ["CUET"] },
    { name: "B.A. (Hons.) Political Science", degree: "BA", durationMonths: 36, feeMultiplier: 1.0, seats: [40, 160], exams: ["CUET"] },
  ],
  DESIGN: [
    { name: "B.Des. Product Design", degree: "BDES", durationMonths: 48, feeMultiplier: 1.0, seats: [30, 90], exams: ["UCEED", "NID DAT"] },
    { name: "B.Des. Communication Design", degree: "BDES", durationMonths: 48, feeMultiplier: 1.0, seats: [30, 90], exams: ["UCEED", "NIFT Entrance"] },
  ],
};

export type GeneratedCourse = {
  name: string;
  degree: DegreeName;
  stream: StreamName;
  durationMonths: number;
  annualFee: number;
  totalSeats: number;
  examsAccepted: string[];
};

export function generateCourses(college: CollegeSeed, rng: Rng): GeneratedCourse[] {
  const courses: GeneratedCourse[] = [];

  for (const stream of college.streams) {
    const base = FEE_TABLE[stream][college.type] * TIER_FEE_MULTIPLIER[college.tier];
    const templates = COURSE_CATALOG[stream];

    // Tier-1 institutions offer a broader catalogue; tier-3 a narrower one.
    const howMany = Math.min(
      templates.length,
      college.tier === 1 ? rng.int(3, templates.length) : rng.int(2, Math.max(2, templates.length - 1)),
    );

    for (const template of rng.sample(templates, howMany)) {
      // Round to the nearest 500 rupees. Real fee structures are round
      // numbers; a fee of 213,847 immediately reads as machine-generated.
      const fee = Math.round((base * template.feeMultiplier * rng.float(0.92, 1.08, 4)) / 500) * 500;

      // The very top government engineering schools admit through JEE
      // Advanced, not JEE Main. Encoding the real admission route here is
      // what makes the "filter by exam" feature actually meaningful.
      const exams =
        stream === "ENGINEERING" &&
        college.tier === 1 &&
        college.type === "GOVERNMENT" &&
        college.shortName.startsWith("IIT") &&
        template.degree === "BTECH"
          ? ["JEE Advanced"]
          : template.exams;

      courses.push({
        name: template.name,
        degree: template.degree,
        stream,
        durationMonths: template.durationMonths,
        annualFee: fee,
        totalSeats: rng.int(template.seats[0], template.seats[1]),
        examsAccepted: exams,
      });
    }
  }

  return courses;
}

// ---------------------------------------------------------------------------
// Placements
// ---------------------------------------------------------------------------

/** Median annual package in whole rupees, by stream and tier. */
const MEDIAN_PACKAGE: Record<StreamName, Record<1 | 2 | 3, number>> = {
  ENGINEERING: { 1: 1_600_000, 2: 700_000, 3: 420_000 },
  MANAGEMENT:  { 1: 2_800_000, 2: 1_300_000, 3: 700_000 },
  MEDICAL:     { 1: 1_100_000, 2: 800_000, 3: 600_000 },
  LAW:         { 1: 1_500_000, 2: 850_000, 3: 550_000 },
  SCIENCE:     { 1: 900_000, 2: 600_000, 3: 420_000 },
  COMMERCE:    { 1: 800_000, 2: 550_000, 3: 400_000 },
  ARTS:        { 1: 700_000, 2: 500_000, 3: 380_000 },
  DESIGN:      { 1: 1_000_000, 2: 650_000, 3: 480_000 },
};

const RECRUITERS: Record<StreamName, string[]> = {
  ENGINEERING: ["Google", "Microsoft", "Amazon", "Qualcomm", "Texas Instruments", "Adobe", "Goldman Sachs", "Nvidia", "Samsung R&D", "Infosys", "TCS Digital", "Zomato", "Flipkart", "Oracle", "Intel", "Larsen & Toubro"],
  MANAGEMENT: ["McKinsey & Company", "Bain & Company", "Boston Consulting Group", "Goldman Sachs", "JP Morgan Chase", "Accenture Strategy", "Amazon", "Hindustan Unilever", "ITC", "Deloitte", "Aditya Birla Group", "Tata Administrative Service"],
  MEDICAL: ["Apollo Hospitals", "Fortis Healthcare", "Max Healthcare", "Manipal Hospitals", "Narayana Health", "Medanta", "AIIMS", "Cloudnine"],
  LAW: ["Cyril Amarchand Mangaldas", "Shardul Amarchand Mangaldas", "AZB & Partners", "Khaitan & Co", "Trilegal", "Luthra & Luthra", "J Sagar Associates", "Linklaters"],
  SCIENCE: ["ISRO", "DRDO", "Bhabha Atomic Research Centre", "Tata Institute of Fundamental Research", "Reliance Research", "Novartis", "Biocon", "Dr Reddy's Laboratories"],
  COMMERCE: ["Deloitte", "EY", "KPMG", "PwC", "HDFC Bank", "ICICI Bank", "Grant Thornton", "Axis Bank"],
  ARTS: ["Times of India", "NDTV", "Teach for India", "Ministry of External Affairs", "Ipsos", "Nielsen", "Ogilvy", "Deloitte"],
  DESIGN: ["Titan", "Godrej Design Lab", "Tata Elxsi", "Swiggy", "Zomato Design", "Flipkart", "Wipro Design", "Landor & Fitch"],
};

export type GeneratedPlacement = {
  year: number;
  medianPackage: number;
  averagePackage: number;
  highestPackage: number;
  placementRate: number;
  topRecruiters: string[];
};

/** Placement years we generate, oldest first. */
const PLACEMENT_YEARS = [2023, 2024, 2025];

export function generatePlacements(college: CollegeSeed, rng: Rng): GeneratedPlacement[] {
  // A college's placement profile is driven by its strongest stream — an
  // institute that teaches both engineering and arts is known for whichever
  // pays better, and that is what its headline placement number reflects.
  const primaryStream = [...college.streams].sort(
    (a, b) => MEDIAN_PACKAGE[b][college.tier] - MEDIAN_PACKAGE[a][college.tier],
  )[0];

  const baseMedian = MEDIAN_PACKAGE[primaryStream][college.tier];

  return PLACEMENT_YEARS.map((year, index) => {
    // ~7% year-on-year growth, so the detail page shows a real upward trend
    // instead of three unrelated numbers.
    const growth = 1 + 0.07 * index;
    const median = Math.round((baseMedian * growth * rng.float(0.9, 1.1, 4)) / 10_000) * 10_000;

    return {
      year,
      medianPackage: median,
      // Average always exceeds median in salary data — the distribution is
      // right-skewed, because a handful of very large offers pull the mean up
      // while the median barely moves. Generating average < median would be
      // an immediate tell that the data is fake.
      averagePackage: Math.round((median * rng.float(1.15, 1.35, 4)) / 10_000) * 10_000,
      highestPackage: Math.round((median * rng.float(6, 14, 4)) / 100_000) * 100_000,
      placementRate:
        college.tier === 1
          ? rng.float(88, 98, 1)
          : college.tier === 2
            ? rng.float(72, 90, 1)
            : rng.float(55, 80, 1),
      topRecruiters: rng.sample(RECRUITERS[primaryStream], rng.int(5, 8)),
    };
  });
}

// ---------------------------------------------------------------------------
// Reviews
// ---------------------------------------------------------------------------

const FIRST_NAMES = ["Aarav", "Ananya", "Rohan", "Sneha", "Vikram", "Priya", "Karthik", "Divya", "Arjun", "Meera", "Siddharth", "Nandini", "Rahul", "Ishita", "Aditya", "Kavya", "Manish", "Pooja", "Harsh", "Tanvi", "Nikhil", "Shreya", "Varun", "Aisha", "Rishabh", "Neha", "Aman", "Riya", "Kunal", "Sanjana"];
const LAST_NAMES = ["Sharma", "Verma", "Iyer", "Reddy", "Nair", "Patel", "Gupta", "Menon", "Bose", "Chatterjee", "Singh", "Joshi", "Rao", "Desai", "Kulkarni", "Banerjee", "Pillai", "Agarwal", "Malhotra", "Krishnan"];

/** Sentence pools, indexed by how positive the review is. */
const ACADEMICS = {
  high: ["The faculty genuinely know their subject and most are approachable outside class.", "Coursework is demanding but the depth is worth it, especially in the core subjects.", "Research opportunities are real here if you take the initiative to approach professors."],
  mid: ["Teaching quality varies a lot by department, so choose your electives carefully.", "The syllabus is solid on paper but delivery depends heavily on which professor you get.", "Core subjects are taught well, though some electives feel dated."],
  low: ["The syllabus badly needs updating, particularly on the software side.", "Attendance rules are enforced far more strictly than teaching quality is.", "Too much emphasis on rote exams and not enough on practical work."],
};

const PLACEMENTS_TEXT = {
  high: ["Placement cell is well organised and the on-campus process starts early.", "Top companies visit consistently and the preparation support is genuinely useful.", "Alumni network helps a lot during off-campus applications too."],
  mid: ["Placements are decent for the core branches, less so for the others.", "You will need to prepare on your own; the training sessions only take you so far.", "Package numbers look good on paper but the median is what you should look at."],
  low: ["Placement support is limited and mostly benefits a small group of students.", "Very few product companies visit, so most people rely on off-campus applications.", "The advertised highest package is not representative of what most students get."],
};

const CAMPUS = {
  high: ["Campus infrastructure is excellent, and the library and labs stay open late.", "Hostel facilities are comfortable and the mess food is better than most places.", "Plenty of active clubs and fests, so there is a lot to do outside academics."],
  mid: ["Infrastructure is adequate; some buildings are newer than others.", "Hostel allocation can be a hassle in the first year but improves later.", "Campus life is fine, though it can feel quiet during exam months."],
  low: ["Hostel and mess facilities need serious improvement.", "Lab equipment is outdated and often shared between too many students.", "Administration is slow and getting basic paperwork done takes far too long."],
};

const TITLES = {
  high: ["Genuinely one of the best decisions I made", "Strong academics and even stronger peer group", "Worth every rupee", "Great exposure and excellent placements"],
  mid: ["Good overall, with some clear gaps", "Solid choice if you are self-driven", "Decent college, manage your expectations", "Mixed experience but no regrets"],
  low: ["Falls short of what the brochure promises", "Below expectations for the fee charged", "Needs a lot of improvement", "Would think twice before recommending"],
};

export type GeneratedReview = {
  authorName: string;
  rating: number;
  title: string;
  body: string;
  courseName: string | null;
  gradYear: number;
};

export function generateReviews(
  college: CollegeSeed,
  courses: GeneratedCourse[],
  rng: Rng,
): GeneratedReview[] {
  const count = college.tier === 1 ? rng.int(6, 10) : rng.int(3, 7);

  return Array.from({ length: count }, () => {
    // Rating distribution shifts with tier, but every tier can produce any
    // rating. Making tier-1 colleges always 5 stars would flatten the data and
    // make the "sort by rating" feature pointless to demo.
    const rating =
      college.tier === 1
        ? rng.pick([5, 5, 5, 4, 4, 4, 3])
        : college.tier === 2
          ? rng.pick([5, 4, 4, 4, 3, 3, 2])
          : rng.pick([4, 4, 3, 3, 3, 2, 2]);

    const bucket = rating >= 4 ? "high" : rating === 3 ? "mid" : "low";

    return {
      authorName: `${rng.pick(FIRST_NAMES)} ${rng.pick(LAST_NAMES)}`,
      rating,
      title: rng.pick(TITLES[bucket]),
      body: [
        rng.pick(ACADEMICS[bucket]),
        rng.pick(PLACEMENTS_TEXT[bucket]),
        rng.pick(CAMPUS[bucket]),
      ].join(" "),
      courseName: courses.length > 0 ? rng.pick(courses).name : null,
      gradYear: rng.int(2021, 2025),
    };
  });
}

// ---------------------------------------------------------------------------
// Descriptive fields
// ---------------------------------------------------------------------------

const FACILITY_POOL = ["Central Library", "Boys Hostel", "Girls Hostel", "Sports Complex", "Research Labs", "Wi-Fi Campus", "Gymnasium", "Cafeteria", "Auditorium", "Medical Centre", "Innovation and Incubation Centre", "Placement Cell", "Bank and ATM", "Transport Service"];

const STREAM_LABEL: Record<StreamName, string> = {
  ENGINEERING: "engineering and technology",
  MANAGEMENT: "management",
  MEDICAL: "medicine and health sciences",
  LAW: "law",
  SCIENCE: "the sciences",
  COMMERCE: "commerce",
  ARTS: "the humanities",
  DESIGN: "design",
};

const TYPE_LABEL: Record<CollegeTypeName, string> = {
  GOVERNMENT: "government-funded",
  PRIVATE: "private",
  DEEMED: "deemed-to-be-university",
  AUTONOMOUS: "autonomous",
};

export function generateDescription(college: CollegeSeed): string {
  const streams = college.streams.map((s) => STREAM_LABEL[s]);
  const streamText =
    streams.length === 1
      ? streams[0]
      : `${streams.slice(0, -1).join(", ")} and ${streams[streams.length - 1]}`;

  const ranking = college.nirfRank
    ? ` It currently holds NIRF rank ${college.nirfRank} in its category.`
    : "";

  return (
    `${college.name} is a ${TYPE_LABEL[college.type]} institution in ${college.city}, ` +
    `${college.state}, established in ${college.established}. It offers programmes across ` +
    `${streamText}, and is known for its academic rigour and active campus life.${ranking} ` +
    `Admissions are competitive and largely driven by national entrance examinations.`
  );
}

export function generateApprovals(college: CollegeSeed, rng: Rng): string[] {
  const approvals: string[] = ["UGC"];

  if (college.streams.includes("ENGINEERING") || college.streams.includes("MANAGEMENT")) {
    approvals.push("AICTE");
  }
  if (college.streams.includes("MEDICAL")) approvals.push("NMC");
  if (college.streams.includes("LAW")) approvals.push("BCI");

  // NAAC grades correlate with tier, which is why this is not a flat random pick.
  approvals.push(
    college.tier === 1 ? rng.pick(["NAAC A++", "NAAC A+"]) : college.tier === 2 ? rng.pick(["NAAC A+", "NAAC A"]) : rng.pick(["NAAC A", "NAAC B++"]),
  );

  return approvals;
}

export function generateFacilities(rng: Rng): string[] {
  return rng.sample(FACILITY_POOL, rng.int(7, 11));
}

/**
 * A small rotating set of campus photographs. Deliberately a fixed list
 * rather than a per-college lookup: we do not have a licensed photo of every
 * institution, and using a wrong building photo would be worse than using an
 * obviously generic one. The UI degrades to a generated gradient if the
 * image fails to load.
 */
const CAMPUS_IMAGES = [
  "https://images.unsplash.com/photo-1562774053-701939374585?w=1200&q=70",
  "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=1200&q=70",
  "https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=1200&q=70",
  "https://images.unsplash.com/photo-1607237138185-eedd9c632b0b?w=1200&q=70",
  "https://images.unsplash.com/photo-1592280771190-3e2e4d571952?w=1200&q=70",
  "https://images.unsplash.com/photo-1498243691581-b145c3f54a5a?w=1200&q=70",
];

export function generateImageUrl(rng: Rng): string {
  return rng.pick(CAMPUS_IMAGES);
}
