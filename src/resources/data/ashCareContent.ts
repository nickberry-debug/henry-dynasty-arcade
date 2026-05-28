// Ash's Care Guide — content for the 6 tabs of the care guide screen.
// Beckett (8-13ish) is the reader. Bearded dragon, juvenile (2 months
// old). Content sourced verbatim from Nick's prompt; reviewed for
// accuracy against common bearded-dragon husbandry. NOT a substitute
// for a vet — emergency tab tells Beckett to get a parent first.

export interface CareTab {
  id: string;
  label: string;
  emoji: string;
  /** Plain markdown — h1/h2/h3, lists, tables, blockquotes. */
  markdown: string;
}

export const CARE_TABS: CareTab[] = [
  {
    id: "feeding",
    label: "Feeding",
    emoji: "🍽️",
    markdown: `# Feeding Ash

## How old is Ash?
Ash is about 2 months old — a **juvenile** bearded dragon. Juveniles eat differently than adult dragons.

## What to feed Ash

### Mainly: live insects (about 80% of diet at this age)
Juvenile bearded dragons need lots of protein to grow.

**Best insects for Ash:**
- Small crickets (size matters — see "Bug Size Rule" below)
- Dubia roaches
- Phoenix worms (black soldier fly larvae)
- Small mealworms (sometimes — not too often)

### Also: fresh greens (about 20% of diet at this age)
Offer greens every day so Ash gets used to them.

**Good greens:**
- Collard greens
- Mustard greens
- Turnip greens
- Dandelion leaves (no pesticides!)
- Small pieces of bell pepper, squash, or carrots

**AVOID these:**
- Spinach (blocks calcium)
- Iceberg lettuce (no nutrition)
- Avocado (toxic!)
- Rhubarb (toxic!)

## The Bug Size Rule
**Never feed Ash a bug bigger than the space between Ash's eyes.**

A bug too big can cause serious problems. When in doubt, smaller is better.

## How often to feed

| When | What |
|------|------|
| 2–3 times a day | As many bugs as Ash eats in 10–15 minutes |
| Every morning | Fresh greens |
| Daily | Mist greens lightly so Ash drinks |

## Calcium powder — IMPORTANT
Sprinkle calcium powder on bugs before feeding:
- **5 days a week** at this age
- Use calcium **with** vitamin D3 if Ash doesn't get UVB lighting
- Use calcium **without** D3 if Ash has good UVB

## Feeding steps for Beckett
1. Wash hands before handling food
2. Put a few crickets in a small dish or cup
3. Sprinkle a tiny bit of calcium powder on the crickets
4. Shake gently to coat
5. Put the dish near Ash (don't drop bugs in the cage where they hide)
6. Watch Ash eat
7. Remove any bugs Ash doesn't eat after 15 minutes (they can bite Ash!)
8. Wash hands again

## Remember
- Always wash hands BEFORE and AFTER handling Ash or food
- Never feed bugs from outside (they can have germs)
- Always give fresh water and fresh greens daily
- If Ash isn't eating, tell mom or dad`,
  },
  {
    id: "habitat",
    label: "Habitat",
    emoji: "🌡️",
    markdown: `# Ash's Home (Habitat)

## Tank size
A juvenile bearded dragon needs:
- **Minimum 40-gallon tank** (longer than tall)
- Will need a bigger tank as Ash grows!

## Temperature zones — VERY important

Bearded dragons need to move between hot and cool spots to control their body temperature.

| Zone | Temperature | Notes |
|------|-------------|-------|
| Basking spot (hot side) | 95–110°F | Where Ash warms up in the morning |
| Cool side | 75–85°F | Where Ash cools down |
| Night time | 65–75°F | OK to let it drop at night |

**Use a thermometer to check daily!**

## Lighting
- **UVB light:** Needed 10–12 hours a day (like sunlight for Ash's bones)
- **Basking light:** Needed during the day for warmth
- **Lights OFF at night:** Ash needs darkness to sleep

## Substrate (floor)
For juveniles at 2 months:
- ✅ Reptile carpet (best for babies)
- ✅ Paper towels
- ✅ Tile

**Avoid for babies:**
- ❌ Sand (can be eaten and cause blockage)
- ❌ Wood chips
- ❌ Walnut shell

## What Ash needs in the tank
- A basking branch or rock to climb on
- A hide on the cool side
- A shallow water dish (small enough Ash can climb out)
- A food dish for greens

## Cleaning schedule
- **Daily:** Remove poop, replace water, clean food dish
- **Weekly:** Wipe down surfaces with reptile-safe cleaner
- **Monthly:** Deep clean — replace substrate, scrub tank`,
  },
  {
    id: "water",
    label: "Water",
    emoji: "💧",
    markdown: `# Water for Ash

## Daily water
- Fresh, clean water in a shallow dish every morning
- Dish should be shallow enough Ash can climb out if he falls in
- Change water if it gets dirty (poop, food, etc.)

## Bath time (twice a week)
Beardies often drink during baths!

1. Fill a sink or shallow container with **warm** (not hot!) water
2. Water should only come up to Ash's shoulders
3. Let Ash soak for 10–15 minutes
4. Gently splash water on Ash's body
5. Dry Ash with a soft towel
6. Put Ash back in the warm tank to dry completely

## Misting
Lightly mist Ash's greens once a day so the water drops are on the leaves. Ash will lick them.

**Don't spray water directly on Ash unless during a bath.**`,
  },
  {
    id: "schedule",
    label: "Schedule",
    emoji: "📅",
    markdown: `# Ash's Daily Routine

## Morning (7–9 AM)
- Turn on lights
- Check tank temperatures
- Mist greens
- Fresh greens in dish
- Fresh water in dish
- Watch Ash bask for warmth

## Late morning (10 AM – noon)
- First insect feeding (with calcium dust 5×/week)
- Remove uneaten insects after 15 minutes

## Afternoon (2–4 PM)
- Second insect feeding
- Check water, refresh if needed
- Remove uneaten insects

## Evening (5–7 PM)
- Third insect feeding (if Ash still hungry)
- Spot clean tank (remove any poop)
- Lights stay on until bedtime

## Night (8–9 PM)
- Turn off lights
- Ash sleeps in darkness

## Twice a week
- Bath time (10–15 minutes in warm shallow water)

## Once a week
- Wipe down tank surfaces
- Wash food and water dishes

## Once a month
- Deep clean tank
- Replace substrate`,
  },
  {
    id: "health",
    label: "Health",
    emoji: "🏥",
    markdown: `# Keeping Ash Healthy

## A healthy Ash looks like:
- Bright eyes
- Alert and curious
- Eats regularly
- Poops regularly (every 1–3 days at this age)
- Skin sheds in pieces over time
- Climbs and explores

## ⚠️ Warning signs — TELL A PARENT IF YOU SEE:

> 🚨 Won't eat for more than 2 days
> 🚨 Diarrhea (watery poop)
> 🚨 No poop for more than 5 days
> 🚨 Black beard (chin turns dark and stays dark for hours)
> 🚨 Sunken eyes
> 🚨 Limp tail or legs
> 🚨 Breathing with mouth open all the time
> 🚨 Discharge from eyes or nose
> 🚨 Stuck shed on toes or tail (can cut off circulation)
> 🚨 Falling or unable to climb normally

## Shedding
Beardies shed their skin in pieces. This is normal!
- Help by misting Ash a little extra during shed
- Never pull off skin — let it come off naturally
- If skin is stuck on toes or tail tip, tell a parent

## Brumation
When beardies get older, they sometimes sleep for weeks (called brumation). This is normal — but Ash is too young for this yet.`,
  },
  {
    id: "emergency",
    label: "Emergency",
    emoji: "📞",
    markdown: `# Emergency

## If Ash is hurt or very sick

### Step 1: Tell a parent IMMEDIATELY
Don't try to fix it alone.

### Step 2: Keep Ash warm
Move Ash to the warm side of the tank.

### Step 3: Don't feed
Don't try to feed a sick lizard.

### Step 4: Vet visit
A parent will call a reptile vet.

## Vet info
**Family fills this in — write your local reptile vet here.**

- Vet Name: __________________________
- Phone: __________________________
- Address: __________________________

## After-hours emergency
If something happens at night or on the weekend, find:
- 24-hour exotic animal hospital
- Emergency vet that sees reptiles`,
  },
];
