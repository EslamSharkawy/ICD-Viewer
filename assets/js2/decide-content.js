// "Which one do I pick?" - the choices a coder actually has to make.
//
// Coverage here is not a matter of taste. It is built from the official
// documents in three layers:
//
//   1. Every numbered guideline in the FY2027 ICD-10-PCS Official Guidelines
//      gets a card of its own. Those are generated at run time straight from
//      the parsed guideline text, so nothing can be left out - see
//      views/decide.js, guidelineCards().
//   2. CMS's own nine root-operation objective groups. Members of a group share
//      an objective and differ on one point, which is exactly what makes them
//      confusable, so each group card separates its members from each other.
//   3. The curated cards below: the individual decisions that need more than
//      the rule text - plain language, a worked contrast, and a diagram where
//      the difference is spatial rather than verbal.
//
// Every curated card names the official rule it rests on. A rule the reader
// cannot trace back is the problem this tool exists to fix, so `rules` is not
// optional: decide.js reports any card that lacks one.
//
// Where a card and the CMS ICD-10-PCS Reference Manual differ from the FY2027
// guidelines, the guidelines win, and the card says so.

/**
 * axis  - the character this decision settles (3 = root operation, 4 = body
 *         part, 5 = approach, 6 = device, 7 = qualifier, 0 = more than one).
 * rules - official guideline identifiers.
 * ops   - root operations the card separates, so the builder can offer it at
 *         the right moment.
 */
export const CARDS = [

  /* ================================================== root operation groups */

  {
    id: 'group-takeout',
    title: 'Excision, Resection, Detachment, Destruction or Extraction?',
    question: 'Something was removed. How much, and by what method?',
    axis: 3, group: 'takeout', diagram: 'takeout',
    rules: ['B3.8', 'B3.4a'],
    ops: ['Excision', 'Resection', 'Detachment', 'Destruction', 'Extraction'],
    lead: `All five take out some or all of a body part. They are told apart by two questions
      only: <b>how much</b> came out, and <b>by what means</b>.`,
    compare: [
      { name: 'Excision', char: 'B',
        means: 'Cutting out or off, without replacement, <b>a portion</b> of a body part.',
        pick: 'Part of the body part was cut out. Partial nephrectomy, liver biopsy.',
        avoid: 'All of it came out — that is Resection.' },
      { name: 'Resection', char: 'T',
        means: 'Cutting out or off, without replacement, <b>all</b> of a body part.',
        pick: 'The whole body-part value is gone. Total nephrectomy, lobectomy.',
        avoid: 'Only part came out, or the part removed has no body-part value of its own.' },
      { name: 'Detachment', char: '6',
        means: 'Cutting off all or a portion of the <b>upper or lower extremities</b>.',
        pick: 'An amputation of a limb, hand, foot, finger or toe.',
        avoid: 'Anything that is not an extremity. Detachment exists nowhere else.' },
      { name: 'Destruction', char: '5',
        means: 'Physical eradication by <b>energy, force or a destructive agent</b>.',
        pick: 'The tissue was destroyed in place. Fulguration of a polyp, cautery of a lesion.',
        avoid: 'Anything was actually taken out — none of the body part leaves the patient in Destruction.' },
      { name: 'Extraction', char: 'D',
        means: 'Pulling or stripping out or off by the <b>use of force</b>.',
        pick: 'It was pulled, stripped or scraped rather than cut. D&C, vein stripping, bone marrow biopsy.',
        avoid: 'A blade did the work — that is Excision.' },
    ],
    body: `<h3>The two questions, in order</h3>
      <p><b>First: how much?</b> If <i>all</i> of the body part as PCS defines it was taken out,
        it is Resection. If only part of it was, it is Excision. This is where the body-part
        values matter more than the surgeon's wording: PCS gives lobes of the lung and liver and
        regions of the intestine their own values, so a left upper lobectomy is
        <b>Resection of Upper Lung Lobe, Left</b> — not Excision of Lung, Left. Removing all of a
        value that exists always beats removing part of a broader one.</p>
      <p><b>Then: by what means?</b> Cut out with a blade is Excision or Resection. Pulled or
        stripped out by force is Extraction. Burned, frozen or chemically eradicated with nothing
        taken out at all is Destruction. Cut off an arm or a leg and it is Detachment, whatever
        the instrument.</p>
      <h3>Biopsies live here</h3>
      <p>There is no root operation called Biopsy. A biopsy is Excision, Extraction or Drainage
        with the qualifier <b>Diagnostic</b> — which of the three depends on how the sample was
        taken, not on the word "biopsy".</p>`,
    examples: [
      { text: 'Left upper lobectomy of the lung', answer: 'Resection of Upper Lung Lobe, Left' },
      { text: 'Percutaneous needle core biopsy of the liver', answer: 'Excision of Liver, qualifier Diagnostic' },
      { text: 'Bone marrow biopsy', answer: 'Extraction, qualifier Diagnostic' },
      { text: 'Fine needle aspiration of fluid in the lung', answer: 'Drainage, qualifier Diagnostic' },
      { text: 'Cautery of a skin lesion', answer: 'Destruction — nothing was removed' },
    ],
    traps: [
      'Coding Excision of the whole organ because the note says "excision". Read what came out, not what it was called.',
      'Coding Destruction when tissue was sent to pathology. If something reached the specimen jar it was not destroyed in place.',
    ],
    also: ['excision-vs-resection', 'detachment-levels', 'biopsy-then-definitive'],
  },

  {
    id: 'group-takeoutstuff',
    title: 'Drainage, Extirpation or Fragmentation?',
    question: 'What came out was not body part. Was it fluid, or solid matter — and did it leave?',
    axis: 3, group: 'takeoutstuff', diagram: 'takeoutstuff',
    rules: ['B3.4a', 'B6.2'],
    ops: ['Drainage', 'Extirpation', 'Fragmentation'],
    lead: `None of these removes any of the body part itself. They differ on the state of what
      came out, and on whether it came out at all.`,
    compare: [
      { name: 'Drainage', char: '9',
        means: 'Taking or letting out <b>fluids and/or gases</b> from a body part.',
        pick: 'Liquid or gas was let out. Thoracentesis, incision and drainage.',
        avoid: 'What came out was solid.' },
      { name: 'Extirpation', char: 'C',
        means: 'Taking or cutting out <b>solid matter</b> from a body part.',
        pick: 'A clot, a stone, a foreign body was taken out whole. Thrombectomy, choledocholithotomy.',
        avoid: 'The solid matter was only broken up and left where it was.' },
      { name: 'Fragmentation', char: 'F',
        means: 'Breaking solid matter in a body part <b>into pieces</b>.',
        pick: 'The stone was broken up and the pieces left to pass. Lithotripsy.',
        avoid: 'The pieces were then taken out — if they were removed, it is Extirpation.' },
    ],
    body: `<h3>The distinction that gets missed</h3>
      <p>Extirpation and Fragmentation both deal with solid matter that should not be there. The
        deciding question is <b>whether it left the body</b>. Break a kidney stone with shock waves
        and let the fragments pass in the urine, and that is Fragmentation. Break it and then
        basket the pieces out, and that is Extirpation — the objective was removal, and the
        breaking was how it was achieved.</p>
      <h3>Putting a drain in is Drainage</h3>
      <p>A procedure done purely to place a drainage device is coded to Drainage with the device
        value <b>Drainage Device</b>, not to Insertion.</p>
      <h3>Aspiration biopsies</h3>
      <p>A fine needle aspiration of fluid is Drainage with the qualifier Diagnostic. This is the
        one place a biopsy is neither Excision nor Extraction.</p>`,
    examples: [
      { text: 'ESWL of a left kidney stone, fragments left to pass', answer: 'Fragmentation' },
      { text: 'Cystoscopy with basket removal of a bladder stone', answer: 'Extirpation' },
      { text: 'Percutaneous placement of a nephrostomy tube', answer: 'Drainage with device Drainage Device' },
      { text: 'Thoracentesis for pleural effusion', answer: 'Drainage' },
    ],
    traps: [
      'Coding Fragmentation when the pieces were retrieved. Ask what the surgeon meant to achieve.',
      'Coding Insertion for a drain. A drain placed on its own is Drainage.',
    ],
    also: ['device-only-procedures'],
  },

  {
    id: 'group-cutting',
    title: 'Release or Division?',
    question: 'Was the body part cut, or was something around it cut to set it free?',
    axis: 3, group: 'cutting', diagram: 'release-division',
    rules: ['B3.13', 'B3.14'],
    ops: ['Release', 'Division'],
    lead: `Both cut. The difference is <b>what</b> is cut, and that also decides the body part
      value — which is the part most often got wrong.`,
    compare: [
      { name: 'Release', char: 'N',
        means: 'Freeing a body part from an <b>abnormal physical constraint</b> by cutting or force.',
        pick: 'Something was restraining the body part and was cut away. Adhesiolysis, carpal tunnel release.',
        avoid: 'The body part itself was cut through.' },
      { name: 'Division', char: '8',
        means: 'Cutting into a body part to <b>separate or transect</b> it.',
        pick: 'The body part itself was cut in two. Osteotomy, cordotomy, sphincterotomy.',
        avoid: 'The cutting was done to surrounding tissue to free something.' },
    ],
    body: `<h3>The rule in one line</h3>
      <p>If the objective was <b>freeing</b> a body part without cutting the body part, it is
        Release. If the objective was <b>separating or transecting</b> the body part, it is
        Division.</p>
      <h3>The body part value trips people up</h3>
      <p>In Release, the body part you code is <b>the part being freed</b> — not the tissue that
        was cut to free it. Lysis of intestinal adhesions is coded to the specific intestine body
        part, never to the peritoneum or to the adhesions. Some of the restraining tissue may be
        taken out; none of the body part is.</p>
      <h3>Nerve, cut two ways</h3>
      <p>Freeing a nerve root from surrounding scar tissue to relieve pain is <b>Release</b>.
        Severing that same nerve root to relieve pain is <b>Division</b>. Same nerve, same
        complaint, opposite objectives.</p>`,
    examples: [
      { text: 'Laparoscopic lysis of small bowel adhesions', answer: 'Release, body part Small Intestine' },
      { text: 'Carpal tunnel release', answer: 'Release of Median Nerve' },
      { text: 'Anal sphincterotomy', answer: 'Division' },
      { text: 'Osteotomy of the femur', answer: 'Division' },
    ],
    traps: [
      'Coding the adhesions, scar or ligament as the body part in a Release. Code the structure that was freed.',
      'Coding Release for a tenotomy. Cutting the tendon through is Division.',
    ],
  },

  {
    id: 'group-putback',
    title: 'Transplantation, Reattachment, Transfer or Reposition?',
    question: 'Living tissue moved. Where did it come from, and is it still attached?',
    axis: 3, group: 'putback', diagram: 'putback',
    rules: ['B3.16', 'B3.17'],
    ops: ['Transplantation', 'Reattachment', 'Transfer', 'Reposition'],
    lead: `All four move living tissue. Two questions separate them: whose tissue is it, and did
      it keep its blood supply?`,
    compare: [
      { name: 'Transplantation', char: 'Y',
        means: 'Putting in a living body part taken <b>from another individual or animal</b>.',
        pick: 'A donor organ. Kidney transplant, heart transplant.',
        avoid: 'What was put in was cells rather than an organ — that is the Administration section.' },
      { name: 'Reattachment', char: 'M',
        means: 'Putting back a <b>separated</b> body part in its normal or a suitable location.',
        pick: 'It came off and was put back. Reattachment of an amputated hand.',
        avoid: 'It never fully separated.' },
      { name: 'Transfer', char: 'X',
        means: 'Moving a body part to another location <b>without taking it out</b>, to take over a function.',
        pick: 'It stayed connected to its blood and nerve supply. Tendon transfer, pedicle flap.',
        avoid: 'The tissue was detached completely — a free flap is Replacement, not Transfer.' },
      { name: 'Reposition', char: 'S',
        means: 'Moving a body part to its <b>normal</b> location, or another suitable one.',
        pick: 'It was in the wrong place and was put right. Fracture reduction, undescended testicle.',
        avoid: 'It was moved to do a different job — that is Transfer.' },
    ],
    body: `<h3>Transfer versus Replacement — the flap question</h3>
      <p>A flap that keeps its own blood supply is <b>Transfer</b>. A free flap, cut away
        completely and re-anastomosed elsewhere, is <b>Replacement</b> of the site it went to
        (and possibly a separate Excision of where it came from). "Remains connected to its
        vascular and nervous supply" is the exact test.</p>
      <h3>Flaps of more than one layer</h3>
      <p>When a flap carries several layers — skin, subcutaneous tissue, fascia, muscle — code the
        body part of the <b>deepest</b> layer, and use the qualifier to name the other layers. A
        musculocutaneous flap is coded in the Muscles body system with a qualifier for the extra
        tissue.</p>
      <h3>Cells are not transplants</h3>
      <p>Putting in bone marrow, stem cells or pancreatic islet cells is <b>not</b> Transplantation.
        Those go to the Administration section (section 3). Transplantation is for a mature,
        functioning body part.</p>
      <h3>Fracture treatment</h3>
      <p>Reducing a <b>displaced</b> fracture is Reposition, and the cast or splint applied with it
        is not coded separately. A <b>non-displaced</b> fracture is coded to whatever was actually
        done: casting alone is Immobilization in the Placement section; putting a pin in is
        Insertion.</p>`,
    examples: [
      { text: 'Living-donor kidney transplant', answer: 'Transplantation' },
      { text: 'Autologous bone marrow infusion', answer: 'Administration section, not Transplantation' },
      { text: 'Latissimus dorsi musculocutaneous pedicle flap to the breast', answer: 'Transfer, Muscles body system, qualifier for the extra layers' },
      { text: 'Closed reduction of a displaced Colles fracture with cast', answer: 'Reposition — the cast is not coded separately' },
      { text: 'Casting of a non-displaced fracture', answer: 'Immobilization, Placement section' },
    ],
    traps: [
      'Coding Transplantation for stem cells or bone marrow.',
      'Coding a cast separately alongside a fracture reduction.',
      'Coding a free flap as Transfer.',
    ],
    also: ['grafts', 'graft-harvest'],
  },

  {
    id: 'group-tubular',
    title: 'Dilation, Occlusion, Restriction or Bypass?',
    question: 'A tube was altered. Wider, narrower, shut, or rerouted?',
    axis: 3, group: 'tubular', diagram: 'tubular',
    rules: ['B3.12', 'B3.6a', 'B3.6b', 'B3.6c'],
    ops: ['Dilation', 'Occlusion', 'Restriction', 'Bypass'],
    lead: `Four operations on tubular body parts, separated by what happened to the lumen.`,
    compare: [
      { name: 'Dilation', char: '7', means: 'Expanding an orifice or lumen.',
        pick: 'It was opened up. Angioplasty, urethrotomy.', avoid: 'The route changed rather than the width.' },
      { name: 'Restriction', char: 'V', means: '<b>Partially</b> closing an orifice or lumen.',
        pick: 'It was narrowed but left open. Fundoplication, cerclage, aneurysm coiling.', avoid: 'It was closed completely.' },
      { name: 'Occlusion', char: 'L', means: '<b>Completely</b> closing an orifice or lumen.',
        pick: 'It was shut off. Tubal ligation, embolisation to stop blood supply.', avoid: 'It was only narrowed.' },
      { name: 'Bypass', char: '1', means: 'Altering the <b>route of passage</b> of the contents.',
        pick: 'The contents were rerouted around something. CABG, colostomy.', avoid: 'Nothing was rerouted.' },
    ],
    body: `<h3>Occlusion or Restriction — ask the objective</h3>
      <p>For an embolisation, the deciding question is what the operator was trying to achieve.
        Closing the vessel completely is <b>Occlusion</b>; narrowing the lumen is
        <b>Restriction</b>. Tumour embolisation is Occlusion, because the point is to cut off the
        blood supply. Coiling a cerebral aneurysm is Restriction, because the point is to narrow
        the abnormally wide segment, not to close the vessel.</p>
      <h3>Bypass: from and to</h3>
      <p>The 4th character is the body part bypassed <b>from</b>; the 7th character qualifier is
        the body part bypassed <b>to</b>. Bypass from stomach to jejunum: stomach is the body part,
        jejunum is the qualifier.</p>
      <h3>Coronary bypass is backwards</h3>
      <p>Coronary artery bypass reverses this, and it is the single most commonly miscoded
        procedure in PCS. The body part is the <b>number of coronary arteries bypassed to</b> —
        One Artery, Two Arteries and so on — and the qualifier names the vessel bypassed
        <b>from</b> (aorta, internal mammary). And a separate code is needed for each coronary
        artery that uses a <b>different device or qualifier</b>: an aortocoronary graft and an
        internal mammary graft in the same operation are two codes.</p>`,
    examples: [
      { text: 'Tumour embolisation of the hepatic artery', answer: 'Occlusion' },
      { text: 'Coil embolisation of a cerebral aneurysm', answer: 'Restriction' },
      { text: 'Gastric bypass, stomach to jejunum', answer: 'Bypass, body part Stomach, qualifier Jejunum' },
      { text: 'CABG x2, both from the aorta with saphenous vein', answer: 'One code: Bypass Coronary Artery, Two Arteries, qualifier Aorta' },
      { text: 'LIMA to LAD plus aortocoronary vein graft to OM', answer: 'Two codes — different qualifiers' },
    ],
    traps: [
      'Counting coronary bypass sites as the number of grafts rather than the number of arteries bypassed to.',
      'Coding one CABG code when the grafts used different sources.',
    ],
    also: ['bypass-direction', 'bodypart-coronary'],
  },

  {
    id: 'group-device',
    title: 'Insertion, Replacement, Supplement, Change, Removal or Revision?',
    question: 'A device was involved. What was actually done to it?',
    axis: 3, group: 'device', diagram: 'device-ops',
    rules: ['B6.1a', 'B6.1b', 'B6.1c', 'B3.18'],
    ops: ['Insertion', 'Replacement', 'Supplement', 'Change', 'Removal', 'Revision'],
    lead: `Six operations that all turn on a device. Three put something in for the first time,
      three deal with a device already there.`,
    compare: [
      { name: 'Insertion', char: 'H',
        means: 'Putting in a nonbiological appliance that <b>monitors, assists, performs or prevents</b> a function, and does not take the place of a body part.',
        pick: 'A pacemaker, a central line, a radioactive implant.', avoid: 'The device takes the place of the body part.' },
      { name: 'Replacement', char: 'R',
        means: 'Material that <b>physically takes the place</b> of all or a portion of a body part.',
        pick: 'Total hip, prosthetic valve, free skin graft.', avoid: 'The body part is still there and only reinforced.' },
      { name: 'Supplement', char: 'U',
        means: 'Material that <b>reinforces or augments</b> a portion of a body part.',
        pick: 'Hernia mesh, annuloplasty ring, a new liner in an existing hip.', avoid: 'The body part was taken over entirely.' },
      { name: 'Change', char: '2',
        means: 'Taking out a device and putting an identical or similar one back, <b>without cutting</b>.',
        pick: 'Catheter change, gastrostomy tube change.', avoid: 'Skin or mucous membrane was cut or punctured.' },
      { name: 'Removal', char: 'P', means: 'Taking a device out.',
        pick: 'Pacemaker explant, drainage tube removal.', avoid: 'A similar device went back in without cutting — that is Change.' },
      { name: 'Revision', char: 'W',
        means: 'Correcting a <b>malfunctioning or displaced</b> device.',
        pick: 'Repositioning a pacemaker lead, recementing a hip.', avoid: 'The whole device was swapped out.' },
    ],
    body: `<h3>The three "put in" operations, in one question</h3>
      <p>Ask what the material <b>does to the body part</b>:</p>
      <ul>
        <li>It does a job the body part cannot, and the body part stays — <b>Insertion</b>.</li>
        <li>It <i>is</i> the body part now — <b>Replacement</b>.</li>
        <li>It props the body part up so the body part can keep doing its job — <b>Supplement</b>.</li>
      </ul>
      <h3>Change has one approach, always</h3>
      <p>Every Change procedure is coded with the approach <b>External</b>, because by definition
        nothing was cut or punctured. If the skin was cut, it is not a Change.</p>
      <h3>Removal, then Insertion</h3>
      <p>Taking out a device and putting a new one in <i>through an incision</i> is two codes —
        Removal and Insertion — not Change. Change is reserved for the no-cutting case.</p>
      <h3>Excision or Resection followed by Replacement</h3>
      <p>When a body part is excised or resected and then replaced, code <b>both</b>, because they
        are two distinct objectives — mastectomy followed by reconstruction, maxillectomy with
        obturator. The exception is when the removal was simply preparatory: resecting the joint
        surfaces during a joint replacement, or the valve during a valve replacement, is part of
        the Replacement and is not coded separately.</p>`,
    examples: [
      { text: 'Total knee arthroplasty', answer: 'Replacement — the joint resection is included' },
      { text: 'Open inguinal hernia repair with mesh', answer: 'Supplement' },
      { text: 'Insertion of a dual-chamber pacemaker generator', answer: 'Insertion' },
      { text: 'Bedside change of a gastrostomy tube', answer: 'Change, approach External' },
      { text: 'Mastectomy with immediate implant reconstruction', answer: 'Two codes: Resection and Replacement' },
    ],
    traps: [
      'Coding Change when an incision was made.',
      'Coding a joint resection separately during a joint replacement.',
      'Coding Supplement for something that took over the whole body part.',
    ],
    also: ['insertion-supplement-replacement', 'device-management', 'device-vs-substance'],
  },

  {
    id: 'group-exam',
    title: 'Inspection or Map?',
    question: 'Nothing was treated. Was it looked at, or was its wiring traced?',
    axis: 3, group: 'exam',
    rules: ['B3.11a', 'B3.11b', 'B3.11c'],
    ops: ['Inspection', 'Map'],
    lead: `Two operations where nothing is removed, repaired or implanted.`,
    compare: [
      { name: 'Inspection', char: 'J', means: 'Visually and/or manually exploring a body part.',
        pick: 'Diagnostic scope, exploratory laparotomy.', avoid: 'Anything else was done through the same approach.' },
      { name: 'Map', char: 'K', means: 'Locating the route of electrical impulses or functional areas.',
        pick: 'Cardiac mapping, cortical mapping.', avoid: 'Anything outside the cardiac conduction system and the central nervous system — Map applies nowhere else.' },
    ],
    body: `<h3>Inspection usually disappears</h3>
      <p>An Inspection performed in order to do something else is <b>not coded</b>. A bronchoscopy
        done to irrigate the bronchus is one code: the irrigation. This is the rule that removes
        most Inspection codes from most charts.</p>
      <h3>When it survives</h3>
      <p>Inspection <i>is</i> coded separately when it was done through a <b>different approach</b>
        than the definitive procedure. Endoscopic inspection of the duodenum followed by open
        excision of the duodenum is two codes.</p>
      <h3>Which body part</h3>
      <p>For tubular parts, code the <b>most distal</b> part inspected — cystoureteroscopy of
        bladder and ureters is coded to the ureter. For non-tubular parts in a region, code the
        part that covers the whole area inspected — exploratory laparotomy with general inspection
        of the abdomen is coded to the peritoneal cavity.</p>
      <h3>Abandoned procedures</h3>
      <p>If a procedure is stopped before any other root operation is performed, code Inspection of
        the body part reached. A planned valve replacement abandoned after the thoracotomy is an
        open Inspection of the mediastinum.</p>`,
    examples: [
      { text: 'Bronchoscopy with bronchial irrigation', answer: 'One code — the irrigation only' },
      { text: 'Cystoureteroscopy inspecting bladder and ureters', answer: 'Inspection of Ureter — the most distal' },
      { text: 'Laparotomy abandoned when the patient became unstable', answer: 'Inspection of the region reached' },
    ],
    traps: ['Coding the scope as well as the procedure done through it.'],
    also: ['inspection-when', 'discontinued'],
  },

  {
    id: 'group-repairs',
    title: 'Control or Repair?',
    question: 'Nothing more specific fits. Is it bleeding, or is it a restoration?',
    axis: 3, group: 'repairs',
    rules: ['B3.7'],
    ops: ['Control', 'Repair'],
    lead: `Both are fallbacks, and both are over-used. Reach for either only after ruling out
      every more specific root operation.`,
    compare: [
      { name: 'Control', char: '3', means: 'Stopping, or attempting to stop, <b>postprocedural or other acute bleeding</b>.',
        pick: 'Bleeding was the problem and the method has no more specific name.', avoid: 'A specific root operation describes what was done.' },
      { name: 'Repair', char: 'Q', means: 'Restoring a body part to its normal structure and function.',
        pick: 'Nothing else fits at all. Suture of a laceration, colostomy takedown.', avoid: 'Any other root operation applies — Repair is the last resort.' },
    ],
    body: `<h3>Repair is the root operation of last resort</h3>
      <p>The official explanation is explicit: Repair is "used only when the method to accomplish
        the repair is not one of the other root operations". If you can name what was actually
        done — the hernia was reinforced with mesh (Supplement), the bone was put back in place
        (Reposition) — code that instead.</p>
      <h3>Control gives way to anything more specific</h3>
      <p>Control covers hemostasis achieved by cautery, pressure, suturing or clipping bleeding
        points, beyond what is integral to the procedure. But if a more specific root operation
        describes what was done — Bypass, Excision, Extraction, Reposition, Replacement, Resection,
        Detachment — code that instead. Liquid embolisation of an iliac artery to stop bleeding is
        <b>Occlusion</b>, not Control.</p>
      <p>And routine hemostasis during an operation is not coded at all: suctioning residual blood
        during a cryobiopsy is integral to the biopsy.</p>`,
    examples: [
      { text: 'Silver nitrate cautery for acute epistaxis', answer: 'Control' },
      { text: 'Embolisation of the internal iliac artery to stop bleeding', answer: 'Occlusion — more specific than Control' },
      { text: 'Suction of blood during a biopsy', answer: 'Not coded — integral' },
      { text: 'Suture of a forearm laceration', answer: 'Repair' },
    ],
    traps: [
      'Using Repair as a default when the note is vague. Read the method.',
      'Coding Control when a named operation achieved the hemostasis.',
    ],
  },

  {
    id: 'group-other',
    title: 'Fusion, Alteration or Creation?',
    question: 'The objective does not fit any other family.',
    axis: 3, group: 'other',
    rules: ['B3.10a', 'B3.10b', 'B3.10c'],
    ops: ['Fusion', 'Alteration', 'Creation'],
    lead: `Three operations with objectives of their own.`,
    compare: [
      { name: 'Fusion', char: 'G', means: 'Joining portions of an <b>articular</b> body part, rendering it immobile.',
        pick: 'A joint was made not to move. Spinal fusion, ankle arthrodesis.', avoid: 'A device was put in without the joint being fused — that is Insertion.' },
      { name: 'Alteration', char: '0', means: 'Modifying structure without affecting function.',
        pick: 'The purpose was appearance alone. Face lift, cosmetic breast augmentation.', avoid: 'There was any functional purpose — then it is not Alteration.' },
      { name: 'Creation', char: '4', means: 'Making a <b>new body part</b> that replicates one that is absent.',
        pick: 'Gender reassignment surgery, correcting a congenital absence.', avoid: 'The body part exists and was repaired or replaced.' },
    ],
    body: `<h3>Spinal fusion — how many codes</h3>
      <p>The body part is the <b>level</b> of the spine, and there are separate values for a single
        vertebral joint and for multiple joints at each level. A separate code is needed for each
        vertebral joint that uses a <b>different device or qualifier</b> — so an anterior column
        fusion and a posterior column fusion at the same lumbar level are two codes.</p>
      <h3>Spinal fusion — which device wins</h3>
      <p>When several materials are used on one joint, one device value is coded, in this order:</p>
      <ul>
        <li>An <b>interbody fusion device</b> was used — code Interbody Fusion Device, even if it
          also contains bone graft.</li>
        <li>Bone graft only — code Nonautologous or Autologous Tissue Substitute.</li>
        <li>A <b>mixture</b> of autologous and nonautologous graft — code
          <b>Autologous Tissue Substitute</b>.</li>
      </ul>
      <h3>Alteration is about intent</h3>
      <p>Alteration requires that the procedure had no functional purpose at all. A rhinoplasty to
        improve breathing is not Alteration.</p>`,
    examples: [
      { text: 'L4-L5 fusion, posterior approach, anterior column, cage with morsellised graft', answer: 'Fusion, device Interbody Fusion Device' },
      { text: 'Fusion using both autologous and bone-bank graft', answer: 'Device Autologous Tissue Substitute' },
      { text: 'Anterior and posterior column fusion at one lumbar level', answer: 'Two codes' },
      { text: 'Cosmetic blepharoplasty', answer: 'Alteration' },
    ],
    traps: [
      'Coding one fusion code when two columns were fused.',
      'Coding Autologous Tissue Substitute when a cage was used — the cage wins.',
    ],
    also: ['fusion-how-many'],
  },
  /* ============================================ the individual hard choices */

  {
    id: 'excision-vs-resection',
    title: 'Excision or Resection — all of it, or part of it?',
    question: 'Is every bit of the PCS body-part value gone?',
    axis: 3, diagram: 'excision-resection',
    rules: ['B3.8'],
    ops: ['Excision', 'Resection'],
    lead: `The word in the operative note does not decide this. The <b>body-part value</b> does.`,
    compare: [
      { name: 'Excision', char: 'B', means: 'A <b>portion</b> of the body part was cut out.',
        pick: 'Some of the value remains in the patient.', avoid: 'The value is entirely gone.' },
      { name: 'Resection', char: 'T', means: '<b>All</b> of the body part was cut out.',
        pick: 'Nothing of that value is left.', avoid: 'Any of it remains.' },
    ],
    body: `<h3>Why the body-part value is what matters</h3>
      <p>PCS gives separate body-part values to anatomical subdivisions — the lobes of the lungs
        and liver, the regions of the intestine. Whenever <b>all</b> of one of those specific
        values is cut out, code Resection of that value, rather than Excision of a broader one.</p>
      <p>A left upper lobectomy removes only part of the left lung, so "excision" feels right. But
        <b>Upper Lung Lobe, Left</b> is a body-part value in its own right, and all of it is gone.
        The code is <b>Resection of Upper Lung Lobe, Left</b>.</p>
      <h3>The question to ask, every time</h3>
      <p>Not "how much of the organ came out?" but: <b>is there a body-part value for exactly what
        was removed, and did all of it go?</b> Look at the table's 4th-character list before you
        decide.</p>
      <h3>The other direction</h3>
      <p>If what was removed has no value of its own — a wedge of liver that is not a segment, a
        lesion in the middle of a muscle — then only part of the value that does exist was taken,
        and it is Excision.</p>`,
    examples: [
      { text: 'Left upper lobectomy', answer: 'Resection of Upper Lung Lobe, Left — not Excision of Lung, Left' },
      { text: 'Right hemicolectomy', answer: 'Resection — the ascending colon value is entirely removed' },
      { text: 'Wedge resection of lung, not a whole lobe', answer: 'Excision' },
      { text: 'Total abdominal hysterectomy', answer: 'Resection of Uterus' },
      { text: 'Segmental resection of the ileum', answer: 'Excision of Ileum — part of the value only' },
    ],
    traps: [
      'Trusting the surgeon\'s noun. "Partial resection" is very often Excision; "excisional biopsy of the lobe" may be Resection.',
      'Not opening the table to see which body-part values exist before choosing.',
    ],
    also: ['group-takeout', 'bodypart-no-value'],
  },

  {
    id: 'graft-harvest',
    title: 'A graft was taken from somewhere else — is that a second code?',
    question: 'Did the autograft come from a different site, and does the 7th character already name that site?',
    axis: 0, diagram: 'graft-harvest',
    rules: ['B3.9'],
    ops: ['Replacement', 'Supplement', 'Bypass', 'Creation', 'Fusion'],
    lead: `Usually yes — harvesting tissue from a second site is its own procedure with its own
      code. There is exactly one exception, and it is written into the table.`,
    compare: [
      { name: 'Code the harvest separately', char: '+',
        means: 'The autograft came from a <b>different procedure site</b>.',
        pick: 'Add an Excision (or Resection) code for the site the graft came from.',
        avoid: 'The 7th character of the main code already names the harvest site.' },
      { name: 'Do not code it', char: '−',
        means: 'The 7th character <b>qualifier fully specifies</b> where the graft was taken from.',
        pick: 'One code only — the harvest is already described in it.',
        avoid: 'The qualifier says nothing about the donor site.' },
    ],
    body: `<h3>The rule</h3>
      <p>If an autograft is obtained from a different procedure site in order to complete the
        objective of the procedure, a separate procedure is coded — <b>except</b> when the seventh
        character qualifier value in the table fully specifies the site the autograft came from.</p>
      <h3>The two worked cases, from the guideline itself</h3>
      <ul>
        <li><b>Coronary bypass using saphenous vein.</b> The vein was harvested from the leg. The
          bypass code's qualifier names the vessel bypassed <i>from</i> (the aorta), not the leg,
          so the excision of the saphenous vein <b>is</b> coded separately.</li>
        <li><b>Breast replacement with a DIEP flap.</b> The Replacement table has a 7th-character
          qualifier <i>Deep Inferior Epigastric Artery Perforator Flap</i>. That names the harvest
          site, so the excision of the flap is <b>not</b> coded separately.</li>
      </ul>
      <h3>How to check, in the tool</h3>
      <p>Open the table for the main procedure and read the 7th-character column. If a qualifier
        names the donor tissue or donor site, you have your answer. If the qualifiers are only
        things like <i>No Qualifier</i>, <i>Diagnostic</i> or destination body parts, the harvest
        is a separate code.</p>
      <h3>How many sources</h3>
      <p>Where graft material came from more than one site, each harvest that is not covered by a
        qualifier is its own Excision code, with its own body part. The device value on the main
        code describes what the material <b>is</b> — autologous, nonautologous, synthetic or
        zooplastic — not where it came from.</p>`,
    examples: [
      { text: 'CABG with saphenous vein harvested from the left leg', answer: 'Two codes: the Bypass, plus Excision of Greater Saphenous Vein, Left' },
      { text: 'Breast reconstruction with a DIEP flap', answer: 'One code — the qualifier names the flap' },
      { text: 'Spinal fusion using iliac crest bone graft', answer: 'Separate Excision of the iliac bone, unless a qualifier names it' },
      { text: 'Skin graft using skin taken from the thigh', answer: 'Replacement of the recipient site plus Excision of the donor skin' },
    ],
    traps: [
      'Missing the harvest code entirely — it is one of the most commonly dropped codes on a CABG account.',
      'Coding the harvest when the qualifier already covers it, which double-counts the work.',
    ],
    also: ['grafts', 'group-device'],
  },

  {
    id: 'grafts',
    title: 'Graft material — which device value, and which root operation?',
    question: 'What is the material, and what is it doing for the body part?',
    axis: 6, diagram: 'graft-materials',
    rules: ['B6.1a', 'B3.9'],
    ops: ['Replacement', 'Supplement', 'Transfer', 'Reposition', 'Reattachment'],
    lead: `Two independent choices, often muddled into one: the <b>root operation</b> says what the
      graft does, and the <b>6th character device</b> says what it is made of.`,
    compare: [
      { name: 'Autologous Tissue Substitute', char: '7',
        means: 'Tissue from the <b>same patient</b>.',
        pick: 'Saphenous vein, iliac bone graft, the patient\'s own fascia.',
        avoid: 'It came from anyone or anything else.' },
      { name: 'Nonautologous Tissue Substitute', char: 'K',
        means: 'Human tissue from <b>someone else</b> — cadaver or donor.',
        pick: 'Bone bank bone, cadaveric dermis.',
        avoid: 'It came from an animal — that is Zooplastic.' },
      { name: 'Zooplastic Tissue', char: '8',
        means: 'Tissue of <b>animal</b> origin.',
        pick: 'Porcine or bovine valve, porcine dermal matrix.',
        avoid: 'It is manufactured rather than biological.' },
      { name: 'Synthetic Substitute', char: 'J',
        means: 'Manufactured, <b>nonbiological</b> material.',
        pick: 'Polypropylene mesh, metal and polyethylene joint components, Dacron graft.',
        avoid: 'Any part of it is biological tissue.' },
    ],
    body: `<h3>Step one: what is the graft doing?</h3>
      <ul>
        <li>It <b>takes the place of</b> the body part — <b>Replacement</b>.</li>
        <li>It <b>reinforces</b> a body part that is still there — <b>Supplement</b>.</li>
        <li>It is the patient's own tissue, <b>still attached</b> to its blood supply and moved to
          do another job — <b>Transfer</b>.</li>
      </ul>
      <h3>Step two: what is it made of?</h3>
      <p>That is the 6th character, from the four values above. The device value never tells you
        where the tissue was harvested; that is a separate question, answered by
        <a href="#/card/graft-harvest">the harvest rule</a>.</p>
      <h3>A mixture</h3>
      <p>Where autologous and nonautologous material are mixed, the general principle the
        guidelines set out for spinal fusion is to code <b>Autologous Tissue Substitute</b>. For
        any joint being fused, an interbody fusion device outranks both.</p>
      <h3>When a value does not appear in the table</h3>
      <p>The Device Aggregation Table maps the specific device names used in some body systems onto
        the general value to use where the specific one is not offered. It is in
        <a href="#/keys?k=agg">Reference keys</a>.</p>`,
    examples: [
      { text: 'Hernia repair with polypropylene mesh', answer: 'Supplement with Synthetic Substitute' },
      { text: 'Aortic valve replacement with a porcine valve', answer: 'Replacement with Zooplastic Tissue' },
      { text: 'Aortic valve replacement with a mechanical valve', answer: 'Replacement with Synthetic Substitute' },
      { text: 'Mitral valve annuloplasty ring', answer: 'Supplement — the valve is still the patient\'s' },
      { text: 'Fusion with the patient\'s own bone plus bone-bank bone', answer: 'Autologous Tissue Substitute' },
    ],
    traps: [
      'Coding Replacement for an annuloplasty ring. The native valve remains, so it is Supplement.',
      'Choosing the device value from where the graft was harvested instead of what it is.',
    ],
    also: ['graft-harvest', 'insertion-supplement-replacement', 'device-vs-substance'],
  },

  {
    id: 'insertion-supplement-replacement',
    title: 'Insertion, Supplement or Replacement?',
    question: 'What does the material do to the body part — a job of its own, a prop, or a substitution?',
    axis: 3, diagram: 'device-ops',
    rules: ['B6.1a'],
    ops: ['Insertion', 'Supplement', 'Replacement'],
    lead: `All three put something in. The difference is the relationship between the material and
      the body part.`,
    compare: [
      { name: 'Insertion', char: 'H',
        means: 'A <b>nonbiological appliance</b> that monitors, assists, performs or prevents a function, and does <b>not</b> take the place of a body part.',
        pick: 'Pacemaker, infusion device, radioactive implant, internal fixation pin.',
        avoid: 'It takes over the body part\'s structure.' },
      { name: 'Supplement', char: 'U',
        means: 'Material that <b>reinforces or augments</b> a portion of a body part.',
        pick: 'The body part is still there and still working, with help.',
        avoid: 'The body part is gone or has been rendered nonfunctional.' },
      { name: 'Replacement', char: 'R',
        means: 'Material that <b>physically takes the place</b> of all or part of a body part.',
        pick: 'The body part has been taken out, eradicated, or rendered nonfunctional.',
        avoid: 'The body part is still doing its job.' },
    ],
    body: `<h3>A single test</h3>
      <p>Take the material away again in your head. If the body part would work as before —
        <b>Insertion</b>, the appliance was doing its own job. If the body part would be weak but
        present — <b>Supplement</b>. If there is nothing left to work — <b>Replacement</b>.</p>
      <h3>The hip, three ways</h3>
      <ul>
        <li>A pin through a fractured femoral neck: <b>Insertion</b> of an internal fixation device.</li>
        <li>A new acetabular liner in an existing hip prosthesis: <b>Supplement</b>.</li>
        <li>A total hip prosthesis: <b>Replacement</b> — and the joint resection that made room for
          it is included, not coded separately.</li>
      </ul>`,
    examples: [
      { text: 'Insertion of a tunnelled central venous catheter', answer: 'Insertion' },
      { text: 'Onlay mesh over a weak abdominal wall', answer: 'Supplement' },
      { text: 'Total hip arthroplasty', answer: 'Replacement' },
    ],
    traps: ['Coding fixation hardware as Supplement. Hardware that holds bone in place is Insertion.'],
    also: ['group-device', 'grafts'],
  },

  {
    id: 'device-management',
    title: 'Change, Removal, Revision or Replacement of a device?',
    question: 'The device was already there. What happened to it, and was anything cut?',
    axis: 3, diagram: 'device-ops',
    rules: ['B6.1a', 'B6.1c'],
    ops: ['Change', 'Removal', 'Revision', 'Replacement'],
    lead: `Four operations on a device that is already in the patient.`,
    compare: [
      { name: 'Change', char: '2', means: 'Out and an identical or similar one back in, <b>without cutting or puncturing</b>.',
        pick: 'Approach is always External.', avoid: 'Skin or mucous membrane was cut.' },
      { name: 'Removal', char: 'P', means: 'The device came <b>out</b>.',
        pick: 'Explant, with nothing put back, or with a new one placed through an incision.', avoid: 'Nothing was cut and a similar device went straight back.' },
      { name: 'Revision', char: 'W', means: 'A <b>malfunctioning or displaced</b> device was corrected.',
        pick: 'Repositioning a lead, recementing a prosthesis, swapping a component.', avoid: 'The whole device was taken out and a new one put in.' },
      { name: 'Replacement', char: 'R', means: 'Material takes the place of a <b>body part</b>.',
        pick: 'This is about the body part, not about a device.', avoid: 'You are describing work on an appliance.' },
    ],
    body: `<h3>Change is a narrow door</h3>
      <p>Everything about Change follows from "without cutting or puncturing the skin or a mucous
        membrane". That is why the approach is always <b>External</b>, and why a device swapped
        through an incision is instead <b>Removal + Insertion</b>, two codes.</p>
      <h3>Revision or Removal-and-Insertion?</h3>
      <p>Revision corrects <i>a portion of</i> a device, or its position. If the entire device came
        out and a new one went in, that is Removal and Insertion.</p>
      <h3>Procedures on the device only</h3>
      <p>Where the procedure is performed on the device and not on a body part at all, PCS provides
        Change, Irrigation, Removal and Revision. Irrigating a nephrostomy tube is
        <b>Irrigation of indwelling device</b> in the Administration section, not a procedure on
        the kidney.</p>`,
    examples: [
      { text: 'Bedside exchange of a Foley catheter', answer: 'Change, approach External' },
      { text: 'Pacemaker generator changed through the old pocket incision', answer: 'Removal and Insertion — two codes' },
      { text: 'Repositioning a displaced pacemaker lead', answer: 'Revision' },
      { text: 'Flushing a percutaneous nephrostomy tube', answer: 'Irrigation of indwelling device, Administration section' },
    ],
    traps: ['Coding Change for anything done through an incision.'],
    also: ['group-device'],
  },

  {
    id: 'device-vs-substance',
    title: 'Is it a device at all?',
    question: 'Did something remain in the patient when the procedure ended?',
    axis: 6,
    rules: ['B6.1a', 'B6.1b', 'B6.1c'],
    lead: `The 6th character is only a device if something was left behind. If nothing remained,
      the answer is <b>No Device</b>.`,
    compare: [
      { name: 'Device', char: '—',
        means: 'Remains in or on the body <b>after</b> the procedure is finished.',
        pick: 'Mesh, prosthesis, pacemaker, stent, drainage device.',
        avoid: 'It was taken out again before the end.' },
      { name: 'No Device', char: 'Z',
        means: 'Nothing was left behind.',
        pick: 'Most operations. Z is not a failure to find a device — it is a statement.',
        avoid: 'Something did remain.' },
      { name: 'Substance', char: '—',
        means: 'Something <b>given</b>, not implanted — Administration section, 6th character.',
        pick: 'Drugs, blood products, contrast, cells.',
        avoid: 'It stays as a physical appliance.' },
      { name: 'Equipment', char: '—',
        means: 'A machine used <b>on</b> the patient, never coded as a device.',
        pick: 'Ventilator, dialysis machine, imaging equipment.',
        avoid: 'It was implanted.' },
    ],
    body: `<h3>What is never a device</h3>
      <p>Sutures, ligatures, radiological markers and temporary post-operative wound drains are
        integral to performing a procedure and are <b>not</b> coded as devices. This is the single
        most common source of a wrongly non-Z 6th character.</p>
      <h3>Devices that come out again</h3>
      <p>If a device intended to stay has to be removed before the end of the same operative
        episode, code <b>both</b> the insertion and the removal.</p>
      <p>A small number of root operations offer the qualifiers <b>Temporary</b> and
        <b>Intraoperative</b> for clinically significant devices used only briefly.</p>
      <h3>Device, substance, equipment</h3>
      <p>The CMS ICD-10-PCS Reference Manual separates the three by what happens to them: a device
        stays, a substance is absorbed or dispersed, equipment never enters the patient at all.
        <i>The Reference Manual is CMS's FY2016 edition; where it and the FY2027 guidelines differ,
        the guidelines apply.</i></p>`,
    examples: [
      { text: 'Appendectomy closed with sutures', answer: 'No Device — sutures are not devices' },
      { text: 'Angioplasty with a drug-eluting stent', answer: 'Intraluminal Device' },
      { text: 'Angioplasty with no stent', answer: 'No Device' },
      { text: 'Wound closed over a temporary drain', answer: 'No Device — a temporary wound drain is integral' },
    ],
    traps: [
      'Coding sutures or a wound drain as a device.',
      'Reading Z as "not documented". Z means nothing remained.',
    ],
    also: ['grafts', 'z-values'],
  },

  {
    id: 'bypass-direction',
    title: 'Bypass — which end is the body part?',
    question: 'Which vessel is the 4th character, and which is the 7th?',
    axis: 4, diagram: 'bypass',
    rules: ['B3.6a', 'B3.6b', 'B3.6c'],
    ops: ['Bypass'],
    lead: `For every bypass except the coronary arteries: 4th character is <b>from</b>, 7th is
      <b>to</b>. Coronary bypass reverses it.`,
    compare: [
      { name: 'Every other bypass', char: '→',
        means: '4th character = bypassed <b>from</b>. 7th character = bypassed <b>to</b>.',
        pick: 'Stomach to jejunum: body part Stomach, qualifier Jejunum.',
        avoid: 'Reading the qualifier as the source.' },
      { name: 'Coronary bypass', char: '⇄',
        means: '4th character = the <b>number of coronary arteries bypassed to</b>. 7th character = the vessel bypassed <b>from</b>.',
        pick: 'LAD and OM from the aorta: body part Two Arteries, qualifier Aorta.',
        avoid: 'Coding the aorta as the body part.' },
    ],
    body: `<h3>Why coronary bypass is different</h3>
      <p>Everywhere else in PCS, the body part is where the procedure was done. In coronary bypass
        the classification instead counts <b>how many coronary arteries received a graft</b>, and
        uses the qualifier to say where the blood is coming from. There is no body-part value for
        "left anterior descending" in the bypass table — only One Artery, Two Arteries, Three
        Arteries, Four or More Arteries.</p>
      <h3>Counting, and how many codes</h3>
      <p>Count the <b>coronary arteries bypassed to</b>, not the number of grafts and not the number
        of anastomoses. Then: a separate code is needed for each coronary artery that uses a
        <b>different device or qualifier</b>. Two vein grafts from the aorta to two arteries is one
        code for Two Arteries. A LIMA graft plus an aortocoronary vein graft is two codes, because
        the qualifiers differ.</p>
      <h3>The graft itself</h3>
      <p>The device value describes the graft material. And if the vein was harvested from the leg,
        that harvest is <a href="#/card/graft-harvest">a separate code</a>.</p>`,
    examples: [
      { text: 'Aortocoronary bypass to LAD and OM, both saphenous vein', answer: 'One code: Two Arteries, qualifier Aorta' },
      { text: 'LIMA to LAD, plus aortocoronary vein graft to RCA', answer: 'Two codes — different qualifiers' },
      { text: 'Gastrojejunostomy', answer: 'Body part Stomach, qualifier Jejunum' },
      { text: 'Femoral-popliteal bypass', answer: 'Body part Femoral Artery, qualifier Popliteal Artery' },
    ],
    traps: [
      'Using the aorta as the body part in a coronary bypass.',
      'Counting grafts instead of arteries bypassed to.',
      'Forgetting the saphenous vein harvest code.',
    ],
    also: ['group-tubular', 'bodypart-coronary', 'graft-harvest'],
  },

  {
    id: 'detachment-levels',
    title: 'Detachment — which body part, and which level qualifier?',
    question: 'Where was the limb cut, and how does that map to a qualifier?',
    axis: 7, diagram: 'detachment',
    rules: ['B3.19'],
    ops: ['Detachment'],
    lead: `The body part is <b>the site of the detachment</b>, and the qualifier says how far along
      that site the cut was made. The qualifier values mean different things depending on the
      body part.`,
    body: `<h3>Body part first</h3>
      <p>Code the body part value that describes <b>where the extremity was cut</b>, from the
        Anatomical Regions, Upper Extremities or Anatomical Regions, Lower Extremities body system.
        An amputation through the proximal tibia and fibula is coded to <b>Lower Leg</b>, not to
        the knee and not to the foot.</p>
      <h3>Then the qualifier — and it changes meaning by body part</h3>
      <p>This table is printed as a grid in the official guidelines and is reproduced here in full.
        The values are shown as they appear in the FY2027 tables.</p>
      <table class="qualgrid">
        <thead><tr><th>Body part</th><th>Qualifier</th><th>What it means</th></tr></thead>
        <tbody>
          <tr><td rowspan="3">Upper arm, upper leg</td><td class="mono">1</td><td><b>High</b> — through the proximal shaft of the humerus or femur</td></tr>
          <tr><td class="mono">2</td><td><b>Mid</b> — through the middle of the shaft</td></tr>
          <tr><td class="mono">3</td><td><b>Low</b> — through the distal shaft</td></tr>

          <tr><td rowspan="3">Lower arm, lower leg</td><td class="mono">1</td><td><b>High</b> — through the proximal shaft of the radius/ulna or tibia/fibula</td></tr>
          <tr><td class="mono">2</td><td><b>Mid</b> — through the middle of the shaft</td></tr>
          <tr><td class="mono">3</td><td><b>Low</b> — through the distal shaft</td></tr>

          <tr><td rowspan="11">Hand, foot</td><td class="mono">0</td><td><b>Complete</b> — through the carpometacarpal joint of the hand, or the tarsometatarsal joint of the foot</td></tr>
          <tr><td class="mono">4</td><td>Complete 1st ray</td></tr>
          <tr><td class="mono">5</td><td>Complete 2nd ray</td></tr>
          <tr><td class="mono">6</td><td>Complete 3rd ray</td></tr>
          <tr><td class="mono">7</td><td>Complete 4th ray</td></tr>
          <tr><td class="mono">8</td><td>Complete 5th ray</td></tr>
          <tr><td class="mono">9</td><td>Partial 1st ray</td></tr>
          <tr><td class="mono">B</td><td>Partial 2nd ray</td></tr>
          <tr><td class="mono">C</td><td>Partial 3rd ray</td></tr>
          <tr><td class="mono">D</td><td>Partial 4th ray</td></tr>
          <tr><td class="mono">F</td><td>Partial 5th ray</td></tr>

          <tr><td rowspan="4">Finger, toe (2nd–5th)</td><td class="mono">0</td><td><b>Complete</b> — at the metacarpophalangeal or metatarsophalangeal joint</td></tr>
          <tr><td class="mono">1</td><td><b>High</b> — anywhere along the proximal phalanx</td></tr>
          <tr><td class="mono">2</td><td><b>Mid</b> — through the proximal interphalangeal joint or along the middle phalanx</td></tr>
          <tr><td class="mono">3</td><td><b>Low</b> — through the distal interphalangeal joint or along the distal phalanx</td></tr>

          <tr><td rowspan="3">Thumb, 1st toe</td><td class="mono">0</td><td><b>Complete</b></td></tr>
          <tr><td class="mono">1</td><td><b>High</b></td></tr>
          <tr><td class="mono">3</td><td><b>Low</b> — there is no Mid</td></tr>

          <tr><td>Forequarter, hindquarter, shoulder, elbow, femoral, knee region</td>
              <td class="mono">Z</td><td><b>No Qualifier</b> — these regions take no level</td></tr>
        </tbody>
      </table>
      <p class="sourcenote">Set out from ICD-10-PCS Official Guidelines FY2027, B3.19, and
        checked character by character against tables <b>0X6</b> and <b>0Y6</b> in the FY2027
        tables, which are what actually govern. Confirm against the table you are coding from.</p>
      <h3>Two things the printed grid does not tell you</h3>
      <p>The <b>thumb and the 1st toe have no Mid value</b>. They have two phalanges rather than
        three, so there is no proximal interphalangeal joint and no middle phalanx for a Mid
        amputation to pass through. The tables offer only 0, 1 and 3 for those body parts.</p>
      <p>The <b>whole-region body parts take Z</b>. Forequarter, hindquarter, shoulder region,
        elbow region, femoral region and knee region are disarticulations at a joint, so there is
        no shaft to be High, Mid or Low along.</p>
      <h3>Ray amputations</h3>
      <p>A "ray" is a metatarsal or metacarpal together with its toe or finger. <b>Complete</b> ray
        means through the whole ray; <b>partial</b> means along the shaft or head of the metacarpal
        or metatarsal bone. Note that the ray qualifiers belong to the <b>hand and foot</b> body
        parts, not to the finger or toe body parts.</p>`,
    examples: [
      { text: 'Below-knee amputation through the proximal tibial shaft', answer: 'Detachment of Lower Leg, qualifier High' },
      { text: 'Fifth toe ray amputation, complete', answer: 'Detachment of Foot, qualifier Complete 5th Ray' },
      { text: 'Amputation through the distal interphalangeal joint of the index finger', answer: 'Detachment of Index Finger, qualifier Low' },
      { text: 'Shoulder disarticulation', answer: 'Detachment of Shoulder Region, qualifier Z — no level applies' },
      { text: 'Amputation through the middle phalanx of the thumb', answer: 'Impossible — the thumb has no middle phalanx. Re-read the note.' },
    ],
    traps: [
      'Reading "High/Mid/Low" as a position on the limb rather than on the named bone shaft.',
      'Using a hand/foot qualifier meaning when the body part is a finger or toe — the same digits mean different things. On the hand, 4 is Complete 1st Ray; on a finger, 4 does not exist at all.',
      'Looking for a Mid value on the thumb or great toe.',
    ],
    also: ['group-takeout'],
  },

  {
    id: 'occlusion-vs-restriction',
    title: 'Occlusion or Restriction for an embolisation?',
    question: 'Was the objective to close the vessel completely, or to narrow it?',
    axis: 3, diagram: 'tubular',
    rules: ['B3.12'],
    ops: ['Occlusion', 'Restriction'],
    lead: `The material used is the same. The <b>objective</b> is what separates them.`,
    body: `<h3>The rule</h3>
      <p>If the objective is to <b>completely close</b> a vessel, code Occlusion. If the objective
        is to <b>narrow the lumen</b>, code Restriction.</p>
      <h3>The two canonical cases</h3>
      <ul>
        <li><b>Tumour embolisation</b> is Occlusion — the point is to cut off the blood supply
          entirely.</li>
        <li><b>Cerebral aneurysm coiling</b> is Restriction — the point is not to close the vessel
          but to narrow the abnormally wide segment at the aneurysm.</li>
      </ul>
      <h3>When it is bleeding</h3>
      <p>Stopping acute bleeding by embolising a vessel is still Occlusion, not Control, because
        Occlusion is the more specific root operation.</p>`,
    examples: [
      { text: 'Uterine artery embolisation for fibroids', answer: 'Occlusion' },
      { text: 'Coiling of a berry aneurysm', answer: 'Restriction' },
      { text: 'Fallopian tube ligation', answer: 'Occlusion' },
      { text: 'Nissen fundoplication', answer: 'Restriction' },
    ],
    traps: ['Coding Control for an embolisation done to stop bleeding.'],
    also: ['group-tubular', 'control-vs-definitive'],
  },

  {
    id: 'control-vs-definitive',
    title: 'Control, or something more specific?',
    question: 'Bleeding was stopped. Does a named root operation describe how?',
    axis: 3,
    rules: ['B3.7'],
    ops: ['Control'],
    lead: `Control is for hemostasis that has no better name. If a specific root operation fits,
      it wins.`,
    body: `<h3>The order to work in</h3>
      <ol>
        <li>Was the hemostasis <b>integral</b> to the procedure being done? Then it is not coded at
          all — suctioning residual blood during a biopsy, for example.</li>
        <li>Does a <b>more specific</b> root operation describe it — Bypass, Detachment, Excision,
          Extraction, Reposition, Replacement, Resection, or Occlusion? Then code that.</li>
        <li>Otherwise, and only otherwise, code <b>Control</b>: cautery, application of substances
          or pressure, suturing or ligation or clipping of bleeding points at the site.</li>
      </ol>`,
    examples: [
      { text: 'Silver nitrate cautery for nasal bleeding', answer: 'Control' },
      { text: 'Liquid embolisation of the internal iliac artery for acute haematoma', answer: 'Occlusion' },
      { text: 'Splenectomy to stop bleeding from a ruptured spleen', answer: 'Resection' },
      { text: 'Suctioning blood during a cryobiopsy', answer: 'Not coded — integral' },
    ],
    traps: ['Adding Control alongside the operation that actually stopped the bleeding.'],
    also: ['group-repairs', 'integral-components'],
  },

  {
    id: 'inspection-when',
    title: 'When does an Inspection get its own code?',
    question: 'Was the scope the whole procedure, or the way in?',
    axis: 0,
    rules: ['B3.11a', 'B3.11b', 'B3.11c', 'B3.3'],
    ops: ['Inspection'],
    lead: `Most inspections disappear into the procedure they enabled. Three situations keep them.`,
    body: `<h3>Not coded</h3>
      <p>An Inspection performed <b>in order to achieve the objective</b> of another procedure is
        not coded. A bronchoscopy done to irrigate the bronchus is the irrigation, and nothing
        else.</p>
      <h3>Coded separately</h3>
      <p>When the Inspection used a <b>different approach</b> from the definitive procedure.
        Endoscopic inspection of the duodenum plus open excision of the duodenum is two codes.</p>
      <h3>Coded as the whole procedure</h3>
      <p>When a procedure is <b>discontinued</b> before any other root operation is performed, code
        Inspection of the body part or region reached. A valve replacement abandoned after the
        thoracotomy but before the heart was opened is an open Inspection of the mediastinum.</p>
      <h3>Which body part to inspect</h3>
      <p>Tubular parts: the <b>most distal</b> one reached. Non-tubular parts in a region: the value
        that covers the whole area — the peritoneal cavity for a general abdominal exploration.</p>`,
    examples: [
      { text: 'Diagnostic colonoscopy, nothing found', answer: 'Inspection of the most distal part reached' },
      { text: 'Colonoscopy with polypectomy', answer: 'Excision only — the scope is not coded' },
      { text: 'Laparoscopic look, converted to open resection', answer: 'Percutaneous endoscopic Inspection plus open Resection' },
    ],
    traps: ['Coding the endoscopy alongside the therapy done through it.'],
    also: ['group-exam', 'discontinued', 'how-many-codes'],
  },

  {
    id: 'fusion-how-many',
    title: 'Spinal fusion — how many codes, and which device?',
    question: 'How many joints, how many columns, and what was used to fuse them?',
    axis: 0, diagram: 'spine-columns',
    rules: ['B3.10a', 'B3.10b', 'B3.10c'],
    ops: ['Fusion'],
    lead: `Three separate decisions, each with its own rule.`,
    body: `<h3>1. The body part is the level, not the vertebra</h3>
      <p>Fusion body parts are spinal <b>levels</b> — cervical, thoracic, lumbar, and the junctions.
        At each level there are distinct values for a <b>single</b> vertebral joint and for
        <b>2 or more</b> vertebral joints. Fusing L3-L4 and L4-L5 is two joints, so the value is
        Lumbar Vertebral Joints, 2 or More — one code, not two.</p>
      <h3>2. A separate code for each differing device or qualifier</h3>
      <p>A separate procedure is coded for each vertebral joint that uses a <b>different device
        and/or qualifier</b>. The qualifier carries the column — anterior or posterior — and the
        approach direction. So an anterior column fusion and a posterior column fusion at the same
        level are <b>two codes</b>.</p>
      <h3>3. The device hierarchy</h3>
      <p>When several materials are used on the same joint, one device value is coded:</p>
      <ol>
        <li>An <b>interbody fusion device</b> was used to render the joint immobile — code
          <b>Interbody Fusion Device</b>, even if it contains bone graft or graft substitute.</li>
        <li><b>Bone graft only</b> — code Nonautologous Tissue Substitute or Autologous Tissue
          Substitute, as applicable.</li>
        <li>A <b>mixture</b> of autologous and nonautologous graft, with or without extenders or
          binders — code <b>Autologous Tissue Substitute</b>.</li>
      </ol>
      <p>A bone dowel made of cadaver bone and packed with local bone and demineralised bone matrix
        is still an interbody fusion device, so rule 1 applies.</p>`,
    examples: [
      { text: 'L4-L5 and L5-S1 posterior fusion, one cage each', answer: 'Two levels involved — check the level values; device Interbody Fusion Device' },
      { text: 'ALIF plus posterior instrumented fusion at L4-L5', answer: 'Two codes — different qualifiers (anterior and posterior column)' },
      { text: 'Fusion with local autograft and bone-bank bone', answer: 'Autologous Tissue Substitute' },
    ],
    traps: [
      'Coding one code per vertebra. The value already covers "2 or more joints" at a level.',
      'Coding the graft rather than the cage when both were used.',
    ],
    also: ['group-other', 'how-many-codes'],
  },

  {
    id: 'how-many-codes',
    title: 'Is this one code or several?',
    question: 'Did the objectives, the body parts, or the approach change?',
    axis: 0,
    rules: ['B3.2', 'B3.1b', 'B3.4b', 'B3.18'],
    lead: `Four situations produce more than one code, and one large category produces fewer than
      coders expect.`,
    body: `<h3>Code more than once when</h3>
      <ol>
        <li>The <b>same root operation</b> is performed on <b>different body parts</b>, as defined by
          distinct body-part values. Diagnostic excision of liver and of pancreas: two codes.</li>
        <li>The same root operation is repeated on body parts that are <b>separate and distinct</b>
          but share one PCS value. Excision of the sartorius and of the gracilis are both "upper leg
          muscle": two codes. Extraction of several toenails: one code each.</li>
        <li><b>Multiple root operations with distinct objectives</b> on the same body part.
          Destruction of a sigmoid lesion plus bypass of the sigmoid colon: two codes.</li>
        <li>The intended operation was attempted by one approach and <b>converted</b> to another.
          A laparoscopic cholecystectomy converted to open is a percutaneous endoscopic
          <b>Inspection</b> plus an open <b>Resection</b>.</li>
      </ol>
      <h3>Also two codes</h3>
      <ul>
        <li>A <b>biopsy followed by more definitive treatment</b> at the same site — both are coded.
          Breast biopsy then partial mastectomy: two codes.</li>
        <li>An <b>excision or resection followed by a replacement</b> — both, because the objectives
          are distinct. Unless the removal was purely preparatory, as when a joint or valve is
          resected to make room for its own replacement.</li>
      </ul>
      <h3>Do not code separately</h3>
      <p>Anything named in the root operation's own definition or explanation as integral to it,
        and the steps taken to <b>reach and close</b> the site — including an anastomosis of a
        tubular body part. The laparotomy that reached an open liver biopsy is not coded. The
        anastomosis after a sigmoid resection is not coded.</p>`,
    examples: [
      { text: 'Lap chole converted to open', answer: 'Two codes: percutaneous endoscopic Inspection and open Resection' },
      { text: 'Excision of two separate upper-leg muscles', answer: 'Two codes, same body-part value' },
      { text: 'Sigmoid resection with anastomosis', answer: 'One code — the anastomosis is included' },
      { text: 'Breast biopsy then partial mastectomy, same site', answer: 'Two codes' },
    ],
    traps: [
      'Coding the anastomosis, the laparotomy, or the closure.',
      'Coding only the open procedure after a conversion, and losing the Inspection.',
    ],
    also: ['integral-components', 'biopsy-then-definitive', 'inspection-when'],
  },

  {
    id: 'biopsy-then-definitive',
    title: 'Biopsy, then treatment — both, or just the treatment?',
    question: 'Was a diagnostic sample taken before the definitive procedure at the same site?',
    axis: 0,
    rules: ['B3.4a', 'B3.4b'],
    ops: ['Excision', 'Extraction', 'Drainage'],
    lead: `Both are coded. This is one of the most frequently under-coded situations in an
      inpatient chart.`,
    body: `<h3>There is no root operation "Biopsy"</h3>
      <p>A biopsy is <b>Excision</b>, <b>Extraction</b> or <b>Drainage</b>, with the qualifier
        <b>Diagnostic</b>. Which one depends on how the tissue was obtained:</p>
      <ul>
        <li>Cut out with a blade or needle core — <b>Excision</b>.</li>
        <li>Pulled, stripped or aspirated as tissue — <b>Extraction</b> (bone marrow biopsy).</li>
        <li>Fluid aspirated — <b>Drainage</b> (fine needle aspiration of a pleural effusion).</li>
        <li>Removal of one or more lymph nodes for sampling — <b>Excision</b>, Diagnostic.</li>
      </ul>
      <h3>And then the treatment</h3>
      <p>If a diagnostic Excision, Extraction or Drainage is followed by a more definitive procedure
        — Destruction, Excision or Resection — at the same site, <b>both</b> are coded.</p>`,
    examples: [
      { text: 'Frozen-section breast biopsy then partial mastectomy', answer: 'Two codes' },
      { text: 'Sentinel node sampling', answer: 'Excision, qualifier Diagnostic' },
      { text: 'FNA of a lung nodule yielding fluid', answer: 'Drainage, qualifier Diagnostic' },
    ],
    traps: ['Dropping the biopsy because "it was the same site".'],
    also: ['group-takeout', 'how-many-codes'],
  },

  {
    id: 'transplant-vs-administration',
    title: 'Transplantation, or the Administration section?',
    question: 'Was it a functioning body part, or cells?',
    axis: 1,
    rules: ['B3.16'],
    ops: ['Transplantation'],
    lead: `A mature, functioning body part from another individual or animal is Transplantation.
      Cells are not.`,
    body: `<h3>The rule</h3>
      <p>Putting in a <b>mature and functioning living body part</b> taken from another individual
        or animal is Transplantation. Putting in autologous or nonautologous <b>cells</b> is coded
        to the <b>Administration</b> section (section 3).</p>
      <p>Bone marrow, pancreatic islet cells and stem cells are all cells. A "bone marrow
        transplant" is, in PCS, an Administration procedure — the everyday name is misleading.</p>`,
    examples: [
      { text: 'Allogeneic stem cell transplant', answer: 'Administration section' },
      { text: 'Cadaveric renal transplant', answer: 'Transplantation' },
      { text: 'Pancreatic islet cell infusion', answer: 'Administration section' },
    ],
    traps: ['Coding a "bone marrow transplant" in section 0.'],
    also: ['group-putback', 'section-choice'],
  },

  {
    id: 'excision-then-replacement',
    title: 'Removal then replacement — one objective or two?',
    question: 'Was the removal preparatory, or an objective in its own right?',
    axis: 0,
    rules: ['B3.18'],
    ops: ['Excision', 'Resection', 'Replacement'],
    lead: `Code both, unless taking the body part out was simply how room was made for the thing
      replacing it.`,
    body: `<h3>Both are coded</h3>
      <p>When an excision or resection is followed by a replacement, both are coded, to capture each
        distinct objective:</p>
      <ul>
        <li>Mastectomy followed by reconstruction — Resection and Replacement of the breast.</li>
        <li>Maxillectomy with obturator reconstruction — Excision and Replacement of the maxilla.</li>
        <li>Excisional debridement of tendon with skin graft — Excision of the tendon and
          Replacement of the skin.</li>
        <li>Oesophagectomy with colonic interposition — Resection and Transfer.</li>
      </ul>
      <h3>The exception: preparatory removal</h3>
      <p>Where the removal is <b>integral and preparatory</b> to the replacement, only the
        Replacement is coded. Resecting the joint surfaces during a joint replacement, and
        resecting the valve during a valve replacement, are both part of the Replacement.</p>`,
    examples: [
      { text: 'Total knee replacement', answer: 'Replacement only' },
      { text: 'Aortic valve replacement', answer: 'Replacement only' },
      { text: 'Mastectomy with immediate reconstruction', answer: 'Resection and Replacement' },
    ],
    traps: ['Coding the joint resection during an arthroplasty.'],
    also: ['how-many-codes', 'group-device'],
  },

  {
    id: 'integral-components',
    title: 'What is included and never coded separately?',
    question: 'Was this step part of the operation, or an operation of its own?',
    axis: 0,
    rules: ['B3.1a', 'B3.1b', 'B6.1b'],
    lead: `Anything the root operation's own definition already covers, and everything done to get
      in and get out.`,
    body: `<h3>Not coded</h3>
      <ul>
        <li>Components named in the root operation's <b>definition or explanation</b> as integral —
          the joint resection inside a Replacement.</li>
        <li>Procedural steps needed to <b>reach</b> the site — the laparotomy for an open liver
          biopsy.</li>
        <li>Procedural steps needed to <b>close</b> the site, including the <b>anastomosis</b> of a
          tubular body part.</li>
        <li>Sutures, ligatures, radiological markers and temporary post-operative wound drains, as
          devices.</li>
        <li>Routine hemostasis during the procedure.</li>
        <li>A cast or splint applied together with a fracture reduction.</li>
      </ul>
      <h3>The habit worth forming</h3>
      <p>Before adding a code, ask whether the step could have happened without the main procedure.
        If not, it is almost certainly integral.</p>`,
    examples: [
      { text: 'Sigmoid resection with descending colon to rectum anastomosis', answer: 'One code' },
      { text: 'Open liver biopsy through a laparotomy', answer: 'One code' },
      { text: 'Fracture reduction with cast', answer: 'One code' },
    ],
    traps: ['Coding the approach as a procedure.'],
    also: ['how-many-codes'],
  },

  {
    id: 'discontinued',
    title: 'The procedure was stopped part-way. What is coded?',
    question: 'How far did they get before it was abandoned?',
    axis: 0,
    rules: ['B3.3'],
    lead: `Code the root operation that was actually <b>performed</b>, not the one that was planned.`,
    body: `<h3>The rule</h3>
      <p>If the intended procedure is discontinued or otherwise not completed — including when the
        patient dies — code the root operation performed. If it was stopped <b>before any other
        root operation was performed</b>, code <b>Inspection</b> of the body part or anatomical
        region that was inspected.</p>
      <h3>The worked example</h3>
      <p>A planned aortic valve replacement is abandoned after the initial thoracotomy, before any
        incision is made in the heart, because the patient becomes unstable. That is an <b>open
        Inspection of the mediastinum</b> — not an incomplete valve replacement.</p>`,
    examples: [
      { text: 'Laparotomy, patient arrests, closed', answer: 'Open Inspection of the region opened' },
      { text: 'Partial colectomy begun, only mobilisation achieved', answer: 'Code what was performed' },
    ],
    traps: ['Coding the intended procedure because it was scheduled.'],
    also: ['inspection-when'],
  },

  /* ================================================= body part (character 4) */

  {
    id: 'bodypart-no-value',
    title: 'The exact site has no body-part value',
    question: 'What do I code when the part operated on is not in the list?',
    axis: 4,
    rules: ['B4.1a', 'B4.2'],
    lead: `Move outwards: code the whole body part, or the nearest proximal branch that does have
      a value.`,
    body: `<h3>Part of a body part</h3>
      <p>If a procedure is performed on a <b>portion</b> of a body part that has no value of its
        own, code the value for the <b>whole</b> body part. A procedure on the alveolar process of
        the mandible is coded to the mandible.</p>
      <h3>A branch with no value</h3>
      <p>Where a specific <b>branch</b> has no value, code the closest <b>proximal</b> branch that
        does. A procedure on the mandibular branch of the trigeminal nerve is coded to the
        trigeminal nerve.</p>
      <h3>The cardiovascular exception</h3>
      <p>In the cardiovascular body systems, if a general body part is available in the correct root
        operation table, and coding to a proximal branch would mean crossing into a
        <b>different body system</b>, use the general value instead. Occlusion of the bronchial
        artery is coded to <b>Upper Artery</b> in Upper Arteries — not to the descending thoracic
        aorta in Heart and Great Vessels.</p>`,
    examples: [
      { text: 'Procedure on the alveolar process of the mandible', answer: 'Mandible' },
      { text: 'Mandibular branch of the trigeminal nerve', answer: 'Trigeminal Nerve' },
      { text: 'Occlusion of the bronchial artery', answer: 'Upper Artery' },
    ],
    also: ['bodypart-branches', 'excision-vs-resection'],
  },

  {
    id: 'bodypart-peri',
    title: '"Peri-" something — which body part?',
    question: 'The note says perirenal, periurethral, periosteal. What is the body part?',
    axis: 4,
    rules: ['B4.1b'],
    lead: `Code the body part named, unless the record says the procedure was somewhere else.`,
    body: `<p>When "peri" is combined with a body part to identify the site, and the site is
        <b>not further specified</b>, code the body part named. This applies only when no more
        specific value is available.</p>
      <ul>
        <li>A site described as <b>perirenal</b>, nothing further — code the kidney.</li>
        <li>A site described as <b>peri-urethral</b>, where the record makes clear it was the
          vulvar tissue and not the urethra — code the vulva.</li>
        <li>A site involving the <b>periosteum</b> — code the corresponding bone.</li>
      </ul>`,
    examples: [
      { text: 'Drainage of a perirenal abscess, site not further specified', answer: 'Kidney' },
      { text: 'Excision of periosteal lesion of the femur', answer: 'Femur' },
    ],
    also: ['bodypart-no-value'],
  },

  {
    id: 'bodypart-vessel-proximal',
    title: 'A continuous stretch of artery or vein',
    question: 'One procedure crossed two named vessel segments. Which one is the body part?',
    axis: 4, diagram: 'vessel-proximal',
    rules: ['B4.1c'],
    lead: `The one closest to the heart — regardless of where the needle went in.`,
    body: `<p>For a single vascular procedure on a <b>continuous section</b> of an arterial or
        venous body part, code the body part value for the anatomically <b>most proximal</b>
        portion — the one nearest the heart.</p>
      <p>The entry point does not matter. A procedure running from the femoral artery to the
        external iliac artery is coded to the <b>external iliac</b> whether the puncture was at the
        femoral or at the external iliac.</p>`,
    examples: [
      { text: 'Angioplasty from femoral to external iliac, femoral puncture', answer: 'External Iliac Artery' },
      { text: 'The same, punctured at the external iliac', answer: 'External Iliac Artery' },
    ],
    traps: ['Coding the access site instead of the most proximal segment treated.'],
    also: ['bodypart-branches'],
  },

  {
    id: 'bodypart-branches',
    title: 'Branches of a body part',
    question: 'The vessel or nerve treated is a branch. Where does it belong?',
    axis: 4,
    rules: ['B4.2'],
    lead: `The closest proximal branch that has its own value — with a cardiovascular exception.`,
    body: `<p>Where a specific branch has no body-part value of its own, code the closest
        <b>proximal</b> branch that does have one.</p>
      <p>In the cardiovascular body systems, if a general body part is available in the correct
        root operation table and coding to a proximal branch would require a code in a
        <b>different body system</b>, use the general value.</p>`,
    examples: [
      { text: 'Mandibular branch of the trigeminal nerve', answer: 'Trigeminal Nerve' },
      { text: 'Bronchial artery occlusion', answer: 'Upper Artery, Upper Arteries body system' },
    ],
    also: ['bodypart-no-value', 'bodypart-vessel-proximal'],
  },

  {
    id: 'bodypart-bilateral',
    title: 'The same thing on both sides — one code or two?',
    question: 'Is there a bilateral body-part value?',
    axis: 4,
    rules: ['B4.3'],
    lead: `One code if a bilateral value exists; two codes if it does not.`,
    body: `<p>Bilateral values exist for a limited number of body parts. If the <b>identical</b>
        procedure is performed on contralateral body parts <b>and</b> a bilateral value exists,
        code it <b>once</b> using that value. If no bilateral value exists, code each side
        separately with its own right and left value.</p>
      <p>The identical procedure on both fallopian tubes is one code, Fallopian Tube, Bilateral.
        The identical procedure on both knee joints is two codes, because there is no bilateral
        knee joint value.</p>
      <p>Always check the 4th-character column of the table you are in — bilateral values are not
        consistent across body systems.</p>`,
    examples: [
      { text: 'Bilateral tubal ligation', answer: 'One code, Fallopian Tube, Bilateral' },
      { text: 'Bilateral total knee replacement', answer: 'Two codes' },
      { text: 'Bilateral inguinal hernia repair with mesh', answer: 'Check the table — code by side if no bilateral value' },
    ],
    traps: ['Assuming a bilateral value exists. It usually does not.'],
  },

  {
    id: 'bodypart-coronary',
    title: 'Counting coronary arteries',
    question: 'How many coronary arteries were treated, and does that mean more than one code?',
    axis: 4, diagram: 'coronary',
    rules: ['B4.4', 'B3.6b', 'B3.6c'],
    lead: `The coronary arteries are a single body part, specified by <b>number treated</b>.`,
    body: `<h3>One body part, counted</h3>
      <p>PCS classifies the coronary arteries as one body part, further specified by the number of
        arteries treated: One Artery, Two Arteries, Three Arteries, Four or More Arteries.</p>
      <h3>One code, or several</h3>
      <p>Use <b>one</b> code specifying multiple arteries when the same procedure was performed —
        including the <b>same device and qualifier</b> values. If the device or qualifier differs
        between arteries, code them separately.</p>
      <ul>
        <li>Angioplasty of two coronary arteries with a stent in each:
          <b>one</b> code — Dilation, Two Arteries, with Two Intraluminal Devices.</li>
        <li>Angioplasty of two arteries, one stented and one not: <b>two</b> codes — One Artery
          with Intraluminal Device, and One Artery with No Device.</li>
      </ul>`,
    examples: [
      { text: 'PCI to LAD and RCA, drug-eluting stent in each', answer: 'One code, Two Arteries, Two Drug-eluting Intraluminal Devices' },
      { text: 'PCI to LAD with stent, balloon only to OM', answer: 'Two codes' },
    ],
    traps: ['Coding one code when the devices differed.'],
    also: ['bypass-direction', 'group-tubular'],
  },

  {
    id: 'bodypart-tendon-vs-joint',
    title: 'Around a joint — the joint, or the soft tissue?',
    question: 'Was the procedure on the joint itself, or on a tendon, ligament, bursa or fascia supporting it?',
    axis: 4, diagram: 'joint-layers',
    rules: ['B4.5'],
    lead: `Code where the focus of the procedure was, in that structure's own body system.`,
    body: `<p>Procedures on <b>tendons, ligaments, bursae and fascia</b> supporting a joint are
        coded to the body part in their own body system — Tendons, or Bursae and Ligaments — not
        to the joint.</p>
      <p>Procedures on the <b>joint structures themselves</b> are coded to the joint body systems.</p>
      <ul>
        <li>Repair of the anterior cruciate ligament: the <b>knee bursa and ligament</b> body part,
          in Bursae and Ligaments.</li>
        <li>Knee arthroscopy with shaving of articular cartilage: the <b>knee joint</b> body part,
          in Lower Joints.</li>
      </ul>`,
    examples: [
      { text: 'ACL reconstruction', answer: 'Bursae and Ligaments body system' },
      { text: 'Arthroscopic chondroplasty of the knee', answer: 'Lower Joints body system' },
      { text: 'Rotator cuff repair', answer: 'Tendons or Bursae and Ligaments, by the structure repaired' },
    ],
    also: ['bodypart-skin-over-joint', 'bodypart-overlapping-layers'],
  },

  {
    id: 'bodypart-skin-over-joint',
    title: 'Skin, subcutaneous tissue or fascia over a joint',
    question: 'The procedure was on the skin over the knee. Which body part?',
    axis: 4, diagram: 'joint-layers',
    rules: ['B4.6'],
    lead: `Not the joint — the limb segment. And the mapping is fixed.`,
    body: `<p>A procedure on the skin, subcutaneous tissue or fascia <b>overlying</b> a joint is
        coded to the following body part:</p>
      <table class="qualgrid">
        <thead><tr><th>Overlying</th><th>Code to</th></tr></thead>
        <tbody>
          <tr><td>Shoulder</td><td>Upper Arm</td></tr>
          <tr><td>Elbow</td><td>Lower Arm</td></tr>
          <tr><td>Wrist</td><td>Lower Arm</td></tr>
          <tr><td>Hip</td><td>Upper Leg</td></tr>
          <tr><td>Knee</td><td>Lower Leg</td></tr>
          <tr><td>Ankle</td><td>Foot</td></tr>
        </tbody>
      </table>
      <p>Note that the wrist maps to <b>lower arm</b> and the ankle maps to <b>foot</b> — the two
        that are not simply "the segment above".</p>`,
    examples: [
      { text: 'Excisional debridement of skin over the knee', answer: 'Skin, Lower Leg' },
      { text: 'Drainage of a subcutaneous abscess over the ankle', answer: 'Subcutaneous Tissue and Fascia, Foot' },
    ],
    traps: ['Coding the joint because the note names the joint.'],
    also: ['bodypart-tendon-vs-joint', 'bodypart-overlapping-layers'],
  },

  {
    id: 'bodypart-overlapping-layers',
    title: 'The procedure went through several layers',
    question: 'Skin, then fat, then muscle. Which layer is the body part?',
    axis: 4, diagram: 'body-layers',
    rules: ['B3.5'],
    lead: `The <b>deepest</b> layer reached.`,
    body: `<p>Where Excision, Extraction, Repair or Inspection is performed on overlapping layers of
        the musculoskeletal system, code the body part specifying the <b>deepest</b> layer.</p>
      <ul>
        <li>Excisional debridement of skin, subcutaneous tissue <b>and muscle</b> — code the
          <b>muscle</b> body part.</li>
        <li>Excisional debridement of muscle <b>and tendon</b> — code the <b>tendon</b> body part.</li>
      </ul>
      <p>The depth order that matters: skin → subcutaneous tissue and fascia → muscle → tendon →
        bursa and ligament → bone → joint.</p>
      <h3>Why this one is worth money</h3>
      <p>Debridement depth is one of the most heavily audited fields in an inpatient chart. The
        documentation has to support the depth coded; if the note says only "debridement of the
        wound", it does not support a muscle or bone body part.</p>`,
    examples: [
      { text: 'Excisional debridement to and including muscle', answer: 'Muscle body part' },
      { text: 'Excisional debridement of skin and subcutaneous tissue only', answer: 'Subcutaneous Tissue and Fascia' },
      { text: 'Debridement described only as "of the wound"', answer: 'Query — the depth is not supported' },
    ],
    traps: ['Coding the deepest layer merely visualised rather than the deepest layer debrided.'],
    also: ['bodypart-skin-over-joint', 'group-takeout'],
  },

  {
    id: 'bodypart-fingers-toes',
    title: 'Fingers and toes with no value of their own',
    question: 'This body system has no finger value. Now what?',
    axis: 4,
    rules: ['B4.7'],
    lead: `Use the hand, or the foot.`,
    body: `<p>If a body system does not contain a separate body-part value for <b>fingers</b>, code
        procedures on the fingers to the value for the <b>hand</b>. If it does not contain a value
        for <b>toes</b>, code to the <b>foot</b>.</p>
      <p>Excision of a finger muscle is coded to one of the hand muscle values in the Muscles body
        system, because Muscles has no finger value.</p>`,
    examples: [
      { text: 'Excision of a finger muscle', answer: 'Hand Muscle' },
      { text: 'Excision of a toe tendon', answer: 'Foot Tendon' },
    ],
  },

  {
    id: 'bodypart-intestinal-tract',
    title: 'Upper and Lower Intestinal Tract',
    question: 'When are the general intestinal values used?',
    axis: 4, diagram: 'gi-tract',
    rules: ['B4.8'],
    lead: `Only in the root operations that offer them — mainly the device operations.`,
    body: `<p>In the Gastrointestinal body system, the general values <b>Upper Intestinal Tract</b>
        and <b>Lower Intestinal Tract</b> are provided as an option for root operations such as
        Change, Insertion, Inspection, Removal and Revision.</p>
      <ul>
        <li><b>Upper Intestinal Tract</b> — from the oesophagus down to and including the
          duodenum.</li>
        <li><b>Lower Intestinal Tract</b> — from the jejunum down to and including the rectum and
          anus.</li>
      </ul>
      <p>Change of a device in the jejunum uses <b>Lower Intestinal Tract</b>.</p>`,
    examples: [
      { text: 'Change of a jejunostomy tube', answer: 'Lower Intestinal Tract' },
      { text: 'Excision of the jejunum', answer: 'Jejunum — Excision does not offer the general value' },
    ],
    also: ['device-management'],
  },

  /* =================================================== approach (character 5) */

  {
    id: 'approach-values',
    title: 'Which approach?',
    question: 'How did the instrument get to the site — and what was it doing when it got there?',
    axis: 5, diagram: 'approaches',
    rules: ['B5.2a', 'B5.2b', 'B5.3a', 'B5.3b', 'B5.4'],
    lead: `Approach has three parts: the route in, whether an instrument was used, and whether the
      site was visualised.`,
    compare: [
      { name: 'Open', char: '0', means: 'Cutting through skin or mucous membrane to <b>expose</b> the site.',
        pick: 'The site was laid open and seen directly.', avoid: 'Only a puncture was made.' },
      { name: 'Percutaneous', char: '3', means: 'Puncture or minor incision, <b>without</b> visualising the site.',
        pick: 'Needle, catheter, wire.', avoid: 'A scope let them see the site.' },
      { name: 'Percutaneous Endoscopic', char: '4', means: 'Puncture or minor incision <b>with</b> visualisation.',
        pick: 'Laparoscopy, arthroscopy, thoracoscopy.', avoid: 'A natural orifice was used.' },
      { name: 'Via Natural or Artificial Opening', char: '7', means: 'Through an existing opening, <b>without</b> visualisation.',
        pick: 'Foley catheter, NG tube.', avoid: 'A scope was used.' },
      { name: 'Via Natural or Artificial Opening Endoscopic', char: '8', means: 'Through an opening, <b>with</b> visualisation.',
        pick: 'Colonoscopy, EGD, cystoscopy, bronchoscopy.', avoid: 'The skin was cut.' },
      { name: 'Via Opening with Percutaneous Endoscopic Assistance', char: 'F', means: 'Through an opening, helped by a percutaneous scope.',
        pick: 'Laparoscopic-assisted vaginal hysterectomy.', avoid: 'Only one route was used.' },
      { name: 'External', char: 'X', means: 'On the skin or mucous membrane, or <b>indirectly</b> through the body layers.',
        pick: 'Closed fracture reduction, tonsillectomy, every Change procedure.', avoid: 'Anything entered the body.' },
    ],
    body: `<h3>Assisted procedures — the two that catch people out</h3>
      <ul>
        <li><b>Open with percutaneous endoscopic assistance</b> is coded <b>Open</b>. A
          laparoscopic-assisted sigmoidectomy, where the definitive work is done through an open
          incision, is Open.</li>
        <li><b>Percutaneous endoscopic with hand assistance</b>, or with an incision made to get the
          specimen out or to make an anastomosis, stays <b>Percutaneous Endoscopic</b>. A hand-assisted
          laparoscopic colectomy is Percutaneous Endoscopic. So is a robotic-assisted laparoscopic
          prostatectomy with the incision extended to remove the prostate.</li>
      </ul>
      <p>The test is which route the <b>definitive</b> work was done through, not whether an
        incision existed.</p>
      <h3>External — wider than it sounds</h3>
      <ul>
        <li>Procedures within an orifice on structures <b>visible without instrumentation</b> are
          External. Resection of tonsils is External.</li>
        <li>Procedures performed <b>indirectly by external force</b> through the intervening body
          layers are External. Closed reduction of a fracture is External.</li>
      </ul>
      <h3>Percutaneous via a device already there</h3>
      <p>A procedure done percutaneously <b>via a device placed for the procedure</b> is
        Percutaneous. Fragmentation of a kidney stone through a percutaneous nephrostomy is
        Percutaneous.</p>`,
    examples: [
      { text: 'Laparoscopic-assisted sigmoidectomy', answer: 'Open' },
      { text: 'Hand-assisted laparoscopic nephrectomy with an incision to remove the kidney', answer: 'Percutaneous Endoscopic' },
      { text: 'Tonsillectomy', answer: 'External' },
      { text: 'Closed reduction of a wrist fracture', answer: 'External' },
      { text: 'Lithotripsy through a nephrostomy tract', answer: 'Percutaneous' },
      { text: 'Gastrostomy tube change at the bedside', answer: 'External' },
    ],
    traps: [
      'Coding Percutaneous Endoscopic for a laparoscopic-assisted open procedure.',
      'Downgrading a laparoscopic case to Open because an extraction incision was made.',
    ],
    also: ['device-management', 'how-many-codes'],
  },

  /* ================================================ sections and conventions */

  {
    id: 'section-choice',
    title: 'Which section does this procedure belong in?',
    question: 'Before anything else: is this even section 0?',
    axis: 1,
    rules: ['C1', 'C2', 'B3.16', 'E1.a', 'E1.b', 'D1.a', 'D1.b'],
    lead: `Choosing the wrong section makes every other character wrong. A few boundaries do most
      of the damage.`,
    body: `<h3>Obstetrics (1) or Medical and Surgical (0)?</h3>
      <p>Procedures on the <b>products of conception</b> go to Obstetrics. Procedures on the
        <b>pregnant patient herself</b> go to section 0. Amniocentesis is Obstetrics; repair of an
        obstetric urethral laceration is section 0.</p>
      <p>After a delivery or abortion, curettage of the endometrium or evacuation of retained
        products is <b>Obstetrics</b>, root operation Extraction, body part Products of Conception,
        Retained. A D&C at any other time is <b>section 0</b>, Extraction, body part Endometrium.</p>
      <h3>Administration (3), not Transplantation</h3>
      <p>Cells — bone marrow, stem cells, islet cells — are Administration. See
        <a href="#/card/transplant-vs-administration">the transplant card</a>.</p>
      <h3>Placement (2), not a device in section 0</h3>
      <p>Casts, splints, dressings, packing, traction and braces that are <b>applied</b> rather than
        implanted are Placement. Casting a non-displaced fracture is Immobilization in section 2.</p>
      <h3>Measurement (4): measurement or monitoring?</h3>
      <p><b>Measurement</b> is a single reading at a point in time. <b>Monitoring</b> is repeated
        over a period.</p>
      <h3>Extracorporeal (5): assistance or performance?</h3>
      <p><b>Assistance</b> takes over <i>a portion</i> of a function. <b>Performance</b> takes it
        over completely.</p>
      <h3>New Technology (X)</h3>
      <p>A section X code <b>fully represents</b> the procedure and does not need an additional code
        from another section. If section X contains a title that fully describes the procedure and
        it is the only procedure performed, report only the X code. When several procedures are
        performed, section X codes follow the ordinary multiple-procedures rule.</p>
      <h3>Radiation Therapy (D)</h3>
      <p>Brachytherapy is coded to the Brachytherapy modality in section D. If a radioactive source
        is <b>left in the body</b> at the end, code that separately as Insertion with device
        Radioactive Element — unless the device value already identifies the isotope, as it does
        for the Cesium-131 and Palladium-103 collagen implants. A temporary applicator placed as a
        separate procedure is Insertion of Other Device.</p>`,
    examples: [
      { text: 'Amniocentesis', answer: 'Obstetrics' },
      { text: 'D&C for retained products after delivery', answer: 'Obstetrics, Extraction, Products of Conception, Retained' },
      { text: 'Diagnostic D&C in a non-pregnant patient', answer: 'Section 0, Extraction, Endometrium' },
      { text: 'Casting a non-displaced fracture', answer: 'Placement, Immobilization' },
      { text: 'Mechanical ventilation', answer: 'Section 5, Performance' },
    ],
    traps: [
      'Coding a post-partum D&C in section 0.',
      'Adding a section 0 or section 3 code alongside a self-sufficient section X code.',
    ],
    also: ['transplant-vs-administration'],
  },

  {
    id: 'objective-not-words',
    title: 'The note does not use PCS words. Do I have to query?',
    question: 'Can I translate the surgeon\'s wording myself?',
    axis: 3,
    rules: ['A11'],
    lead: `Yes — that translation is the coder's job, and no query is needed when the correlation
      is clear.`,
    body: `<h3>The rule, in full</h3>
      <p>Many of the terms used to construct PCS codes are defined within the system. It is the
        <b>coder's responsibility</b> to determine what the documentation equates to in the PCS
        definitions. The physician is <b>not expected</b> to use PCS terms, and the coder is
        <b>not required to query</b> when the correlation between the documentation and the defined
        PCS terms is clear.</p>
      <p>The guideline's own example: when the physician documents "partial resection", the coder
        can independently correlate that to the root operation <b>Excision</b> without querying.</p>
      <h3>Where a query is still right</h3>
      <p>When the documentation does not establish the facts a character depends on — the depth of
        a debridement, whether all of a body part was removed, whether a device remained — the
        answer is not in the wording and a query is the correct step.</p>
      <p>The distinction: query for <b>missing facts</b>, not for <b>missing vocabulary</b>.</p>`,
    examples: [
      { text: '"Partial resection of the sigmoid"', answer: 'Excision — no query needed' },
      { text: '"Debridement of the sacral wound"', answer: 'Query — the depth is a fact, and it is missing' },
    ],
    traps: ['Querying for PCS terminology, which slows the chart and annoys the surgeon.'],
    also: ['group-takeout'],
  },

  {
    id: 'z-values',
    title: 'Z, and the "other" values',
    question: 'What does Z mean, and when is an "Other" value right?',
    axis: 6,
    rules: ['A1', 'A9', 'A10', 'A11'],
    lead: `Z is a real answer, not a gap. "Other" values are narrow and rarely correct.`,
    body: `<h3>Z</h3>
      <p>Z is the value used for <b>No Device</b> and <b>No Qualifier</b>. It is an affirmative
        statement that nothing was left behind, or that no further detail applies — not a way of
        saying the record is silent. If you do not know whether a device remained, that is a
        documentation question, not a Z.</p>
      <h3>PCS has no eponyms and no combination codes</h3>
      <p>There is no "Whipple" and no "Nissen" in the tables. Named procedures are decomposed into
        their objectives, and a named procedure often produces <b>several</b> codes. The Index
        carries the eponyms and points you at the right tables — that is what it is for.</p>
      <h3>"Other" values</h3>
      <p>PCS deliberately restricts NOS options and limits NEC options. Where an "Other" value
        exists, it is meant for a genuinely unlisted item, not as a shortcut when the right value is
        hard to find. Before choosing one, check the Body Part, Device and Substance keys — the
        word in the note is very often a synonym for a value that does exist.</p>`,
    examples: [
      { text: 'Appendectomy, nothing implanted', answer: 'Device Z, No Device' },
      { text: '"Whipple procedure"', answer: 'Several codes — look it up in the Index' },
    ],
    traps: ['Using Z because the operative note is unclear.'],
    also: ['device-vs-substance', 'keys-first'],
  },

  {
    id: 'keys-first',
    title: 'The word in the note is not a PCS value',
    question: 'Where do I look up the surgeon\'s word?',
    axis: 4,
    rules: ['A11'],
    lead: `The Body Part, Device and Substance keys exist precisely for this, and they are the most
      under-used part of the system.`,
    body: `<h3>Three keys, three jobs</h3>
      <ul>
        <li>The <b>Body Part Key</b> maps anatomical terms onto the body-part values that cover
          them. "Auerbach's plexus" is the Abdominal Sympathetic Nerve; "hallux" is the 1st toe.</li>
        <li>The <b>Device Key</b> maps trade names and everyday device words onto device values.
          "Artificial bowel sphincter" is Artificial Sphincter in Gastrointestinal System.</li>
        <li>The <b>Substance Key</b> does the same for the Administration section. "Kcentra" is
          4-Factor Prothrombin Complex Concentrate.</li>
      </ul>
      <h3>And the Device Aggregation Table</h3>
      <p>Where a specific device value is not offered in the table you are in, the Device
        Aggregation Table gives the general value to use instead.</p>
      <p>All four are searchable under <a href="#/keys">Reference keys</a>.</p>`,
    examples: [
      { text: '"Excision of the hallux"', answer: 'Body Part Key: 1st Toe' },
      { text: '"AbioCor total replacement heart"', answer: 'Device Key: Synthetic Substitute' },
    ],
    also: ['z-values', 'bodypart-no-value'],
  },
];

/* ------------------------------------------------------------------ lookup */

const byId = new Map(CARDS.map(c => [c.id, c]));

export function cardById(id) { return byId.get(id) || null; }

/** Cards that mention this root operation, for the builder's step 3 and 7. */
export function cardsForOperation(op) {
  return CARDS.filter(c => (c.ops || []).includes(op));
}

/** Cards that settle a given character, optionally narrowed to one operation. */
export function cardsForAxis(axis, op) {
  return CARDS.filter(c => c.axis === axis &&
    (!op || !c.ops || !c.ops.length || c.ops.includes(op)));
}

/** Cards resting on a given official guideline. */
export function cardsForRule(id) {
  return CARDS.filter(c => (c.rules || []).includes(id));
}
