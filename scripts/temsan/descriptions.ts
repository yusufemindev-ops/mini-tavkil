import type { Locale } from '../catalogue-tree';

/**
 * Long-form product copy, written against each product's own measured facts.
 *
 * The first import gave every product a single sentence — a median of twelve
 * words. That is under half the length at which a product page carries enough
 * to rank or to answer a buyer, and it read as missing data because it was.
 *
 * What the SERPs for these terms actually reward, checked rather than assumed:
 *
 *   - "wholesale" and "bulk" appear together in nearly every ranking title
 *   - size and pack count are the filters buyers scan first (16x24, 50-packs)
 *   - **minimum order quantity is the gap** — the Turkish supplier directories
 *     that rank for these terms do not publish it, and we do
 *
 * So each entry names the material, the size, what is in a pack and what is in a
 * carton, then gives a buyer one reason to choose it. Every number here comes
 * from the supplier's price list via `data.json`; nothing is estimated. Where a
 * claim is about use rather than measurement it stays a claim about the product,
 * not about performance we have not tested.
 *
 * They are deliberately not written to a template. Eighty-two paraphrases of one
 * sentence is thin content wearing a longer coat, and duplicated structure across
 * a catalogue is its own ranking problem.
 *
 * Keyed by the family's lead product code, matching `catalogue.ts`. A code absent
 * here keeps the short description from `catalogue.ts`.
 */
export const DESCRIPTIONS: Record<string, Partial<Record<Locale, string>>> = {
  // ── Packaging twine ────────────────────────────────────────────────────────
  'TM-210': {
    en: 'Polypropylene packaging twine on a 2 kg roll, twelve rolls to the carton. The weight is the point: a 2 kg roll runs for days on a dispatch bench without a changeover, which is why it is the size warehouses reorder rather than the small retail spool. Polypropylene holds a knot under tension and does not rot in a damp store, so stock rotates on your schedule instead of the weather’s.',
  },
  'TM-205': {
    en: 'A 500 g roll of parcel twine, forty to the carton. Sized for a counter rather than a loading bay — light enough to sit in a dispenser beside a till and be replaced by whoever is on shift. The same polypropylene as the heavier rolls, so a shop and its warehouse can standardise on one material and one knot.',
  },
  'TM-204': {
    en: 'Sack closing twine on a 1 kg roll, twenty to the carton. Spun for the job it is named after: strong enough to stitch or hand-tie a filled sack mouth without cutting into the operator’s hand, and consistent enough in diameter to feed a bag-closing machine. Bought by grain, feed and produce packers who get through it by the pallet.',
  },

  // ── Hoses ──────────────────────────────────────────────────────────────────
  'TM-420': {
    en: 'A reinforced 20 metre garden hose, five to the carton. The reinforcement layer is what keeps it round under pressure — an unreinforced hose kinks at the first bend and the flow stops until someone walks back to straighten it. Twenty metres covers a standard garden or forecourt run from a single tap, and the coil ships flat enough that five fit a carton without crushing.',
  },

  // ── Jute twine ─────────────────────────────────────────────────────────────
  'TM-135': {
    en: 'Ten metre hanks of natural jute twine, twelve to a pack and ten packs per carton. Jute is bought where the tie has to be seen as well as hold: plant supports, produce bundling, gift and craft packaging. It biodegrades, which increasingly matters to buyers packing food or garden goods, and the 10 m hank is short enough to sell as a single unit at retail.',
  },
  'TM-131': {
    en: 'A wound ball of natural jute twine, ten balls to a pack and ten packs per carton. The ball format pays off at the counter — it feeds from the centre without tangling, so a shop assistant can cut a length one-handed. Same fibre as the hanks, in the presentation that suits a hardware shelf rather than a workbench.',
  },

  // ── Plaster sponges ────────────────────────────────────────────────────────
  'TM-515': {
    en: 'A fine white plaster sponge, twenty-four to a pack and ten packs per carton. The fine face is for the finishing pass — floating a wall smooth before the plaster sets, where a coarse sponge would drag and leave texture. Sold by builders’ merchants in quantity because a plasterer works through them across a job rather than reusing one.',
  },
  'TM-520': {
    en: 'A two-density plaster sponge with a coarse face for grout and a fine face for finishing, twenty-four to a pack and ten packs per carton. One sponge covering both passes means a tiler is not putting one down to pick another up, and stock is a single line rather than two. The denser side also survives cement longer than a single-density block.',
  },
  'TM-185': {
    en: 'Open-cell cleaning sponge in assorted colours, twelve to a pack and twenty-five packs per carton — three hundred sponges per shipment. The open cell structure holds water for wiping down walls, tiles and site surfaces rather than scouring them, and the colour mix lets a site colour-code by area or trade. A consumable bought by the carton, not the piece.',
  },

  // ── Kite string ────────────────────────────────────────────────────────────
  'TM-130': {
    en: 'Wound kite string on a hand spool, twenty to a pack and ten packs per carton. Seasonal stock in most markets and a steady line in Türkiye, where kite flying runs through spring. The spool is sized for a child’s hand and the winding is even, so the line pays out without the snags that end an afternoon.',
  },

  // ── Clotheslines ───────────────────────────────────────────────────────────
  'TM-012': {
    en: 'Braided nylon clothesline in 6, 8 and 20 metre lengths, twenty-four to a pack and ten packs per carton. Nylon holds tension outdoors without the stretch that leaves a cotton line sagging by mid-season, and it wipes clean rather than marking washing. The three lengths cover balcony, courtyard and rooftop runs, and each carries its own barcode — order one length or all three on a single quote.',
  },
  'TM-412': {
    en: 'Polyester clothesline in a PVC jacket, 10 and 20 metre lengths, twelve to a pack and ten packs per carton. The jacket is what makes it worth stocking over bare line: it wipes clean in a second and will never transfer a mark onto white washing, which is the complaint that drives returns. Lighter than the steel-cored version and easier to coil for retail.',
  },
  'TM-010': {
    en: 'PVC-coated steel clothesline, 10 and 20 metre lengths, twelve to a pack and ten packs per carton. The steel core is for spans that must not sag — a long courtyard or a run between two buildings, where a polymer line droops under a full load of wet washing. The PVC jacket keeps the steel off the laundry and off the hands.',
  },

  // ── Multi-purpose rope ─────────────────────────────────────────────────────
  'TM-134': {
    en: 'Flat woven multi-purpose rope, 10 metres, twelve to a pack and ten packs per carton. Flat rope lies against a load instead of biting into it, which matters when the load is something you would rather not mark, and the woven construction grips a knot more securely than a smooth round line. The heaviest of the utility ropes here at 30 kg to the carton.',
  },
  'TM-132': {
    en: 'Round multi-purpose rope, 10 metres, twelve to a pack and ten packs per carton. The general-duty line of the range: tying down, hanging, bundling, temporary fencing. Ten metres is the length most buyers reach for first, which is why it moves fastest — stocked alongside the 20 m as a short-and-long pair rather than on its own.',
  },
  'TM-133': {
    en: 'Round multi-purpose rope, 20 metres, twelve to a pack and ten packs per carton. The same construction as the 10 m in the length that covers a full vehicle tie-down or a longer site run without knotting two together — every joint in a rope is where it fails. At 25.2 kg the carton is a two-hand lift, so plan shelf placement accordingly.',
  },

  // ── Steel wire rope ────────────────────────────────────────────────────────
  'TM-211': {
    en: 'Galvanised steel wire rope in a PVC jacket, on 200 metre reels from 2 mm to 10 mm. The jacket is what makes it usable indoors and around washing: it will not rust-mark a wall or fray into the hand, and it can be cut to length without the end unravelling. Six diameters on one carton spec — the 2 mm reel weighs 1.7 kg, so a mixed pallet stays inside a light freight bracket.',
  },

  // ── Bath ───────────────────────────────────────────────────────────────────
  'TM-772': {
    en: 'Mesh bath puff in assorted colours, 150 to the carton in a counter display box. The display box is the reason this sells — it ships as its own point of sale, so a shop opens the carton and puts it on the counter rather than finding shelf space and a price rail. Mesh lathers more from less soap than a flannel, which is what keeps it a repeat purchase.',
  },
  'TM-773': {
    en: 'A larger, denser bath puff, 100 to the carton. More mesh per puff means more lather and a longer life before it collapses — the difference a customer notices in the second week, not the first. Stocked as the step-up line above the standard puff, usually side by side so the size difference does the selling.',
  },
  'RM-775': {
    en: 'A small soft bath sponge, 504 to the carton. The quantity tells you the market: hotel and guesthouse amenity supply, where sponges are placed fresh per guest and counted by the hundred. Plain, soft and unbranded, which is what a property wants when it puts its own label on the bathroom.',
  },

  // ── Dishwashing ────────────────────────────────────────────────────────────
  'RM-753': {
    en: 'A two-layer foam dish sponge with a scouring face, ten to a pack and 180 packs to the carton — 1,800 sponges per shipment. The sizing suits both retail shelf and catering resupply, where sponges are replaced on a schedule rather than when they wear out. Denser foam than a promotional-grade sponge, so it holds its shape through a shift instead of tearing at the scour line.',
  },
  'TM-750': {
    en: 'A four-pack of industrial dish sponges, fifteen packs to the carton. Thicker foam and a harder scour face than a domestic sponge, because a catering kitchen puts one through burnt pans rather than plates. Bought by canteens and restaurant supply, where the four-pack matches a weekly changeover across four stations.',
  },
  'RM-755': {
    en: 'A large-format classic dish sponge, five to a pack and 240 packs per carton. The extra size is for pans and gastronorm trays — a standard sponge makes a cook work twice across the same surface. Same two-layer construction as the ten-pack, in the size and count a busy kitchen actually consumes.',
  },
  'TM-751': {
    en: 'A grooved dish sponge, five to a pack and 216 packs per carton. The grooves are functional rather than decorative: they give a wet hand somewhere to grip, and they let the sponge reach into a corner or along a pan rim that a flat face skates over. A small design difference that shows up in reorder rates.',
  },
  'TM-620': {
    en: 'An absorbent microfibre dish drying mat, 120 to the carton. It takes the water off washed dishes and holds it rather than letting it run onto a worktop, then rolls up to dry or goes through a machine wash. Sold where dish racks are not — small kitchens, rentals and catering vans — and it stores flat, which is why a carton of 120 is not a pallet.',
  },
  'TM-740': {
    en: 'A thicker, higher-pile drying mat, 100 to the carton. More pile holds more water without spreading it, which is the failure of a thin mat: it soaks through and the worktop is wet anyway. The step-up line above the standard mat, and at 12.5 kg the carton is the heaviest in this category — a signal of how much material is in it.',
  },
  'TM-785': {
    en: 'Woven stainless steel scourers, two to a pack in a counter display box, forty-eight to the carton. For burnt-on residue on pans, grills and hobs where a foam sponge gives up. Woven mesh rather than loose wool, so it does not shed strands into the sink, and the display box means it merchandises itself at the till.',
  },
  'TM-624': {
    en: 'A mesh-wrapped dish sponge, three to a pack and 120 packs per carton. The mesh lifts residue without scratching, which is what makes it safe on non-stick and glazed surfaces where a metal scourer is not. The economy line of the mesh range — same construction, lighter foam, priced for volume retail.',
  },
  'TM-460': {
    en: 'The three-pack mesh sponge in a retail-ready counter display, 120 to the carton. Identical sponge to the economy line with more foam behind the mesh, supplied in a display box so a shop can put the carton straight on the counter. The format most independent retailers reorder, because it needs no shelf plan.',
  },
  'TM-782': {
    en: 'Black-coated stainless scourers, two to a pack in a display box, forty-eight to the carton. The coating is why it exists: bare stainless leaves grey marks on stainless-steel surfaces, and a kitchen that has just fitted a steel splashback notices immediately. Same cutting power, no transfer.',
  },

  // ── Glass cleaning ─────────────────────────────────────────────────────────
  'TM-612': {
    en: 'Four diamond-weave glass cloths, 30 × 40 cm, on a header card, 120 to the carton. Diamond weave clears glass dry — no chemical, no second pass with a dry cloth — which is what stops the streaking a flat-weave cloth leaves behind. The header card hangs on a peg rail, so it sells from the same fixture as squeegees rather than needing shelf space.',
  },
  'TM-611': {
    en: 'Diamond-weave glass cloths in 30 × 40 cm and 40 × 40 cm, twenty to a pack and 400 to the carton. The two sizes are not interchangeable in practice: 30 × 40 suits domestic windows and mirrors, 40 × 40 folds into a usable pad for shopfronts and vehicle glass. Sold loose in packs rather than carded, for buyers who refill rather than merchandise.',
  },
  'TM-712': {
    en: 'A piqué-weave cloth, 40 × 50 cm, individually wrapped, 250 to the carton. Piqué is the weave that leaves no lint, which is why it is used on mirrors, display cases and spectacle counters where a fibre left behind is the whole problem. Individual wrapping keeps each cloth clean until use — the reason opticians and jewellers buy this format.',
  },
  'TM-713': {
    en: 'The same 40 × 50 cm piqué cloth supplied loose in bulk, 500 to the carton. Dropping the wrapper takes the cost per cloth down substantially, which is the right trade for contract cleaning where cloths go into a laundry cycle rather than a customer’s hand. Twice the count per carton and less packaging to dispose of on site.',
  },

  // ── General cleaning ───────────────────────────────────────────────────────
  'TM-475': {
    en: 'Four microfibre cloths, 25 × 35 cm, ultrasonically cut, 100 packs per carton. Ultrasonic cutting seals the edge instead of stitching it, so there is no seam to trap dirt and nothing to fray — the cloth stays flat through repeated washing. The smallest of the microfibre sizes here, sized for detail work rather than covering a worktop.',
  },
  'TM-600': {
    en: 'Four microfibre cleaning cloths, 30 × 40 cm, on a header card, 120 to the carton. Colour-coded so tasks stay separated — the standard practice in food premises and healthcare, where a cloth crossing from washroom to prep is an audit failure. The card carries the colour system visibly, which is half the reason a facilities buyer picks a carded pack.',
  },
  'TM-720': {
    en: 'A nine-pack of general-purpose cleaning cloths, ninety packs per carton. The count is aimed squarely at high-turnover cleaning: nine cloths covers a shift across a small site without anyone rationing them. Plain, absorbent, machine washable and priced to be replaced rather than nursed.',
  },
  'TM-163': {
    en: 'A three-piece micro plush cloth set, 120 sets per carton. High-pile plush lifts dust dry and polishes without a chemical, which is what puts it on dashboards, screens and painted surfaces where a spray would be the wrong answer. Sold as a set because the three are used in sequence — dust, damp, buff.',
  },
  'TM-164': {
    en: 'A four-piece micro plush set in assorted colours, 120 sets per carton. The fourth cloth and the colour range make this the room-by-room version of the three-piece: one colour per zone, which stops the kitchen cloth ending up in the bathroom. At 13.9 kg the carton carries noticeably more material than the three-piece.',
  },
  'TM-618': {
    en: 'A large micro plush cleaning cloth, 40 × 40 cm, twelve to a pack and 144 packs per carton. The size is what distinguishes it — 40 cm covers a dashboard or a worktop in one pass where a 30 cm cloth needs three. Plush pile rather than flat microfibre, so it is a polishing cloth first and a wiping cloth second.',
  },
  'TM-715': {
    en: 'Four overlocked microfibre cloths, twelve packs to a sleeve and 240 packs per carton. Overlocking is the stitched border that holds the weave together through commercial laundering, where an unfinished edge unravels after a dozen cycles. The economy weight of the overlocked range — the same construction with less fibre, for buyers replacing cloths often.',
  },
  'TM-465': {
    en: 'A 30 × 30 cm microfibre cloth with overlocked edges, four to a sleeve and 240 to the carton. The stitched border is what separates a wholesale line from a consumable — it survives commercial laundering where a cut edge frays within a dozen washes. At this size the cloth folds into quarters, giving eight clean faces before it needs changing, which is why contract cleaners and hotel housekeeping buy it over a larger towel.',
  },
  'TM-468': {
    en: 'The same 30 × 30 cm four-pack with ultrasonically sealed edges rather than stitched, 240 packs per carton. Sealing leaves no seam at all, so the cloth lies perfectly flat and has nowhere to harbour soil — preferred in cleanroom and food-contact work for exactly that reason. Choose it over the overlocked version where hygiene audit matters more than laundry life.',
  },
  'TM-605': {
    en: 'The everyday microfibre cloth, 30 × 40 cm, twenty to a pack and 400 to the carton. This is the volume line: no card, no colour system, no finishing beyond the cut — just the cloth, in the count a facilities buyer orders when the store cupboard is empty. The largest carton count in the general cleaning range.',
  },
  'TM-058': {
    en: 'A three-pack of premium cleaning cloths, sixty packs per carton. Heavier weave and denser pile than the standard line, which shows in how many washes it survives rather than in how it looks on day one. Positioned above the volume cloths for buyers who have worked out that a cheaper cloth replaced three times is not cheaper.',
  },
  'TM-721': {
    en: 'A perforated cleaning cloth roll, fifteen sheets, fifteen rolls per carton. Tear off a sheet, use it, then rinse it or bin it — the decision is made per sheet rather than per cloth, which is why it suits kitchens handling raw and cooked in the same space. The roll stands in a holder, so it dispenses one-handed.',
  },
  'TM-051': {
    en: 'The twenty-sheet version of the perforated roll, fifteen rolls per carton. Five more sheets per roll for kitchens that get through cloths quickly enough that changing the roll becomes the annoyance. Same perforation and same holder fit — stock one or the other, not usually both.',
  },
  'TM-050': {
    en: 'A three-pack of basic cleaning cloths, 200 packs per carton. Absorbent, washable and priced for volume — the line that fills a shelf underneath the microfibre rather than competing with it. Six hundred cloths per carton at 7.8 kg, which is as much cleaning cloth as a small retailer sells in a season.',
  },
  'TM-790': {
    en: 'A woven cloth made specifically for stainless steel, 800 to the carton. Steel shows every smear, and a general cloth leaves them; this weave polishes to a shine and lifts fingerprints without a chemical. The highest carton count in the range, because commercial kitchens and appliance retailers buy it as a consumable.',
  },

  // ── Car care ───────────────────────────────────────────────────────────────
  'TM-710': {
    en: 'A diamond-weave glass cloth, 50 × 70 cm, on a header card, 120 to the carton. Windscreen-sized, so a driver clears the glass in one pass rather than working across it, and diamond weave means no streak in low sun. The header card is built for forecourt display, which is where this is bought on impulse rather than planned.',
  },
  'TM-709': {
    en: 'The 50 × 70 cm diamond-weave cloth supplied twenty to a pack, 200 to the carton. Same cloth as the carded version without the card — the format for valeting bays and fleet workshops that get through them, where merchandising is irrelevant and cost per cloth is not. At 17.5 kg this is the heaviest carton in car care.',
  },
  'TM-706': {
    en: 'A deep-pile microfibre body cloth, 50 × 70 cm, twenty to a pack and 120 packs per carton. Deep pile holds water and, more importantly, lifts grit away from the paint instead of dragging it along — which is what causes the fine swirl marks a customer notices in sunlight. The cloth a valeter uses on bodywork, not glass.',
  },
  'TM-700': {
    en: 'A car drying cloth, 50 × 70 cm, carded, 120 to the carton. Absorbent enough to take a full car down without wringing, which is the difference between drying a vehicle and chasing water around it. Carded for retail display alongside the glass cloths, and the same 50 × 70 size so a forecourt can run one fixture for both.',
  },
  'TM-701': {
    en: 'The same drying cloth rolled in a tube, ninety-six to the carton. Rolling rather than folding means it stores damp without setting a crease, and the tube keeps it clean between jobs in a van where a folded cloth ends up on the floor. Noticeably lighter per unit than the carded version at 1.95 kg per carton.',
  },
  'TM-653': {
    en: 'A plush car drying mitt, 100 to the carton. A mitt keeps the hand behind the cloth, which is what lets a valeter follow a contour, a door shut or a trim edge without losing grip on a wet panel. Bought where drying is done by hand rather than blown — detailing bays and forecourt services.',
  },
  'TM-752': {
    en: 'A large open-cell car wash sponge, 216 to the carton. Open cell carries a lot of foam and, more usefully, releases grit when rinsed rather than holding it against the next panel. Cheap enough to replace when it has been dropped, which is exactly what should happen to a wash sponge that has touched the ground.',
  },

  // ── Floor cleaning ─────────────────────────────────────────────────────────
  'TM-087': {
    en: 'A 40 cm damp flat mop supplied with its frame, fifty to the carton. The entry-level of the flat-mop range: everything needed except the handle, so a buyer already stocking handles can add flat mopping to the range in one line. Flat mops cover more floor per pass than a string mop and use far less water, which is why contract cleaning moved to them.',
  },
  'TM-170': {
    en: 'An almond-shaped mop head, fifty to the carton. The shape is the whole idea — a round mop leaves the corner of every room untouched and someone comes back with a cloth, while the almond point reaches into it on the same pass. Sold to housekeeping teams whose work is inspected at the edges.',
  },
  'TM-078': {
    en: 'A towel-pile mop head on a spin joint, sixty to the carton. The joint lets the head lie flat at any angle, so it goes under furniture without the operator crouching to reposition it. Towel pile picks up more grit than a cord mop and washes clean afterwards, which suits floors that are swept and mopped in one action.',
  },
  'TM-175': {
    en: 'A deluxe corded spin-head mop, sixty to the carton. More yarn than the standard corded head, so it carries more water for larger floors and wetter work — and the spin joint still lets it lie flat. Positioned above the standard spin mop for buyers covering halls and corridors rather than rooms.',
  },
  'TM-764': {
    en: 'A standard corded mop head on a rotating joint, sixty to the carton, sold without the handle. The head-only format is what a facilities buyer wants: handles last for years and heads do not, so the reorder is one line and not two. Fits the same fitting as the rest of the spin range.',
  },
  'TM-664': {
    en: 'An economy microfibre mop head, 100 to the carton. Microfibre picks up fine dust that a cord mop pushes around, and at this price it is replaced rather than laundered — which is often the right call for sites where mop hygiene is audited. Fits the standard bottle-thread handle used across this range.',
  },
  'TM-432': {
    en: 'A coloured welsoft mop head on a header card, 100 to the carton. The economy weight of the welsoft range, priced for high-street retail where the card does the selling. Welsoft takes up more water than cotton yarn and wrings out close to dry, so a floor is walkable sooner.',
  },
  'TM-662': {
    en: 'A striped welsoft mop head, 100 to the carton, supplied without a card. The stripe is woven from two pile densities, which gives the head both a scrubbing and an absorbing face — useful on tiled floors where grout holds what a flat pile skates over. The bagged economy line of the welsoft range.',
  },
  'TM-155': {
    en: 'A wide-frame mop, forty to the carton. The extra width covers more floor per pass, which is the entire economics of cleaning a hall, corridor or showroom — fewer passes, less time, same result. The heaviest per unit of the mop range at 11.1 kg for forty, because the frame is doing real work.',
  },
  'TM-145': {
    en: 'A twisted cotton-blend cord mop, sixty to the carton. The traditional wet mop, and still the right tool for a rough or uneven hard floor where a flat pad bridges the dips and misses them. Cotton blend holds a lot of water, so it is a mop for washing a floor rather than damp-wiping it.',
  },
  'TM-148': {
    en: 'A jumbo cord mop, fifty to the carton. More yarn again than the standard cord head — bought for warehouses, workshops and wet areas where the job is moving water rather than polishing a surface. At 12.24 kg per carton of fifty, the weight is all in the head.',
  },
  'TM-482': {
    en: 'A looped strip mop in 40, 50 and 60 cm widths, 150 to the carton. Looped strips rather than cut yarn means nothing sheds onto the floor being cleaned, which is why this is the head used in food premises and hospitals. The three widths match standard frame sizes, so a site can run one head type across every trolley.',
  },
  'TM-680': {
    en: 'A clamp mop set without a handle, fifty to the carton. The plate and refill together — squeeze the lever and the pad releases, so a soiled pad goes into the wash without being touched. Sold handle-less because the buyer usually has handles and needs the mechanism.',
  },
  'TM-250': {
    en: 'Replacement pads for the clamp mop, two to a pack and 120 packs per carton. Machine washable and colour-fast, which matters when pads are laundered daily and a faded pad looks like a dirty one. The consumable half of the clamp system — most buyers order these several times per plate.',
  },
  'TM-088': {
    en: 'A damp flat mop with its frame in 40, 50 and 60 cm, fifty to the carton. The complete unit rather than a refill: frame, pad and fitting, ready for a handle. Three widths so a cleaning contractor can match frame size to the site instead of carrying one compromise size everywhere.',
  },
  'TM-084': {
    en: 'Damp mop pads from 25 cm to 80 cm, twenty-five to a pack and 300 per carton. The refill line for the flat-mop system, in five widths — 25 cm for washrooms and stairwells, 80 cm for open floor. Twenty-five to a pack matches how contract cleaners stock a trolley: one pack per site visit, one pad per room.',
  },
  'TM-778': {
    en: 'A three-piece microfibre spin mop set, twenty-five to the carton. Telescopic handle, spin head and microfibre pad in one box — the complete mop, which is what a retailer needs when the customer has nothing already. The only set here that ships with a handle, which is why the carton holds twenty-five rather than a hundred.',
  },
  'TM-665': {
    en: 'A deluxe microfibre mop head, sixty to the carton. Long-pile microfibre traps fine dust as effectively dry as it mops wet, so one head does the sweep and the wash. The step-up from the economy microfibre head, with noticeably more fibre — 10.65 kg per sixty against 10.5 kg per hundred.',
  },
  'TM-435': {
    en: 'A standard microfibre mop head in assorted colours, 100 to the carton. The middle of the microfibre range: more fibre than the economy head, no premium price, and the colour mix lets a site colour-code by floor or department. Bottle-thread fitting, like the rest of the range.',
  },
  'TM-550': {
    en: 'A plastic flat mop frame from 25 cm to 80 cm, fifty to the carton. Velcro face and a jointed handle socket, so the frame swivels flat under furniture instead of stopping at the skirting board. Sold separately from pads because frames outlast pads many times over — five widths, one fitting.',
  },
  'TM-471': {
    en: 'A replacement microfibre pad for spray mops, 300 to the carton. Washable and reusable rather than disposable, which is the argument for a spray mop over a wipe system in the first place. The highest carton count in floor cleaning, because a pad is changed per room.',
  },
  'TM-470': {
    en: 'A single replacement pad for tablet-style flat mops, 300 to the carton. Sold as singles rather than packs so a buyer orders exactly what a site consumes, which for a busy floor is more pads than anyone estimates. Fits the standard tablet plate used across the flat-mop range.',
  },
  'TM-165': {
    en: 'A large floor cloth, 50 × 70 cm, 144 to the carton. For spills, stairs and the edges a mop cannot reach — the cloth that gets used on hands and knees when something has gone wrong. Big enough to contain a spill rather than spread it, and cheap enough that nobody hesitates to use one.',
  },
  'TM-076': {
    en: 'A welsoft mop head on a header card, sixty to the carton in five shelf colours. Welsoft pile takes up more water than cotton yarn and wrings out close to dry, so floors are walkable sooner — the reason it has largely replaced string mops in Turkish retail. The card is sized for peg display without repacking, and it fits any standard bottle-thread handle, so heads and handles can be stocked independently.',
  },
  'TM-075': {
    en: 'The same coloured welsoft head supplied bagged rather than carded, sixty to the carton. Dropping the card takes cost and packaging out for buyers who sell from a bin or refill a bulk display, and it ships in the same carton weight. Identical head, cheaper presentation.',
  },
  'TM-430': {
    en: 'A striped welsoft mop head on a header card, sixty to the carton. The stripe is two pile densities woven together, giving one face that scrubs and one that absorbs — the carded, retail version of the striped welsoft head. Holds water without dripping across a shop floor between bucket and mop.',
  },
};
