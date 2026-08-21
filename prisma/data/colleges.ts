/**
 * Seed dataset: 120 real Indian higher-education institutions.
 *
 * IMPORTANT — on data accuracy:
 * The institution names, cities, states, ownership type and founding years
 * here are real. The FINANCIAL and PLACEMENT figures generated from this
 * dataset (fees, salary packages, placement rates, reviews) are
 * REPRESENTATIVE SAMPLE DATA, not scraped or verified figures. They are
 * derived deterministically from the `tier` and `streams` fields below so
 * that they are internally consistent and plausible — an IIT costs more and
 * places better than a tier-3 private college — without pretending to be
 * authoritative. This is stated in the UI footer and the README too.
 *
 * Why `tier` exists: it is a seed-only concept, deliberately NOT a database
 * column. Its only job is to drive believable number generation. Persisting
 * a subjective "tier" ranking would be a product claim we cannot defend, and
 * the schema already has NIRF rank for objective ordering.
 */

export type CollegeTypeName = "GOVERNMENT" | "PRIVATE" | "DEEMED" | "AUTONOMOUS";

export type StreamName =
  | "ENGINEERING"
  | "MANAGEMENT"
  | "MEDICAL"
  | "LAW"
  | "SCIENCE"
  | "COMMERCE"
  | "ARTS"
  | "DESIGN";

export type CollegeSeed = {
  name: string;
  shortName: string;
  city: string;
  state: string;
  type: CollegeTypeName;
  established: number;
  /** Official NIRF rank. null means genuinely unranked — never 0. */
  nirfRank: number | null;
  /** Seed-only. Drives fee and placement generation. Not persisted. */
  tier: 1 | 2 | 3;
  streams: StreamName[];
};

export const COLLEGE_SEED: CollegeSeed[] = [
  // --- IITs ---------------------------------------------------------------
  { name: "Indian Institute of Technology Madras", shortName: "IIT Madras", city: "Chennai", state: "Tamil Nadu", type: "GOVERNMENT", established: 1959, nirfRank: 1, tier: 1, streams: ["ENGINEERING", "SCIENCE", "MANAGEMENT"] },
  { name: "Indian Institute of Technology Delhi", shortName: "IIT Delhi", city: "New Delhi", state: "Delhi", type: "GOVERNMENT", established: 1961, nirfRank: 2, tier: 1, streams: ["ENGINEERING", "SCIENCE", "MANAGEMENT"] },
  { name: "Indian Institute of Technology Bombay", shortName: "IIT Bombay", city: "Mumbai", state: "Maharashtra", type: "GOVERNMENT", established: 1958, nirfRank: 3, tier: 1, streams: ["ENGINEERING", "SCIENCE", "DESIGN"] },
  { name: "Indian Institute of Technology Kanpur", shortName: "IIT Kanpur", city: "Kanpur", state: "Uttar Pradesh", type: "GOVERNMENT", established: 1959, nirfRank: 4, tier: 1, streams: ["ENGINEERING", "SCIENCE", "MANAGEMENT"] },
  { name: "Indian Institute of Technology Kharagpur", shortName: "IIT Kharagpur", city: "Kharagpur", state: "West Bengal", type: "GOVERNMENT", established: 1951, nirfRank: 5, tier: 1, streams: ["ENGINEERING", "SCIENCE", "LAW", "MANAGEMENT"] },
  { name: "Indian Institute of Technology Roorkee", shortName: "IIT Roorkee", city: "Roorkee", state: "Uttarakhand", type: "GOVERNMENT", established: 1847, nirfRank: 6, tier: 1, streams: ["ENGINEERING", "SCIENCE", "MANAGEMENT"] },
  { name: "Indian Institute of Technology Guwahati", shortName: "IIT Guwahati", city: "Guwahati", state: "Assam", type: "GOVERNMENT", established: 1994, nirfRank: 7, tier: 1, streams: ["ENGINEERING", "SCIENCE", "DESIGN"] },
  { name: "Indian Institute of Technology Hyderabad", shortName: "IIT Hyderabad", city: "Hyderabad", state: "Telangana", type: "GOVERNMENT", established: 2008, nirfRank: 8, tier: 1, streams: ["ENGINEERING", "SCIENCE", "DESIGN"] },
  { name: "Indian Institute of Technology (BHU) Varanasi", shortName: "IIT BHU", city: "Varanasi", state: "Uttar Pradesh", type: "GOVERNMENT", established: 1919, nirfRank: 15, tier: 1, streams: ["ENGINEERING", "SCIENCE"] },
  { name: "Indian Institute of Technology Indore", shortName: "IIT Indore", city: "Indore", state: "Madhya Pradesh", type: "GOVERNMENT", established: 2009, nirfRank: 16, tier: 1, streams: ["ENGINEERING", "SCIENCE"] },
  { name: "Indian Institute of Technology Gandhinagar", shortName: "IIT Gandhinagar", city: "Gandhinagar", state: "Gujarat", type: "GOVERNMENT", established: 2008, nirfRank: 20, tier: 1, streams: ["ENGINEERING", "SCIENCE", "ARTS"] },
  { name: "Indian Institute of Technology Ropar", shortName: "IIT Ropar", city: "Rupnagar", state: "Punjab", type: "GOVERNMENT", established: 2008, nirfRank: 22, tier: 1, streams: ["ENGINEERING", "SCIENCE"] },
  { name: "Indian Institute of Technology Jodhpur", shortName: "IIT Jodhpur", city: "Jodhpur", state: "Rajasthan", type: "GOVERNMENT", established: 2008, nirfRank: 29, tier: 1, streams: ["ENGINEERING", "SCIENCE", "DESIGN"] },
  { name: "Indian Institute of Technology Patna", shortName: "IIT Patna", city: "Patna", state: "Bihar", type: "GOVERNMENT", established: 2008, nirfRank: 25, tier: 1, streams: ["ENGINEERING", "SCIENCE"] },
  { name: "Indian Institute of Technology Mandi", shortName: "IIT Mandi", city: "Mandi", state: "Himachal Pradesh", type: "GOVERNMENT", established: 2009, nirfRank: 31, tier: 1, streams: ["ENGINEERING", "SCIENCE"] },

  // --- NITs ---------------------------------------------------------------
  { name: "National Institute of Technology Tiruchirappalli", shortName: "NIT Trichy", city: "Tiruchirappalli", state: "Tamil Nadu", type: "GOVERNMENT", established: 1964, nirfRank: 9, tier: 1, streams: ["ENGINEERING", "MANAGEMENT"] },
  { name: "National Institute of Technology Karnataka Surathkal", shortName: "NIT Surathkal", city: "Mangaluru", state: "Karnataka", type: "GOVERNMENT", established: 1960, nirfRank: 12, tier: 1, streams: ["ENGINEERING", "MANAGEMENT"] },
  { name: "National Institute of Technology Rourkela", shortName: "NIT Rourkela", city: "Rourkela", state: "Odisha", type: "GOVERNMENT", established: 1961, nirfRank: 19, tier: 1, streams: ["ENGINEERING", "SCIENCE"] },
  { name: "National Institute of Technology Warangal", shortName: "NIT Warangal", city: "Warangal", state: "Telangana", type: "GOVERNMENT", established: 1959, nirfRank: 21, tier: 1, streams: ["ENGINEERING", "MANAGEMENT"] },
  { name: "National Institute of Technology Calicut", shortName: "NIT Calicut", city: "Kozhikode", state: "Kerala", type: "GOVERNMENT", established: 1961, nirfRank: 25, tier: 2, streams: ["ENGINEERING", "DESIGN"] },
  { name: "Malaviya National Institute of Technology Jaipur", shortName: "MNIT Jaipur", city: "Jaipur", state: "Rajasthan", type: "GOVERNMENT", established: 1963, nirfRank: 43, tier: 2, streams: ["ENGINEERING"] },
  { name: "Motilal Nehru National Institute of Technology Allahabad", shortName: "MNNIT Allahabad", city: "Prayagraj", state: "Uttar Pradesh", type: "GOVERNMENT", established: 1961, nirfRank: 49, tier: 2, streams: ["ENGINEERING", "MANAGEMENT"] },
  { name: "National Institute of Technology Kurukshetra", shortName: "NIT Kurukshetra", city: "Kurukshetra", state: "Haryana", type: "GOVERNMENT", established: 1963, nirfRank: 53, tier: 2, streams: ["ENGINEERING"] },
  { name: "Visvesvaraya National Institute of Technology Nagpur", shortName: "VNIT Nagpur", city: "Nagpur", state: "Maharashtra", type: "GOVERNMENT", established: 1960, nirfRank: 47, tier: 2, streams: ["ENGINEERING"] },
  { name: "Sardar Vallabhbhai National Institute of Technology Surat", shortName: "SVNIT Surat", city: "Surat", state: "Gujarat", type: "GOVERNMENT", established: 1961, nirfRank: 61, tier: 2, streams: ["ENGINEERING"] },
  { name: "National Institute of Technology Durgapur", shortName: "NIT Durgapur", city: "Durgapur", state: "West Bengal", type: "GOVERNMENT", established: 1960, nirfRank: 62, tier: 2, streams: ["ENGINEERING", "MANAGEMENT"] },
  { name: "National Institute of Technology Silchar", shortName: "NIT Silchar", city: "Silchar", state: "Assam", type: "GOVERNMENT", established: 1967, nirfRank: 76, tier: 2, streams: ["ENGINEERING"] },

  // --- IIITs --------------------------------------------------------------
  { name: "International Institute of Information Technology Hyderabad", shortName: "IIIT Hyderabad", city: "Hyderabad", state: "Telangana", type: "DEEMED", established: 1998, nirfRank: 55, tier: 1, streams: ["ENGINEERING", "SCIENCE"] },
  { name: "Indian Institute of Information Technology Allahabad", shortName: "IIIT Allahabad", city: "Prayagraj", state: "Uttar Pradesh", type: "GOVERNMENT", established: 1999, nirfRank: 89, tier: 2, streams: ["ENGINEERING"] },
  { name: "International Institute of Information Technology Bangalore", shortName: "IIIT Bangalore", city: "Bengaluru", state: "Karnataka", type: "DEEMED", established: 1999, nirfRank: null, tier: 1, streams: ["ENGINEERING", "SCIENCE"] },
  { name: "Indian Institute of Information Technology Design and Manufacturing Jabalpur", shortName: "IIITDM Jabalpur", city: "Jabalpur", state: "Madhya Pradesh", type: "GOVERNMENT", established: 2005, nirfRank: 96, tier: 2, streams: ["ENGINEERING", "DESIGN"] },

  // --- Government / autonomous engineering --------------------------------
  { name: "Delhi Technological University", shortName: "DTU", city: "New Delhi", state: "Delhi", type: "GOVERNMENT", established: 1941, nirfRank: 29, tier: 1, streams: ["ENGINEERING", "MANAGEMENT"] },
  { name: "Netaji Subhas University of Technology", shortName: "NSUT", city: "New Delhi", state: "Delhi", type: "GOVERNMENT", established: 1983, nirfRank: 60, tier: 2, streams: ["ENGINEERING"] },
  { name: "Jadavpur University", shortName: "Jadavpur University", city: "Kolkata", state: "West Bengal", type: "GOVERNMENT", established: 1955, nirfRank: 12, tier: 1, streams: ["ENGINEERING", "SCIENCE", "ARTS"] },
  { name: "Anna University", shortName: "Anna University", city: "Chennai", state: "Tamil Nadu", type: "GOVERNMENT", established: 1978, nirfRank: 14, tier: 1, streams: ["ENGINEERING", "SCIENCE"] },
  { name: "COEP Technological University", shortName: "COEP", city: "Pune", state: "Maharashtra", type: "GOVERNMENT", established: 1854, nirfRank: 71, tier: 2, streams: ["ENGINEERING"] },
  { name: "Institute of Chemical Technology Mumbai", shortName: "ICT Mumbai", city: "Mumbai", state: "Maharashtra", type: "DEEMED", established: 1933, nirfRank: 32, tier: 1, streams: ["ENGINEERING", "SCIENCE"] },
  { name: "Veermata Jijabai Technological Institute", shortName: "VJTI Mumbai", city: "Mumbai", state: "Maharashtra", type: "AUTONOMOUS", established: 1887, nirfRank: null, tier: 2, streams: ["ENGINEERING"] },
  { name: "Sri Sivasubramaniya Nadar College of Engineering", shortName: "SSN College", city: "Chennai", state: "Tamil Nadu", type: "AUTONOMOUS", established: 1996, nirfRank: 68, tier: 2, streams: ["ENGINEERING"] },
  { name: "PSG College of Technology", shortName: "PSG Tech", city: "Coimbatore", state: "Tamil Nadu", type: "AUTONOMOUS", established: 1951, nirfRank: 63, tier: 2, streams: ["ENGINEERING", "MANAGEMENT"] },
  { name: "R V College of Engineering", shortName: "RVCE", city: "Bengaluru", state: "Karnataka", type: "AUTONOMOUS", established: 1963, nirfRank: 99, tier: 2, streams: ["ENGINEERING"] },
  { name: "B M S College of Engineering", shortName: "BMSCE", city: "Bengaluru", state: "Karnataka", type: "AUTONOMOUS", established: 1946, nirfRank: 104, tier: 2, streams: ["ENGINEERING"] },
  { name: "M S Ramaiah Institute of Technology", shortName: "MSRIT", city: "Bengaluru", state: "Karnataka", type: "AUTONOMOUS", established: 1962, nirfRank: 76, tier: 2, streams: ["ENGINEERING"] },
  { name: "Vasavi College of Engineering", shortName: "Vasavi College", city: "Hyderabad", state: "Telangana", type: "AUTONOMOUS", established: 1981, nirfRank: null, tier: 2, streams: ["ENGINEERING"] },
  { name: "Chaitanya Bharathi Institute of Technology", shortName: "CBIT Hyderabad", city: "Hyderabad", state: "Telangana", type: "AUTONOMOUS", established: 1979, nirfRank: null, tier: 2, streams: ["ENGINEERING"] },
  { name: "College of Engineering Guindy", shortName: "CEG Guindy", city: "Chennai", state: "Tamil Nadu", type: "AUTONOMOUS", established: 1794, nirfRank: null, tier: 2, streams: ["ENGINEERING"] },
  { name: "Jamia Millia Islamia", shortName: "Jamia Millia", city: "New Delhi", state: "Delhi", type: "GOVERNMENT", established: 1920, nirfRank: 33, tier: 2, streams: ["ENGINEERING", "ARTS", "LAW", "SCIENCE"] },
  { name: "Aligarh Muslim University", shortName: "AMU", city: "Aligarh", state: "Uttar Pradesh", type: "GOVERNMENT", established: 1875, nirfRank: 45, tier: 2, streams: ["ENGINEERING", "ARTS", "MEDICAL", "LAW"] },
  { name: "Indian Institute of Engineering Science and Technology Shibpur", shortName: "IIEST Shibpur", city: "Howrah", state: "West Bengal", type: "GOVERNMENT", established: 1856, nirfRank: 87, tier: 2, streams: ["ENGINEERING", "SCIENCE"] },
  { name: "Punjab Engineering College", shortName: "PEC Chandigarh", city: "Chandigarh", state: "Chandigarh", type: "DEEMED", established: 1921, nirfRank: 106, tier: 2, streams: ["ENGINEERING"] },

  // --- Private / deemed engineering ---------------------------------------
  { name: "Birla Institute of Technology and Science Pilani", shortName: "BITS Pilani", city: "Pilani", state: "Rajasthan", type: "DEEMED", established: 1964, nirfRank: 20, tier: 1, streams: ["ENGINEERING", "SCIENCE", "MANAGEMENT"] },
  { name: "Vellore Institute of Technology", shortName: "VIT Vellore", city: "Vellore", state: "Tamil Nadu", type: "DEEMED", established: 1984, nirfRank: 11, tier: 1, streams: ["ENGINEERING", "MANAGEMENT", "SCIENCE"] },
  { name: "SRM Institute of Science and Technology", shortName: "SRM Chennai", city: "Chennai", state: "Tamil Nadu", type: "DEEMED", established: 1985, nirfRank: 28, tier: 2, streams: ["ENGINEERING", "MANAGEMENT", "MEDICAL", "LAW"] },
  { name: "Thapar Institute of Engineering and Technology", shortName: "Thapar Institute", city: "Patiala", state: "Punjab", type: "DEEMED", established: 1956, nirfRank: 29, tier: 1, streams: ["ENGINEERING", "MANAGEMENT"] },
  { name: "Manipal Institute of Technology", shortName: "MIT Manipal", city: "Manipal", state: "Karnataka", type: "DEEMED", established: 1957, nirfRank: 45, tier: 2, streams: ["ENGINEERING", "DESIGN"] },
  { name: "Amrita Vishwa Vidyapeetham", shortName: "Amrita Coimbatore", city: "Coimbatore", state: "Tamil Nadu", type: "DEEMED", established: 1994, nirfRank: 23, tier: 1, streams: ["ENGINEERING", "MEDICAL", "MANAGEMENT"] },
  { name: "PES University", shortName: "PES University", city: "Bengaluru", state: "Karnataka", type: "PRIVATE", established: 1972, nirfRank: 101, tier: 2, streams: ["ENGINEERING", "MANAGEMENT", "LAW"] },
  { name: "Kalinga Institute of Industrial Technology", shortName: "KIIT Bhubaneswar", city: "Bhubaneswar", state: "Odisha", type: "DEEMED", established: 1992, nirfRank: 41, tier: 2, streams: ["ENGINEERING", "MANAGEMENT", "LAW", "MEDICAL"] },
  { name: "Shiv Nadar Institution of Eminence", shortName: "Shiv Nadar University", city: "Greater Noida", state: "Uttar Pradesh", type: "PRIVATE", established: 2011, nirfRank: 89, tier: 2, streams: ["ENGINEERING", "SCIENCE", "ARTS", "MANAGEMENT"] },
  { name: "Amity University Noida", shortName: "Amity Noida", city: "Noida", state: "Uttar Pradesh", type: "PRIVATE", established: 2005, nirfRank: 32, tier: 2, streams: ["ENGINEERING", "MANAGEMENT", "LAW", "DESIGN", "COMMERCE"] },
  { name: "Lovely Professional University", shortName: "LPU", city: "Phagwara", state: "Punjab", type: "PRIVATE", established: 2005, nirfRank: 50, tier: 3, streams: ["ENGINEERING", "MANAGEMENT", "DESIGN", "COMMERCE", "ARTS"] },
  { name: "Chandigarh University", shortName: "Chandigarh University", city: "Mohali", state: "Punjab", type: "PRIVATE", established: 2012, nirfRank: 32, tier: 3, streams: ["ENGINEERING", "MANAGEMENT", "LAW", "DESIGN"] },
  { name: "Symbiosis Institute of Technology", shortName: "SIT Pune", city: "Pune", state: "Maharashtra", type: "DEEMED", established: 2008, nirfRank: null, tier: 3, streams: ["ENGINEERING"] },
  { name: "MIT World Peace University", shortName: "MIT WPU", city: "Pune", state: "Maharashtra", type: "PRIVATE", established: 1983, nirfRank: null, tier: 3, streams: ["ENGINEERING", "MANAGEMENT", "DESIGN"] },
  { name: "Vignan's Foundation for Science Technology and Research", shortName: "Vignan University", city: "Guntur", state: "Andhra Pradesh", type: "DEEMED", established: 1997, nirfRank: null, tier: 3, streams: ["ENGINEERING", "MANAGEMENT"] },
  { name: "SASTRA Deemed University", shortName: "SASTRA", city: "Thanjavur", state: "Tamil Nadu", type: "DEEMED", established: 1984, nirfRank: 58, tier: 2, streams: ["ENGINEERING", "MANAGEMENT", "LAW"] },
  { name: "Birla Institute of Technology Mesra", shortName: "BIT Mesra", city: "Ranchi", state: "Jharkhand", type: "DEEMED", established: 1955, nirfRank: 77, tier: 2, streams: ["ENGINEERING", "MANAGEMENT"] },
  { name: "Siksha O Anusandhan University", shortName: "SOA Bhubaneswar", city: "Bhubaneswar", state: "Odisha", type: "DEEMED", established: 1996, nirfRank: 79, tier: 3, streams: ["ENGINEERING", "MEDICAL", "MANAGEMENT"] },
  { name: "Graphic Era Deemed University", shortName: "Graphic Era", city: "Dehradun", state: "Uttarakhand", type: "DEEMED", established: 1993, nirfRank: null, tier: 3, streams: ["ENGINEERING", "MANAGEMENT"] },
  { name: "Jaypee Institute of Information Technology", shortName: "JIIT Noida", city: "Noida", state: "Uttar Pradesh", type: "DEEMED", established: 2001, nirfRank: null, tier: 3, streams: ["ENGINEERING"] },
  { name: "Nirma University", shortName: "Nirma University", city: "Ahmedabad", state: "Gujarat", type: "PRIVATE", established: 2003, nirfRank: 105, tier: 2, streams: ["ENGINEERING", "MANAGEMENT", "LAW", "COMMERCE"] },

  // --- Management ---------------------------------------------------------
  { name: "Indian Institute of Management Ahmedabad", shortName: "IIM Ahmedabad", city: "Ahmedabad", state: "Gujarat", type: "GOVERNMENT", established: 1961, nirfRank: 1, tier: 1, streams: ["MANAGEMENT"] },
  { name: "Indian Institute of Management Bangalore", shortName: "IIM Bangalore", city: "Bengaluru", state: "Karnataka", type: "GOVERNMENT", established: 1973, nirfRank: 2, tier: 1, streams: ["MANAGEMENT"] },
  { name: "Indian Institute of Management Kozhikode", shortName: "IIM Kozhikode", city: "Kozhikode", state: "Kerala", type: "GOVERNMENT", established: 1996, nirfRank: 3, tier: 1, streams: ["MANAGEMENT"] },
  { name: "Indian Institute of Management Calcutta", shortName: "IIM Calcutta", city: "Kolkata", state: "West Bengal", type: "GOVERNMENT", established: 1961, nirfRank: 4, tier: 1, streams: ["MANAGEMENT"] },
  { name: "Indian Institute of Management Lucknow", shortName: "IIM Lucknow", city: "Lucknow", state: "Uttar Pradesh", type: "GOVERNMENT", established: 1984, nirfRank: 6, tier: 1, streams: ["MANAGEMENT"] },
  { name: "Indian Institute of Management Indore", shortName: "IIM Indore", city: "Indore", state: "Madhya Pradesh", type: "GOVERNMENT", established: 1996, nirfRank: 8, tier: 1, streams: ["MANAGEMENT"] },
  { name: "Indian Institute of Management Rohtak", shortName: "IIM Rohtak", city: "Rohtak", state: "Haryana", type: "GOVERNMENT", established: 2009, nirfRank: 12, tier: 2, streams: ["MANAGEMENT"] },
  { name: "Indian Institute of Management Udaipur", shortName: "IIM Udaipur", city: "Udaipur", state: "Rajasthan", type: "GOVERNMENT", established: 2011, nirfRank: 22, tier: 2, streams: ["MANAGEMENT"] },
  { name: "Xavier Labour Relations Institute", shortName: "XLRI Jamshedpur", city: "Jamshedpur", state: "Jharkhand", type: "PRIVATE", established: 1949, nirfRank: 9, tier: 1, streams: ["MANAGEMENT"] },
  { name: "Faculty of Management Studies University of Delhi", shortName: "FMS Delhi", city: "New Delhi", state: "Delhi", type: "GOVERNMENT", established: 1954, nirfRank: 22, tier: 1, streams: ["MANAGEMENT"] },
  { name: "Management Development Institute Gurgaon", shortName: "MDI Gurgaon", city: "Gurugram", state: "Haryana", type: "PRIVATE", established: 1973, nirfRank: 13, tier: 1, streams: ["MANAGEMENT"] },
  { name: "S P Jain Institute of Management and Research", shortName: "SPJIMR Mumbai", city: "Mumbai", state: "Maharashtra", type: "PRIVATE", established: 1981, nirfRank: 25, tier: 1, streams: ["MANAGEMENT"] },
  { name: "Indian Institute of Foreign Trade", shortName: "IIFT Delhi", city: "New Delhi", state: "Delhi", type: "GOVERNMENT", established: 1963, nirfRank: 17, tier: 1, streams: ["MANAGEMENT", "COMMERCE"] },
  { name: "Narsee Monjee Institute of Management Studies", shortName: "NMIMS Mumbai", city: "Mumbai", state: "Maharashtra", type: "DEEMED", established: 1981, nirfRank: 20, tier: 2, streams: ["MANAGEMENT", "ENGINEERING", "COMMERCE", "LAW"] },
  { name: "Symbiosis Institute of Business Management", shortName: "SIBM Pune", city: "Pune", state: "Maharashtra", type: "DEEMED", established: 1978, nirfRank: 26, tier: 2, streams: ["MANAGEMENT"] },
  { name: "Institute of Management Technology Ghaziabad", shortName: "IMT Ghaziabad", city: "Ghaziabad", state: "Uttar Pradesh", type: "PRIVATE", established: 1980, nirfRank: 41, tier: 2, streams: ["MANAGEMENT"] },
  { name: "T A Pai Management Institute", shortName: "TAPMI Manipal", city: "Manipal", state: "Karnataka", type: "PRIVATE", established: 1980, nirfRank: 47, tier: 2, streams: ["MANAGEMENT"] },
  { name: "Great Lakes Institute of Management", shortName: "Great Lakes Chennai", city: "Chennai", state: "Tamil Nadu", type: "PRIVATE", established: 2004, nirfRank: null, tier: 2, streams: ["MANAGEMENT"] },
  { name: "Xavier Institute of Management Bhubaneswar", shortName: "XIMB", city: "Bhubaneswar", state: "Odisha", type: "PRIVATE", established: 1987, nirfRank: 33, tier: 2, streams: ["MANAGEMENT"] },
  { name: "Christ University", shortName: "Christ University", city: "Bengaluru", state: "Karnataka", type: "DEEMED", established: 1969, nirfRank: 63, tier: 2, streams: ["MANAGEMENT", "COMMERCE", "ARTS", "LAW", "ENGINEERING"] },

  // --- Medical ------------------------------------------------------------
  { name: "All India Institute of Medical Sciences New Delhi", shortName: "AIIMS Delhi", city: "New Delhi", state: "Delhi", type: "GOVERNMENT", established: 1956, nirfRank: 1, tier: 1, streams: ["MEDICAL"] },
  { name: "Postgraduate Institute of Medical Education and Research", shortName: "PGIMER Chandigarh", city: "Chandigarh", state: "Chandigarh", type: "GOVERNMENT", established: 1962, nirfRank: 2, tier: 1, streams: ["MEDICAL"] },
  { name: "Christian Medical College Vellore", shortName: "CMC Vellore", city: "Vellore", state: "Tamil Nadu", type: "PRIVATE", established: 1900, nirfRank: 3, tier: 1, streams: ["MEDICAL"] },
  { name: "National Institute of Mental Health and Neurosciences", shortName: "NIMHANS", city: "Bengaluru", state: "Karnataka", type: "GOVERNMENT", established: 1974, nirfRank: 4, tier: 1, streams: ["MEDICAL"] },
  { name: "Jawaharlal Institute of Postgraduate Medical Education and Research", shortName: "JIPMER", city: "Puducherry", state: "Puducherry", type: "GOVERNMENT", established: 1823, nirfRank: 5, tier: 1, streams: ["MEDICAL"] },
  { name: "Sanjay Gandhi Postgraduate Institute of Medical Sciences", shortName: "SGPGIMS Lucknow", city: "Lucknow", state: "Uttar Pradesh", type: "GOVERNMENT", established: 1983, nirfRank: 6, tier: 1, streams: ["MEDICAL"] },
  { name: "Institute of Medical Sciences Banaras Hindu University", shortName: "IMS BHU", city: "Varanasi", state: "Uttar Pradesh", type: "GOVERNMENT", established: 1916, nirfRank: 7, tier: 1, streams: ["MEDICAL"] },
  { name: "King George's Medical University", shortName: "KGMU Lucknow", city: "Lucknow", state: "Uttar Pradesh", type: "GOVERNMENT", established: 1905, nirfRank: 9, tier: 1, streams: ["MEDICAL"] },
  { name: "Kasturba Medical College Manipal", shortName: "KMC Manipal", city: "Manipal", state: "Karnataka", type: "DEEMED", established: 1953, nirfRank: 10, tier: 1, streams: ["MEDICAL"] },
  { name: "All India Institute of Medical Sciences Jodhpur", shortName: "AIIMS Jodhpur", city: "Jodhpur", state: "Rajasthan", type: "GOVERNMENT", established: 2012, nirfRank: 12, tier: 1, streams: ["MEDICAL"] },
  { name: "Maulana Azad Medical College", shortName: "MAMC Delhi", city: "New Delhi", state: "Delhi", type: "GOVERNMENT", established: 1958, nirfRank: 15, tier: 1, streams: ["MEDICAL"] },
  { name: "Madras Medical College", shortName: "Madras Medical College", city: "Chennai", state: "Tamil Nadu", type: "GOVERNMENT", established: 1835, nirfRank: 18, tier: 2, streams: ["MEDICAL"] },
  { name: "St John's Medical College", shortName: "St John's Bengaluru", city: "Bengaluru", state: "Karnataka", type: "PRIVATE", established: 1963, nirfRank: 22, tier: 2, streams: ["MEDICAL"] },
  { name: "Grant Medical College", shortName: "Grant Medical College", city: "Mumbai", state: "Maharashtra", type: "GOVERNMENT", established: 1845, nirfRank: 26, tier: 2, streams: ["MEDICAL"] },
  { name: "Manipal College of Dental Sciences", shortName: "MCODS Manipal", city: "Manipal", state: "Karnataka", type: "DEEMED", established: 1965, nirfRank: 30, tier: 2, streams: ["MEDICAL"] },
  { name: "Sri Ramachandra Institute of Higher Education and Research", shortName: "SRIHER Chennai", city: "Chennai", state: "Tamil Nadu", type: "DEEMED", established: 1985, nirfRank: 24, tier: 2, streams: ["MEDICAL"] },
  { name: "Dr D Y Patil Vidyapeeth Pune", shortName: "DY Patil Pune", city: "Pune", state: "Maharashtra", type: "DEEMED", established: 1996, nirfRank: 40, tier: 3, streams: ["MEDICAL", "ENGINEERING", "MANAGEMENT"] },

  // --- Law ----------------------------------------------------------------
  { name: "National Law School of India University", shortName: "NLSIU Bengaluru", city: "Bengaluru", state: "Karnataka", type: "GOVERNMENT", established: 1987, nirfRank: 1, tier: 1, streams: ["LAW"] },
  { name: "National Law University Delhi", shortName: "NLU Delhi", city: "New Delhi", state: "Delhi", type: "GOVERNMENT", established: 2008, nirfRank: 2, tier: 1, streams: ["LAW"] },
  { name: "NALSAR University of Law", shortName: "NALSAR Hyderabad", city: "Hyderabad", state: "Telangana", type: "GOVERNMENT", established: 1998, nirfRank: 3, tier: 1, streams: ["LAW"] },
  { name: "Jindal Global Law School", shortName: "JGLS Sonipat", city: "Sonipat", state: "Haryana", type: "PRIVATE", established: 2009, nirfRank: 4, tier: 1, streams: ["LAW"] },
  { name: "West Bengal National University of Juridical Sciences", shortName: "WBNUJS Kolkata", city: "Kolkata", state: "West Bengal", type: "GOVERNMENT", established: 1999, nirfRank: 5, tier: 1, streams: ["LAW"] },
  { name: "Symbiosis Law School Pune", shortName: "SLS Pune", city: "Pune", state: "Maharashtra", type: "DEEMED", established: 1977, nirfRank: 6, tier: 2, streams: ["LAW"] },
  { name: "National Law University Jodhpur", shortName: "NLU Jodhpur", city: "Jodhpur", state: "Rajasthan", type: "GOVERNMENT", established: 1999, nirfRank: 8, tier: 2, streams: ["LAW", "MANAGEMENT"] },
  { name: "Gujarat National Law University", shortName: "GNLU Gandhinagar", city: "Gandhinagar", state: "Gujarat", type: "GOVERNMENT", established: 2003, nirfRank: 9, tier: 2, streams: ["LAW"] },
  { name: "ILS Law College", shortName: "ILS Law College", city: "Pune", state: "Maharashtra", type: "AUTONOMOUS", established: 1924, nirfRank: null, tier: 2, streams: ["LAW"] },
  { name: "Rajiv Gandhi National University of Law", shortName: "RGNUL Patiala", city: "Patiala", state: "Punjab", type: "GOVERNMENT", established: 2006, nirfRank: 20, tier: 2, streams: ["LAW"] },

  // --- Science / Arts / Commerce ------------------------------------------
  { name: "Indian Institute of Science Bengaluru", shortName: "IISc Bengaluru", city: "Bengaluru", state: "Karnataka", type: "DEEMED", established: 1909, nirfRank: 1, tier: 1, streams: ["SCIENCE", "ENGINEERING"] },
  { name: "Indian Institute of Science Education and Research Pune", shortName: "IISER Pune", city: "Pune", state: "Maharashtra", type: "GOVERNMENT", established: 2006, nirfRank: 25, tier: 1, streams: ["SCIENCE"] },
  { name: "Indian Institute of Science Education and Research Kolkata", shortName: "IISER Kolkata", city: "Kolkata", state: "West Bengal", type: "GOVERNMENT", established: 2006, nirfRank: 33, tier: 1, streams: ["SCIENCE"] },
  { name: "Jawaharlal Nehru University", shortName: "JNU", city: "New Delhi", state: "Delhi", type: "GOVERNMENT", established: 1969, nirfRank: 2, tier: 1, streams: ["ARTS", "SCIENCE"] },
  { name: "University of Delhi", shortName: "Delhi University", city: "New Delhi", state: "Delhi", type: "GOVERNMENT", established: 1922, nirfRank: 6, tier: 1, streams: ["ARTS", "COMMERCE", "SCIENCE", "LAW"] },
  { name: "Banaras Hindu University", shortName: "BHU", city: "Varanasi", state: "Uttar Pradesh", type: "GOVERNMENT", established: 1916, nirfRank: 5, tier: 1, streams: ["ARTS", "SCIENCE", "COMMERCE"] },
  { name: "Miranda House", shortName: "Miranda House", city: "New Delhi", state: "Delhi", type: "AUTONOMOUS", established: 1948, nirfRank: 1, tier: 1, streams: ["ARTS", "SCIENCE"] },
  { name: "Hindu College", shortName: "Hindu College", city: "New Delhi", state: "Delhi", type: "AUTONOMOUS", established: 1899, nirfRank: 2, tier: 1, streams: ["ARTS", "SCIENCE", "COMMERCE"] },
  { name: "St Stephen's College", shortName: "St Stephen's College", city: "New Delhi", state: "Delhi", type: "AUTONOMOUS", established: 1881, nirfRank: 4, tier: 1, streams: ["ARTS", "SCIENCE"] },
  { name: "Shri Ram College of Commerce", shortName: "SRCC", city: "New Delhi", state: "Delhi", type: "AUTONOMOUS", established: 1926, nirfRank: 5, tier: 1, streams: ["COMMERCE"] },
  { name: "Lady Shri Ram College for Women", shortName: "LSR", city: "New Delhi", state: "Delhi", type: "AUTONOMOUS", established: 1956, nirfRank: 6, tier: 1, streams: ["ARTS", "COMMERCE"] },
  { name: "Loyola College", shortName: "Loyola College", city: "Chennai", state: "Tamil Nadu", type: "AUTONOMOUS", established: 1925, nirfRank: 9, tier: 2, streams: ["ARTS", "SCIENCE", "COMMERCE"] },
  { name: "St Xavier's College Mumbai", shortName: "St Xavier's Mumbai", city: "Mumbai", state: "Maharashtra", type: "AUTONOMOUS", established: 1869, nirfRank: 12, tier: 2, streams: ["ARTS", "SCIENCE", "COMMERCE"] },
  { name: "Presidency College Chennai", shortName: "Presidency Chennai", city: "Chennai", state: "Tamil Nadu", type: "GOVERNMENT", established: 1840, nirfRank: 22, tier: 2, streams: ["ARTS", "SCIENCE"] },
  { name: "Fergusson College", shortName: "Fergusson College", city: "Pune", state: "Maharashtra", type: "AUTONOMOUS", established: 1885, nirfRank: 41, tier: 2, streams: ["ARTS", "SCIENCE", "COMMERCE"] },
  { name: "Madras Christian College", shortName: "MCC Chennai", city: "Chennai", state: "Tamil Nadu", type: "AUTONOMOUS", established: 1837, nirfRank: 30, tier: 2, streams: ["ARTS", "SCIENCE", "COMMERCE"] },
  { name: "Mount Carmel College", shortName: "Mount Carmel Bengaluru", city: "Bengaluru", state: "Karnataka", type: "AUTONOMOUS", established: 1948, nirfRank: 47, tier: 2, streams: ["ARTS", "COMMERCE", "SCIENCE"] },
  { name: "Hansraj College", shortName: "Hansraj College", city: "New Delhi", state: "Delhi", type: "AUTONOMOUS", established: 1948, nirfRank: 11, tier: 2, streams: ["ARTS", "SCIENCE", "COMMERCE"] },

  // --- Design -------------------------------------------------------------
  { name: "National Institute of Design Ahmedabad", shortName: "NID Ahmedabad", city: "Ahmedabad", state: "Gujarat", type: "GOVERNMENT", established: 1961, nirfRank: 1, tier: 1, streams: ["DESIGN"] },
  { name: "National Institute of Fashion Technology Delhi", shortName: "NIFT Delhi", city: "New Delhi", state: "Delhi", type: "GOVERNMENT", established: 1986, nirfRank: 2, tier: 1, streams: ["DESIGN"] },
  { name: "Srishti Manipal Institute of Art Design and Technology", shortName: "Srishti Manipal", city: "Bengaluru", state: "Karnataka", type: "PRIVATE", established: 1996, nirfRank: null, tier: 2, streams: ["DESIGN"] },
  { name: "Pearl Academy", shortName: "Pearl Academy", city: "New Delhi", state: "Delhi", type: "PRIVATE", established: 1993, nirfRank: null, tier: 2, streams: ["DESIGN"] },
  { name: "MIT Institute of Design", shortName: "MIT ID Pune", city: "Pune", state: "Maharashtra", type: "PRIVATE", established: 2006, nirfRank: null, tier: 3, streams: ["DESIGN"] },
  { name: "Symbiosis Institute of Design", shortName: "SID Pune", city: "Pune", state: "Maharashtra", type: "DEEMED", established: 2002, nirfRank: null, tier: 2, streams: ["DESIGN"] },
  { name: "Unitedworld Institute of Design", shortName: "UID Gandhinagar", city: "Gandhinagar", state: "Gujarat", type: "PRIVATE", established: 2011, nirfRank: null, tier: 3, streams: ["DESIGN"] },
];
