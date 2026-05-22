export interface Resource {
  category: string;
  name: string;
  description: string;
  date: string;
  url: string;
}

export const resources: Resource[] = [
  // Standards & Associations (12)
  { category: "Standards & Associations", name: "FEM - European Materials Handling Federation", description: "The European federation of materials handling, storage, and logistics equipment manufacturers. Publishes FEM 10.2.02 racking design guidelines.", date: "2025-06-17", url: "https://www.fem-eur.com" },
  { category: "Standards & Associations", name: "MHI - Material Handling Industry", description: "US-based trade association for the material handling, logistics, and supply chain industry. Organizes ProMat and MODEX trade shows.", date: "2025-06-17", url: "https://www.mhi.org" },
  { category: "Standards & Associations", name: "RMI - Rack Manufacturers Institute", description: "US rack manufacturing standards body. Publishes ANSI/RMI MH16.1 specification for the design, testing, and utilization of industrial steel storage racks.", date: "2025-06-17", url: "https://www.mhi.org/rmi" },
  { category: "Standards & Associations", name: "SEMA - Storage Equipment Manufacturers Association", description: "UK trade association for storage equipment. Provides SEMA design code and user guidance for pallet racking installations.", date: "2025-06-17", url: "https://www.sema.org.uk" },
  { category: "Standards & Associations", name: "EN 15512 - Steel Static Storage Systems", description: "European standard for the design of steel static pallet racking systems. Supersedes earlier FEM 10.2.02 calculations.", date: "2025-06-17", url: "https://standards.iteh.ai/catalog/standards/cen/b67a1bd7-bfa7-477a-9e58-8a2c60ee0e2d/en-15512-2009" },
  { category: "Standards & Associations", name: "EN 15635 - Use and Maintenance of Storage Equipment", description: "European standard covering the safe use, inspection, and maintenance of steel pallet racking systems. Includes damage assessment and inspection frequency requirements.", date: "2025-07-20", url: "https://standards.iteh.ai/catalog/standards/cen/b5ff32a0-ff34-4883-a062-c4ce94d7b4f1/en-15635-2009" },
  { category: "Standards & Associations", name: "NFPA 13 - Sprinkler Systems for Racked Storage", description: "US fire protection standard covering sprinkler design requirements for storage including palletized, solid-pile, and rack storage.", date: "2025-06-17", url: "https://www.nfpa.org/codes-and-standards/all-codes-and-standards/list-of-codes-and-standards/detail?code=13" },
  { category: "Standards & Associations", name: "VDI - Association for Mechanical and Plant Engineering", description: "German engineering association. VDI guidelines cover warehouse planning and racking systems design.", date: "2025-06-17", url: "https://www.vdi.de" },
  { category: "Standards & Associations", name: "ISO Technical Committee 110 (Industrial Trucks)", description: "International Organization for Standardization committee covering industrial truck safety standards relevant to racking operations.", date: "2025-06-17", url: "https://www.iso.org/committee/54058.html" },
  { category: "Standards & Associations", name: "AS 4084 - Steel Storage Racking (Australia)", description: "Australian standard for the design, fabrication, erection, and use of steel storage racking.", date: "2025-07-02", url: "https://www.standards.org.au/standards-catalogue/sa-snz/building/me-013/as-4084-2024" },
  { category: "Standards & Associations", name: "FEM 10.2.04 - Seismic Design of Pallet Racking", description: "Supplementary guideline for the design of adjustable pallet racking subject to seismic actions. Essential for projects in earthquake-prone regions.", date: "2025-07-20", url: "https://www.fem-eur.com/publications" },
  { category: "Standards & Associations", name: "OSHA - Warehouse Safety Standards", description: "US Occupational Safety and Health Administration guidelines for warehouse operations including racking safety, forklift operations, and ergonomic requirements.", date: "2025-06-17", url: "https://www.osha.gov/etools/warehousing" },
  // Global Manufacturers (12)
  { category: "Global Manufacturers", name: "SSI Schaefer Group", description: "One of the world's largest providers of modular warehousing and logistics solutions. Headquartered in Germany.", date: "2025-06-17", url: "https://www.ssi-schaefer.com" },
  { category: "Global Manufacturers", name: "Dematic", description: "Global supplier of automated logistics solutions, conveyors, and racking systems. Part of KION Group.", date: "2025-06-17", url: "https://www.dematic.com" },
  { category: "Global Manufacturers", name: "Jungheinrich", description: "German manufacturer of industrial trucks, racking systems, and warehouse technology. Integrated solutions provider.", date: "2025-06-17", url: "https://www.jungheinrich.com" },
  { category: "Global Manufacturers", name: "AR Racking", description: "Spanish manufacturer with full racking range including automated warehouses. Part of Grupo Arania. ISO 9001/14001/45001 certified.", date: "2025-07-15", url: "https://www.ar-racking.com" },
  { category: "Global Manufacturers", name: "Interroll", description: "Swiss provider of products for unit load handling, including pallet flow storage systems and roller conveyors.", date: "2025-06-17", url: "https://www.interroll.com" },
  { category: "Global Manufacturers", name: "Constructor Group", description: "Scandinavian-origin racking manufacturer with strong presence in Asia.", date: "2025-07-15", url: "https://www.constructor-asia.com" },
  { category: "Global Manufacturers", name: "Mecalux", description: "Spanish multinational manufacturer of storage systems. Offers pallet racking, drive-in, push-back, and automated solutions.", date: "2025-07-15", url: "https://www.mecalux.com" },
  { category: "Global Manufacturers", name: "Stow Group", description: "Belgian racking manufacturer with global reach. Offers selective, drive-in, push-back, and mobile racking systems.", date: "2025-07-15", url: "https://www.stowgroup.com" },
  { category: "Global Manufacturers", name: "Boracs Logistics Equipment", description: "China-based manufacturer of pallet racking systems, wire mesh decks, and steel platforms. FEM, CE, ISO 9001 certified.", date: "2025-07-20", url: "https://www.boracs.com" },
  { category: "Global Manufacturers", name: "KION Group", description: "One of the world's leading suppliers of industrial trucks and supply chain solutions. Parent company of Dematic, Linde, and STILL.", date: "2025-07-20", url: "https://www.kiongroup.com" },
  { category: "Global Manufacturers", name: "SSI Schaefer - Logimat", description: "SSI Schaefer's pallet racking product line including selective, drive-in, push-back, and flow-through systems.", date: "2025-07-20", url: "https://www.ssi-schaefer.com/en/products-systems/pallet-racking" },
  { category: "Global Manufacturers", name: "Dexion (Gonvarri Steel Services)", description: "Historic UK racking brand now part of Gonvarri. Known for the iconic Dexion Speedlock slotted angle system.", date: "2025-07-20", url: "https://www.dexion.com" },
  // Accessories & Equipment (7)
  { category: "Accessories & Equipment", name: "Uline - Pallets & Warehouse Supplies", description: "Leading distributor of shipping, packaging, and warehouse supplies including pallets, rack guards, and safety equipment.", date: "2025-06-17", url: "https://www.uline.com" },
  { category: "Accessories & Equipment", name: "Steel King Industries", description: "US manufacturer of industrial storage products including pallet racks, drive-in racks, and wire mesh decks.", date: "2025-06-17", url: "https://www.steelking.com" },
  { category: "Accessories & Equipment", name: "SteelPro Industries", description: "Wire mesh deck manufacturer. Provides standard and custom wire decking solutions for pallet racking systems.", date: "2025-07-02", url: "https://www.steelpro.co" },
  { category: "Accessories & Equipment", name: "Rack Components Ltd", description: "UK-based supplier of racking safety products including column guards, pallet stops, and rack end barriers.", date: "2025-07-02", url: "https://www.rackcomponents.co.uk" },
  { category: "Accessories & Equipment", name: "GMP Welding - Wire Mesh Decks", description: "US manufacturer of industrial wire mesh decks for pallet racking. Custom sizes and load ratings available.", date: "2025-07-20", url: "https://www.gmpwelding.com" },
  { category: "Accessories & Equipment", name: "Cherry's Industrial Equipment", description: "US supplier of warehouse safety products including rack guards, bollards, barricades, and pallet rack protection.", date: "2025-07-20", url: "https://www.cherrysindustrial.com" },
  { category: "Accessories & Equipment", name: "Crocus Pallets", description: "UK-based supplier of new and reconditioned pallets, wooden and plastic.", date: "2025-07-20", url: "https://www.crocuspallets.com" },
  // Industry Media & Tools (13)
  { category: "Industry Media & Tools", name: "Modern Materials Handling", description: "Leading publication covering material handling, logistics, and supply chain operations.", date: "2025-06-17", url: "https://www.mmh.com" },
  { category: "Industry Media & Tools", name: "Supply Chain Dive", description: "News and analysis for supply chain and logistics professionals. Covers warehouse automation, technology, and industry trends.", date: "2025-06-17", url: "https://www.supplychaindive.com" },
  { category: "Industry Media & Tools", name: "Logistics Management", description: "Publication for logistics and supply chain management professionals. Covers transportation, warehousing, and technology.", date: "2025-06-17", url: "https://www.logisticsmgmt.com" },
  { category: "Industry Media & Tools", name: "Warehouse & Logistics News", description: "UK-focused publication covering warehouse operations, racking systems, and logistics technology.", date: "2025-07-15", url: "https://www.warehousenews.co.uk" },
  { category: "Industry Media & Tools", name: "Warehouse Science", description: "Free online textbook by Prof. John J. Bartholdi III (Georgia Tech). Comprehensive coverage of warehouse design and order picking.", date: "2025-07-20", url: "https://warehouse-science.com" },
  { category: "Industry Media & Tools", name: "PalletIQ - Pallet Loading Calculator", description: "Free online tool for calculating optimal pallet loading patterns and container loading optimization.", date: "2025-07-20", url: "https://palletiq.in" },
  { category: "Industry Media & Tools", name: "Geek+ Free Tools & Calculators", description: "Collection of 50+ free warehouse tools including ROI calculators, warehouse design planners, and automation readiness assessments.", date: "2025-07-20", url: "https://geekplus.com/resources/free-tools-calculators" },
  { category: "Industry Media & Tools", name: "Mecalux Easy WMS", description: "Cloud-based warehouse management system by Mecalux. Free demo available.", date: "2025-07-20", url: "https://www.mecalux.com/warehousing-solutions/software/easy-wms" },
  { category: "Industry Media & Tools", name: "OSHA Warehouse Safety eTool", description: "Free US government resource covering warehouse safety hazards, racking requirements, forklift safety, and ergonomics.", date: "2025-07-20", url: "https://www.osha.gov/etools/warehousing" },
  { category: "Industry Media & Tools", name: "Steel Weight Calculator", description: "Calculate the weight of steel beams, plates, and tubes. Useful for estimating racking system weight for freight planning.", date: "2025-07-20", url: "https://www.steelforge.com/weight-calculator" },
  { category: "Industry Media & Tools", name: "Ridg-U-Rak Virtual Showroom", description: "Interactive 3D animations showing how different racking systems function — selective, drive-in, push-back, VNA, and more.", date: "2025-07-20", url: "https://ridgurak.com/virtual-showroom/" },
  { category: "Industry Media & Tools", name: "Freightos - International Freight Calculator", description: "Instant freight rate calculator for container shipping (FCL and LCL). Useful for estimating international shipping costs.", date: "2025-07-20", url: "https://www.freightos.com/freight-calculator" },
  { category: "Industry Media & Tools", name: "World Freight Rates", description: "Global freight rate reference for ocean, air, and road transport. Helps estimate shipping costs from manufacturing facilities worldwide.", date: "2025-07-20", url: "https://www.worldfreightrates.com" },
];

export const categories = [
  "All",
  "Standards & Associations",
  "Global Manufacturers",
  "Accessories & Equipment",
  "Industry Media & Tools",
];

export const categoryMeta: Record<string, { count: number; description: string }> = {
  "Standards & Associations": {
    count: 12,
    description: "International design standards (FEM, EN, RMI, SEMA), certification bodies, and industry associations governing pallet racking.",
  },
  "Global Manufacturers": {
    count: 12,
    description: "Leading global manufacturers and suppliers of warehouse racking systems, structural steel, and logistics equipment.",
  },
  "Accessories & Equipment": {
    count: 7,
    description: "Essential racking components including wire mesh decks, pallet supports, safety accessories, and column protectors.",
  },
  "Industry Media & Tools": {
    count: 13,
    description: "Industry publications, planning tools, trade shows, and online platforms for warehouse logistics professionals.",
  },
};
