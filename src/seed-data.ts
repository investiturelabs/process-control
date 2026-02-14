import type { Department, Question, AnswerType } from './types';

let questionCounter = 0;

function q(
  departmentId: string,
  riskCategory: string,
  text: string,
  criteria: string,
  pointsYes: number,
  answerType: AnswerType = 'yes_no',
  pointsPartial?: number
): Question {
  return {
    id: `seed-q-${questionCounter++}`,
    departmentId,
    riskCategory,
    text,
    criteria,
    answerType,
    pointsYes,
    pointsPartial: answerType === 'yes_no_partial' ? (pointsPartial ?? Math.floor(pointsYes / 2)) : 0,
    pointsNo: 0,
  };
}

const GENERAL_ID = 'dept-general';
const DELI_ID = 'dept-deli';
const MEAT_ID = 'dept-meat';
const BAKERY_ID = 'dept-bakery';
const PRODUCE_ID = 'dept-produce';
const BULK_ID = 'dept-bulk';
const DAIRY_ID = 'dept-dairy';
const GROCERY_ID = 'dept-grocery';
const VITAMINS_ID = 'dept-vitamins';

export const seedDepartments: Department[] = [
  {
    id: GENERAL_ID,
    name: 'General Risk',
    icon: 'Building2',
    questions: [
      // Store Conditions (48 pts)
      q(GENERAL_ID, 'Store Conditions', 'Are parking lot carts collected, safety vests available, and back exterior carts organized?', 'Parking lot carts, safety vests, back exterior carts organized and available.', 5),
      q(GENERAL_ID, 'Store Conditions', 'Is the parking lot, sidewalk, and front area clean by 9 AM?', 'Parking lot/sidewalk/front area should be clean and presentable by store opening.', 3),
      q(GENERAL_ID, 'Store Conditions', 'Is the dumpster/compactor/grease area clean and organized?', 'Dumpster, compactor, and grease containment area must be clean and properly maintained.', 5),
      q(GENERAL_ID, 'Store Conditions', 'Are restrooms clean and properly stocked?', 'Restrooms clean, stocked with supplies, and in good working condition.', 5),
      q(GENERAL_ID, 'Store Conditions', 'Is Logile Task Manager being used with full compliance?', 'Task Manager tasks are being completed on schedule by assigned team members.', 10, 'yes_no_partial', 5),
      q(GENERAL_ID, 'Store Conditions', 'Is Landfill Diversion Status on track?', 'Store is meeting landfill diversion goals and recycling programs.', 5, 'yes_no_partial', 3),
      q(GENERAL_ID, 'Store Conditions', 'Are service case drains clean and functioning?', 'All service case drains are clean, clear, and draining properly.', 5, 'yes_no_partial', 3),
      q(GENERAL_ID, 'Store Conditions', 'Are floor drain covers and domes in place?', 'Floor drain covers and domes are properly installed in all required areas.', 5, 'yes_no_partial', 3),
      q(GENERAL_ID, 'Store Conditions', 'Are 3-compartment and food prep sink drain strainers in place?', 'Strainers present and clean in all 3-compartment sinks and food prep sinks.', 5, 'yes_no_partial', 3),

      // Food Safety (35 pts)
      q(GENERAL_ID, 'Food Safety', 'Is the store free of pests and in compliance with Orkin program?', 'No evidence of pest activity; Orkin service logs current and up to date.', 5),
      q(GENERAL_ID, 'Food Safety', 'Do SM and ASM have current Food Manager Certification?', 'Store Manager and Assistant Store Manager must have valid Food Manager Certifications.', 10, 'yes_no_partial', 5),
      q(GENERAL_ID, 'Food Safety', 'Are Allergen and Foodborne Illness Posters displayed?', 'Allergen awareness and foodborne illness prevention posters visibly posted in required areas.', 5, 'yes_no_partial', 3),
      q(GENERAL_ID, 'Food Safety', 'Are chemicals stored properly in non-perishable departments?', 'Chemicals stored below and away from food items with proper labeling.', 5, 'yes_no_partial', 3),
      q(GENERAL_ID, 'Food Safety', 'Is Instacart curbside maintaining proper temperatures?', 'Curbside orders are being held at proper temperatures during staging.', 3),
      q(GENERAL_ID, 'Food Safety', 'Is frozen food maintained frozen throughout the store?', 'All frozen food items at 0°F or below; no evidence of thawing.', 5, 'yes_no_partial', 3),
      q(GENERAL_ID, 'Food Safety', 'Is the sampling station following food safety protocols?', 'Sampling follows proper food safety and allergen procedures.', 2),

      // Safety (75 pts)
      q(GENERAL_ID, 'Safety', 'Are electric pallet jack operators properly certified?', 'All EPJ operators have current certification on file.', 5),
      q(GENERAL_ID, 'Safety', 'Is the Safety Board complete and up to date?', 'Safety board has current OSHA poster, workers comp info, and emergency contacts.', 5),
      q(GENERAL_ID, 'Safety', 'Is OSHA/Safety training completion current for all team members?', 'All required safety training modules completed and documented for team members.', 10, 'yes_no_partial', 5),
      q(GENERAL_ID, 'Safety', 'Are spotters being used when operating equipment?', 'Spotters present when using pallet jacks, ladders, and other equipment in customer areas.', 5, 'yes_no_partial', 3),
      q(GENERAL_ID, 'Safety', 'Are store/produce/back-of-house sweeps being completed?', 'Regular sweep schedules maintained and documented throughout the day.', 10, 'yes_no_partial', 5),
      q(GENERAL_ID, 'Safety', 'Are freezer floors ice-free and coolers free of slip hazards?', 'No ice buildup on freezer floors; cooler floors dry and hazard-free.', 10),
      q(GENERAL_ID, 'Safety', 'Is the sales floor free of trip and slip hazards?', 'No boxes, spills, cords, or other hazards on the sales floor.', 10),
      q(GENERAL_ID, 'Safety', 'Is the baler key secured and compactor door secured / CODE GREEN?', 'Baler key removed when not in use; compactor door locked; CODE GREEN procedures followed.', 10),
      q(GENERAL_ID, 'Safety', 'Are mats and pig mats placed in all required areas?', 'Anti-fatigue mats and absorbent mats properly placed in service departments and doorways.', 10, 'yes_no_partial', 5),

      // Loss Prevention (45 pts)
      q(GENERAL_ID, 'Loss Prevention', 'Are emergency exits armed and operational?', 'All emergency exit doors alarmed and functioning; no blocked exits.', 5),
      q(GENERAL_ID, 'Loss Prevention', 'Are front doors properly secured before opening (CCTV verified)?', 'CCTV shows front doors remained secured until proper opening time.', 5, 'yes_no_partial', 3),
      q(GENERAL_ID, 'Loss Prevention', 'Are front doors properly secured at closing (CCTV verified)?', 'CCTV shows doors properly secured at closing; no unauthorized after-hours access.', 5, 'yes_no_partial', 3),
      q(GENERAL_ID, 'Loss Prevention', 'Are rekeying/safe combo changes done when managers depart?', 'Lock combinations and keys changed promptly when managers leave the company.', 5),
      q(GENERAL_ID, 'Loss Prevention', 'Is the CCTV system fully functioning?', 'All cameras operational; recording properly; no blind spots in critical areas.', 10),
      q(GENERAL_ID, 'Loss Prevention', 'Are clearance tags secured and properly used?', 'Clearance tags stored securely; only authorized personnel applying them.', 5),
      q(GENERAL_ID, 'Loss Prevention', 'Are paid stickers secured in the cash office?', 'Paid stickers locked in cash office; inventory tracked.', 5),
      q(GENERAL_ID, 'Loss Prevention', 'Is the Access Control Matrix up to date?', 'Access control list current with proper permissions for all team members.', 5),

      // Weights & Measures (50 pts)
      q(GENERAL_ID, 'Weights & Measures', 'Is the eight-week scan audit current and complete?', 'Scan audit completed on schedule; results documented and discrepancies resolved.', 10, 'yes_no_partial', 5),
      q(GENERAL_ID, 'Weights & Measures', 'Are price tags correct? (500 tags scanned)', 'Random scan of 500 price tags shows accuracy; errors corrected immediately.', 40, 'yes_no_partial', 20),

      // Inventory (60 pts)
      q(GENERAL_ID, 'Inventory', 'Are ThinStore Audit Compare Reports current for perishable?', 'Perishable audit compare reports reviewed and discrepancies addressed.', 5, 'yes_no_partial', 3),
      q(GENERAL_ID, 'Inventory', 'Are ThinStore Audit Compare Reports current for non-perishable?', 'Non-perishable audit compare reports reviewed and discrepancies addressed.', 5, 'yes_no_partial', 3),
      q(GENERAL_ID, 'Inventory', 'Has ThinStore Receiving Assessment been passed?', 'Receiving assessment completed with passing score.', 5),
      q(GENERAL_ID, 'Inventory', 'Are KeHE/UNFI/Tony deliveries processed same day?', 'All vendor deliveries processed, received, and put away on day of delivery.', 5),
      q(GENERAL_ID, 'Inventory', 'Is the receiver recording temperatures on delivery?', 'Temperature logs completed for all perishable deliveries at receiving.', 5, 'yes_no_partial', 3),
      q(GENERAL_ID, 'Inventory', 'Are receiving doors locked when not actively receiving?', 'Back doors secured and locked when not in active use for deliveries.', 5),
      q(GENERAL_ID, 'Inventory', 'Is hazardous waste properly contained?', 'Hazardous materials stored and disposed of per regulatory requirements.', 5),
      q(GENERAL_ID, 'Inventory', 'Is On-Shelf Availability (OSA) Alert compliance maintained?', 'OSA alerts reviewed and addressed daily; out-of-stocks resolved promptly.', 5),
      q(GENERAL_ID, 'Inventory', 'Are Customer Return credits processed for Vitamin/HBA?', 'Customer returns for vitamins and HBA processed for vendor credit.', 5),
      q(GENERAL_ID, 'Inventory', 'Is shrink scanned daily in perishable departments?', 'All perishable shrink scanned daily and recorded in system.', 5, 'yes_no_partial', 3),
      q(GENERAL_ID, 'Inventory', 'Is shrink scanned regularly in non-perishable departments?', 'Non-perishable shrink scanned on regular schedule.', 5, 'yes_no_partial', 3),
      q(GENERAL_ID, 'Inventory', 'Is product transferred to Dept 70 (demo) daily?', 'Demo/sampling product properly transferred to department 70 daily.', 5, 'yes_no_partial', 3),

      // Front End (65 pts)
      q(GENERAL_ID, 'Front End', 'Is cashier training verified and documented?', 'All cashiers have completed required training modules with documentation.', 5, 'yes_no_partial', 3),
      q(GENERAL_ID, 'Front End', 'Are cashier IDs properly assigned in Encore?', 'Each cashier has unique ID in Encore system; no shared IDs.', 5, 'yes_no_partial', 3),
      q(GENERAL_ID, 'Front End', 'Are cashiers using no more than two lanes?', 'Cashiers operating maximum of two lanes; proper lane assignment followed.', 5, 'yes_no_partial', 3),
      q(GENERAL_ID, 'Front End', 'Is lane over/short documentation complete?', 'Daily over/short reports completed and reviewed for all lanes.', 5, 'yes_no_partial', 3),
      q(GENERAL_ID, 'Front End', 'Is Cashier Accountability (red) scheduling in place?', 'Red accountability schedules posted and followed for all cashiers.', 5, 'yes_no_partial', 3),
      q(GENERAL_ID, 'Front End', 'Are paid out forms completed with proper documentation?', 'All paid outs have completed forms with manager signatures and receipts.', 5, 'yes_no_partial', 3),
      q(GENERAL_ID, 'Front End', 'Is total store cash-on-hand dual verified?', 'Cash on hand verified by two authorized team members; documented.', 5, 'yes_no_partial', 3),
      q(GENERAL_ID, 'Front End', 'Is the produce scanning program being followed?', 'Cashiers correctly identifying and scanning produce items; spot checks done.', 5, 'yes_no_partial', 3),
      q(GENERAL_ID, 'Front End', 'Are check-stand cubbies stocked and registers functioning?', 'All register stations fully stocked with bags and supplies; equipment working.', 5, 'yes_no_partial', 3),
      q(GENERAL_ID, 'Front End', 'Are cash sweeps completed appropriately?', 'Scheduled cash sweeps completed on time with proper documentation.', 5, 'yes_no_partial', 3),
      q(GENERAL_ID, 'Front End', 'Do cashier/HC initials appear on sweep slips?', 'All sweep slips signed by both cashier and head cashier.', 5, 'yes_no_partial', 3),
      q(GENERAL_ID, 'Front End', 'Are cashiers asking about Sprouts app?', 'Cashiers promoting Sprouts app to customers during checkout.', 5, 'yes_no_partial', 3),
      q(GENERAL_ID, 'Front End', 'Is curbside delivery operating in compliance?', 'Curbside pickup following all procedures including temperature and timing.', 5, 'yes_no_partial', 3),

      // Human Resources (50 pts)
      q(GENERAL_ID, 'Human Resources', 'Are promotions initiated timely in myHR?', 'All promotions entered into myHR system within required timeframe.', 10, 'yes_no_partial', 5),
      q(GENERAL_ID, 'Human Resources', 'Are terminations initiated timely in myHR?', 'All terminations processed in myHR within required timeframe.', 10, 'yes_no_partial', 5),
      q(GENERAL_ID, 'Human Resources', 'Are missed punch forms completed?', 'All missed punches documented with completed forms and manager approval.', 5, 'yes_no_partial', 3),
      q(GENERAL_ID, 'Human Resources', 'Are new hires properly onboarded?', 'New hire orientation complete; all required paperwork and system setup done.', 10, 'yes_no_partial', 5),
      q(GENERAL_ID, 'Human Resources', 'Is the new hire Top Skills checklist complete?', 'New hires have completed all Top Skills training within required period.', 10, 'yes_no_partial', 5),
      q(GENERAL_ID, 'Human Resources', 'Is cross-trained TMs Top Skills checklist complete?', 'Cross-trained team members have completed applicable Top Skills modules.', 5, 'yes_no_partial', 3),
    ],
  },
  {
    id: DELI_ID,
    name: 'Deli',
    icon: 'UtensilsCrossed',
    questions: [
      // Store Conditions (8 pts)
      q(DELI_ID, 'Store Conditions', 'Is the deli department ready by 9 AM?', 'Cases filled, product merchandised, and department staffed by opening.', 3),
      q(DELI_ID, 'Store Conditions', 'Is the Rational oven cleaning schedule maintained?', 'Oven cleaning log current; equipment properly maintained.', 5),

      // Inventory (14 pts)
      q(DELI_ID, 'Inventory', 'Is Production Planning being followed?', 'Daily production plan followed; waste minimized; adequate product available.', 10, 'yes_no_partial', 5),
      q(DELI_ID, 'Inventory', 'Is Markdown Manager being used effectively?', 'Markdowns applied on schedule; shrink minimized through proper markdown timing.', 4, 'yes_no_partial', 2),

      // Weights & Measures (15 pts)
      q(DELI_ID, 'Weights & Measures', 'Are fixed weight items accurate?', 'Fixed weight deli items match labeled weight within tolerance.', 5),
      q(DELI_ID, 'Weights & Measures', 'Are random weight items accurate?', 'Random weight items properly weighed and labeled.', 5),
      q(DELI_ID, 'Weights & Measures', 'Are In-Store Prepared Meals portioned correctly?', 'Prepared meal portions consistent with recipes and specs.', 5),

      // Food Safety (100 pts)
      q(DELI_ID, 'Food Safety', 'Do all deli team members have current food handler cards?', 'All deli team members have valid, non-expired food handler certifications.', 5),
      q(DELI_ID, 'Food Safety', 'Is the handwashing sink accessible and properly stocked?', 'Handwashing sink clear, stocked with soap and paper towels, properly signed.', 3),
      q(DELI_ID, 'Food Safety', 'Is the 3-compartment sink set up and being used?', 'Three-compartment sink properly set up with wash/rinse/sanitize.', 3),
      q(DELI_ID, 'Food Safety', 'Is product free from physical contamination?', 'No foreign objects, hair nets worn, jewelry policy followed.', 5),
      q(DELI_ID, 'Food Safety', 'Is biological contamination / proper stacking order followed?', 'Proper storage order maintained; raw below ready-to-eat; no cross-contamination.', 5),
      q(DELI_ID, 'Food Safety', 'Are proper handwashing procedures being followed?', 'Team members washing hands properly at required intervals.', 5),
      q(DELI_ID, 'Food Safety', 'Are gloves used for all ready-to-eat food handling?', 'Disposable gloves worn when handling RTE foods; changed between tasks.', 4),
      q(DELI_ID, 'Food Safety', 'Are food contact surfaces clean and sanitized?', 'Cutting boards, slicers, and prep surfaces clean and sanitized on schedule.', 10),
      q(DELI_ID, 'Food Safety', 'Is service case date coding current?', 'All service case items have current date labels; expired items removed.', 5),
      q(DELI_ID, 'Food Safety', 'Is sales floor code dating correct? (35 SKUs checked)', 'Random check of 35 SKUs shows proper date coding and rotation.', 10),
      q(DELI_ID, 'Food Safety', 'Are digital temp/task logs maintained for 30 days?', 'Digital temperature and task logs complete and retained for minimum 30 days.', 10),
      q(DELI_ID, 'Food Safety', 'Can team member demonstrate proper temperature taking?', 'Team member correctly demonstrates use of thermometer and proper technique.', 5),
      q(DELI_ID, 'Food Safety', 'Are cold holding cases at proper temperature? (4 cases checked)', 'Cold cases at 41°F or below; spot check of 4 cases passes.', 5),
      q(DELI_ID, 'Food Safety', 'Is hot holding at proper temperature?', 'Hot food maintained at 135°F or above.', 3),
      q(DELI_ID, 'Food Safety', 'Are cooking temperatures being met?', 'Cooked items reaching proper internal temperatures and documented.', 2),
      q(DELI_ID, 'Food Safety', 'Is the cooling process being followed?', 'Hot foods cooled from 135°F to 70°F within 2 hours, to 41°F within 6 hours.', 3),
      q(DELI_ID, 'Food Safety', 'Are cooling logs maintained?', 'Cooling logs completed for each cooling event with time and temperature.', 5),
      q(DELI_ID, 'Food Safety', 'Are chemicals stored away from food?', 'All chemicals stored below and away from food items; proper labeling.', 5),
      q(DELI_ID, 'Food Safety', 'Is sanitizer at proper concentration?', 'Sanitizer solution at correct ppm; test strips used and documented.', 5),
      q(DELI_ID, 'Food Safety', 'Is proper thawing method being used?', 'Products thawed under refrigeration, cold running water, or as part of cooking.', 2),

      // Safety (30 pts)
      q(DELI_ID, 'Safety', 'Are slip-resistant shoes being worn?', 'All deli team members wearing approved slip-resistant footwear.', 5),
      q(DELI_ID, 'Safety', 'Are cut-resistant gloves and breakaway shears in use?', 'Cut gloves worn when using knives/slicers; breakaway shears available.', 15),
      q(DELI_ID, 'Safety', 'Is adequate PPE available?', 'Department stocked with required PPE including gloves, aprons, eye protection.', 5),
      q(DELI_ID, 'Safety', 'Are oven warning labels in place?', 'Hot surface warning labels posted on ovens and hot equipment.', 5),
    ],
  },
  {
    id: MEAT_ID,
    name: 'Meat & Seafood',
    icon: 'Fish',
    questions: [
      // Store Conditions (8 pts)
      q(MEAT_ID, 'Store Conditions', 'Is COOL (Country of Origin Labeling) correct?', 'All required COOL labels present and accurate for meat and seafood products.', 5),
      q(MEAT_ID, 'Store Conditions', 'Is the department ready by 9 AM?', 'Cases filled, product merchandised, department clean and staffed by opening.', 3),

      // Inventory (14 pts)
      q(MEAT_ID, 'Inventory', 'Is Production Planning being followed?', 'Daily production plan followed; proper product levels maintained.', 10, 'yes_no_partial', 5),
      q(MEAT_ID, 'Inventory', 'Is Markdown Manager being used effectively?', 'Markdowns applied on schedule to minimize shrink.', 4, 'yes_no_partial', 2),

      // Weights & Measures (10 pts)
      q(MEAT_ID, 'Weights & Measures', 'Are random weight items accurate?', 'Random weight meat and seafood items properly weighed and labeled.', 5),
      q(MEAT_ID, 'Weights & Measures', 'Are One Pan Meal portions correct?', 'One Pan Meal portions consistent with recipe specifications.', 5),

      // Food Safety (112 pts)
      q(MEAT_ID, 'Food Safety', 'Do all team members have current food handler cards?', 'All meat/seafood team members have valid food handler certifications.', 5),
      q(MEAT_ID, 'Food Safety', 'Is the handwashing sink accessible and stocked?', 'Handwashing sink available, stocked, and properly signed.', 3),
      q(MEAT_ID, 'Food Safety', 'Is the 3-compartment sink set up and in use?', 'Three-compartment sink properly set up and maintained.', 3),
      q(MEAT_ID, 'Food Safety', 'Are proper handwashing procedures followed?', 'Team members washing hands at proper intervals with correct technique.', 5),
      q(MEAT_ID, 'Food Safety', 'Are gloves used for RTE food handling?', 'Gloves worn when handling ready-to-eat items; changed between tasks.', 4),
      q(MEAT_ID, 'Food Safety', 'Are food contact surfaces clean and sanitized?', 'Cutting boards, saws, and prep surfaces cleaned and sanitized on schedule.', 10),
      q(MEAT_ID, 'Food Safety', 'Is product free from physical contamination?', 'No foreign objects; proper hair/beard nets; jewelry policy followed.', 5),
      q(MEAT_ID, 'Food Safety', 'Is biological contamination/stacking order followed?', 'Proper storage order: poultry on bottom, raw below RTE.', 5),
      q(MEAT_ID, 'Food Safety', 'Are dividers in place between species?', 'Physical dividers separating different meat species in display cases.', 5),
      q(MEAT_ID, 'Food Safety', 'Are chemicals stored away from food?', 'Chemicals stored below and away from food with proper labeling.', 5),
      q(MEAT_ID, 'Food Safety', 'Is code dating correct? (20 SKUs checked)', 'Random check of 20 SKUs shows proper date coding.', 10),
      q(MEAT_ID, 'Food Safety', 'Are digital temperature logs maintained?', 'Digital temp logs complete and accurate; retained per policy.', 10),
      q(MEAT_ID, 'Food Safety', 'Can team member demonstrate temperature taking?', 'Team member correctly demonstrates thermometer use.', 5),
      q(MEAT_ID, 'Food Safety', 'Is the Fresh-Trax program being followed?', 'Fresh-Trax tracking system current and properly maintained.', 5),
      q(MEAT_ID, 'Food Safety', 'Are cold holding cases at proper temperature?', 'Cold cases at 41°F or below.', 5),
      q(MEAT_ID, 'Food Safety', 'Is the consumer advisory sign posted?', 'Consumer advisory for raw/undercooked items properly displayed.', 5),
      q(MEAT_ID, 'Food Safety', 'Are shellfish tags retained properly?', 'Shellfish tags retained for 90 days as required.', 5),
      q(MEAT_ID, 'Food Safety', 'Is sanitizer at proper concentration?', 'Sanitizer at correct ppm; tested and documented.', 5),
      q(MEAT_ID, 'Food Safety', 'Is proper thawing method used?', 'Products thawed using approved methods.', 2),
      q(MEAT_ID, 'Food Safety', 'Is service case date coding current?', 'All service case items properly date labeled.', 5),
      q(MEAT_ID, 'Food Safety', 'Is freezer/cooler case labeling correct?', 'All frozen and cooler cases properly labeled with dates.', 5),

      // Safety (15 pts)
      q(MEAT_ID, 'Safety', 'Are slip-resistant shoes being worn?', 'All team members wearing approved slip-resistant footwear.', 5),
      q(MEAT_ID, 'Safety', 'Are cut-resistant gloves in use?', 'Cut gloves worn when using knives, saws, and cutting equipment.', 5),
      q(MEAT_ID, 'Safety', 'Is adequate PPE available?', 'Required PPE stocked and accessible.', 5),
    ],
  },
  {
    id: BAKERY_ID,
    name: 'Bakery',
    icon: 'CakeSlice',
    questions: [
      q(BAKERY_ID, 'Store Conditions', 'Is the bakery department ready by 9 AM?', 'Product baked, cases filled, department clean by opening.', 3),

      q(BAKERY_ID, 'Inventory', 'Is Production Planning being followed?', 'Daily bake plan followed; adequate product available.', 10, 'yes_no_partial', 5),
      q(BAKERY_ID, 'Inventory', 'Is Markdown Manager being used?', 'Day-old and end-of-day markdowns applied on schedule.', 4, 'yes_no_partial', 2),

      q(BAKERY_ID, 'Weights & Measures', 'Are fixed weight items accurate?', 'Packaged bakery items match labeled weight.', 5),

      q(BAKERY_ID, 'Food Safety', 'Do all team members have food handler cards?', 'Valid food handler certifications for all bakery team members.', 5),
      q(BAKERY_ID, 'Food Safety', 'Are proper handwashing procedures followed?', 'Handwashing at proper intervals with correct technique.', 5),
      q(BAKERY_ID, 'Food Safety', 'Are gloves used for RTE food handling?', 'Gloves worn for ready-to-eat products; changed between tasks.', 4),
      q(BAKERY_ID, 'Food Safety', 'Is product free from physical contamination?', 'Hair nets worn; jewelry policy followed; no foreign objects.', 5),
      q(BAKERY_ID, 'Food Safety', 'Are chemicals stored away from food?', 'Chemicals below and away from food items.', 5),
      q(BAKERY_ID, 'Food Safety', 'Are food contact surfaces clean?', 'Prep tables, mixers, and equipment cleaned and sanitized.', 10),
      q(BAKERY_ID, 'Food Safety', 'Is code dating correct? (25 SKUs checked)', 'Random check of 25 SKUs shows proper date coding.', 10),
      q(BAKERY_ID, 'Food Safety', 'Is sanitizer at proper concentration?', 'Sanitizer tested and at correct ppm.', 5),

      q(BAKERY_ID, 'Safety', 'Are slip-resistant shoes worn?', 'All bakery team members in approved footwear.', 5),
      q(BAKERY_ID, 'Safety', 'Are cut-resistant gloves in use?', 'Cut gloves worn when using slicers and knives.', 5),
      q(BAKERY_ID, 'Safety', 'Is adequate PPE available?', 'Required PPE stocked: gloves, oven mitts, aprons.', 5),
      q(BAKERY_ID, 'Safety', 'Are oven warning labels in place?', 'Hot surface warnings posted on ovens.', 5),
    ],
  },
  {
    id: PRODUCE_ID,
    name: 'Produce & Floral',
    icon: 'Apple',
    questions: [
      q(PRODUCE_ID, 'Store Conditions', 'Is COOL labeling correct?', 'Country of Origin labels present and accurate for all produce.', 5),
      q(PRODUCE_ID, 'Store Conditions', 'Is the department free of mold and decay?', 'No visible mold or decaying product on display or in storage.', 5),
      q(PRODUCE_ID, 'Store Conditions', 'Is the department ready by 9 AM?', 'Product stocked, wet rack running, department presentable by opening.', 3),
      q(PRODUCE_ID, 'Store Conditions', 'Is the Produce Maxx crisping sink being used?', 'Crisping sink operational and being used per procedure.', 5),
      q(PRODUCE_ID, 'Store Conditions', 'Is the Produce Maxx wet rack running?', 'Wet rack misters functioning and running on schedule.', 5),
      q(PRODUCE_ID, 'Store Conditions', 'Can team member demonstrate proper crisping/trimming?', 'Team member shows correct produce crisping and trimming technique.', 5),

      q(PRODUCE_ID, 'Inventory', 'Is PI/CAO compliance maintained?', 'Perpetual inventory and computer-assisted ordering accurate.', 5),
      q(PRODUCE_ID, 'Inventory', 'Are crisping racks separating organic and conventional?', 'Organic and conventional produce clearly separated in crisping.', 5),

      q(PRODUCE_ID, 'Food Safety', 'Is code dating correct? (20 SKUs checked)', 'Random check of 20 SKUs shows proper dating.', 10),
      q(PRODUCE_ID, 'Food Safety', 'Are bagged salads and PHF items at proper temperature?', 'Bagged salads and potentially hazardous produce at 41°F or below.', 5),

      q(PRODUCE_ID, 'Safety', 'Are slip-resistant shoes worn?', 'All produce team members in approved footwear.', 5),
    ],
  },
  {
    id: BULK_ID,
    name: 'Bulk',
    icon: 'Package',
    questions: [
      q(BULK_ID, 'Store Conditions', 'Is COOL labeling correct?', 'Country of Origin labels accurate for bulk items.', 5),

      q(BULK_ID, 'Weights & Measures', 'Are random weight items accurate?', 'Bulk items weighing correctly on customer scales.', 5),

      q(BULK_ID, 'Food Safety', 'Do team members have food handler cards?', 'Valid food handler certifications on file.', 5),
      q(BULK_ID, 'Food Safety', 'Are lids and scoops clean?', 'Bulk bin lids and scoops clean and properly maintained.', 5),
      q(BULK_ID, 'Food Safety', 'Is code dating correct? (25 SKUs checked)', 'Random check of 25 SKUs shows proper dating.', 10),
    ],
  },
  {
    id: DAIRY_ID,
    name: 'Dairy',
    icon: 'Milk',
    questions: [
      q(DAIRY_ID, 'Inventory', 'Is PI/CAO compliance maintained?', 'Perpetual inventory and ordering accurate for dairy.', 5),
      q(DAIRY_ID, 'Inventory', 'Is Markdown Manager being used?', 'Markdowns applied to minimize dairy shrink.', 2, 'yes_no_partial', 1),

      q(DAIRY_ID, 'Food Safety', 'Are dairy cases at proper temperature?', 'All dairy coolers at 41°F or below.', 5),
      q(DAIRY_ID, 'Food Safety', 'Is code dating correct? (45 SKUs checked)', 'Random check of 45 SKUs shows proper dating and rotation.', 10),
    ],
  },
  {
    id: GROCERY_ID,
    name: 'Grocery',
    icon: 'ShoppingCart',
    questions: [
      q(GROCERY_ID, 'Inventory', 'Is Grocery PI/CAO compliance maintained?', 'Grocery perpetual inventory and ordering accurate.', 5),
      q(GROCERY_ID, 'Inventory', 'Is Frozen PI/CAO compliance maintained?', 'Frozen section perpetual inventory and ordering accurate.', 5),
      q(GROCERY_ID, 'Inventory', 'Is the Backroom Pick List being followed?', 'Backroom pick list worked daily; product moved to sales floor.', 5),

      q(GROCERY_ID, 'Food Safety', 'Is code dating correct? (65 SKUs checked)', 'Random check of 65 SKUs shows proper dating.', 10),
    ],
  },
  {
    id: VITAMINS_ID,
    name: 'Vitamins & HBA',
    icon: 'Pill',
    questions: [
      q(VITAMINS_ID, 'Inventory', 'Is the Backroom Pick List being followed?', 'Backroom pick list worked; product moved to floor.', 5),

      q(VITAMINS_ID, 'Loss Prevention', 'Is the Vitamin Shrink Program / Red Dot List followed?', 'High-shrink items on Red Dot List monitored; shrink program active.', 5),

      q(VITAMINS_ID, 'Food Safety', 'Is code dating correct? (25 SKUs checked)', 'Random check of 25 SKUs shows proper dating.', 10),
    ],
  },
];
