/**
 * seed-curriculum.mjs
 * Inserts NZ Year 4 Beast Academy (math) and IEW (writing) lessons into Supabase.
 *
 * Usage:
 *   node seed-curriculum.mjs
 *
 * Requires VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the environment
 * (or a .env file in the same directory).
 */

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
config()

const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('❌  Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

// ─────────────────────────────────────────────────────────────────────────────
// BEAST ACADEMY MATH  — NZ Year 4 (ages 8-9, NZC Level 2-3)
// Approach: puzzle-framing, comic-style scenarios, visual thinking, non-routine
// ─────────────────────────────────────────────────────────────────────────────
const BEAST_ACADEMY = [

  // ── Unit 1: Shape Detectives ──────────────────────────────────────────────
  {
    curriculum: 'beast-academy', subject: 'Mathematics', subject_color: '#6366f1',
    unit_number: 1, unit_title: 'Shape Detectives',
    lesson_number: 1, title: 'Right Angle Hunters',
    description: 'Spot right angles hiding in 2D shapes and everyday objects.',
    content: `A right angle is a "square corner" — exactly 90 degrees. You can check for one by placing the corner of a piece of paper against it. If the edges line up perfectly, it's a right angle!

Shapes like squares and rectangles are packed with right angles (4 each). Triangles can have one right angle too — that makes them a right-angle triangle.

Look around the room: corners of books, windows, doors, and tables are almost all right angles.`,
    question: `1. Draw a square, a rectangle, and a right-angle triangle. Circle every right angle in each shape. How many right angles did you find in total?

2. Sam says, "A regular hexagon has right angles." Is Sam right or wrong? Explain your thinking.

3. Name 3 real objects in your home that have right angles. Draw a small sketch of each.`,
    hint: 'Use the corner of this page to test whether an angle in your drawing is a right angle.',
    difficulty: 'foundation', duration_min: 15, grade: 'Year 4', country: 'NZ',
  },
  {
    curriculum: 'beast-academy', subject: 'Mathematics', subject_color: '#6366f1',
    unit_number: 1, unit_title: 'Shape Detectives',
    lesson_number: 2, title: 'Sides and Vertices',
    description: 'Classify 2D shapes by counting their sides and corners.',
    content: `Every 2D shape has sides (straight edges) and vertices (corners). Counting them is the key to naming a shape:
• 3 sides → triangle
• 4 sides → quadrilateral (squares, rectangles, and rhombuses are all quadrilaterals)
• 5 sides → pentagon
• 6 sides → hexagon
• 8 sides → octagon

A "regular" shape has all sides equal AND all angles equal (like a regular hexagon in a honeycomb). An "irregular" shape doesn't.`,
    question: `1. Draw each shape and fill in the table:
   | Shape | Sides | Vertices |
   | Triangle | ? | ? |
   | Pentagon | ? | ? |
   | Octagon  | ? | ? |

2. A shape has 4 sides. Two sides are 5 cm long and two sides are 3 cm long. All four angles are right angles. What is the name of this shape?

3. PUZZLE: I have more sides than a square but fewer than a hexagon. I am a regular shape. What am I? Draw it.`,
    hint: 'Count every corner to count vertices — the number of sides always equals the number of vertices.',
    difficulty: 'foundation', duration_min: 15, grade: 'Year 4', country: 'NZ',
  },
  {
    curriculum: 'beast-academy', subject: 'Mathematics', subject_color: '#6366f1',
    unit_number: 1, unit_title: 'Shape Detectives',
    lesson_number: 3, title: 'Symmetry Explorer',
    description: 'Find lines of symmetry by folding (or imagining folding) shapes.',
    content: `A line of symmetry divides a shape into two mirror-image halves. If you fold the shape along that line, both halves match exactly.

Some shapes have many lines of symmetry:
• A square has 4 lines of symmetry
• An equilateral triangle has 3
• A rectangle (non-square) has only 2
• A regular hexagon has 6!

Letters of the alphabet can be symmetric too — try A, H, M, O, X.`,
    question: `1. Draw a square and show all its lines of symmetry (there are 4). Label each one.

2. Which capital letters have a horizontal line of symmetry (a fold-line going left-right)? List as many as you can.

3. CHALLENGE: Draw a shape that has exactly 1 line of symmetry. Now draw one that has NO lines of symmetry. Label both.`,
    hint: 'Fold an imaginary piece of paper — if both sides stack perfectly, you found a line of symmetry.',
    difficulty: 'developing', duration_min: 20, grade: 'Year 4', country: 'NZ',
  },
  {
    curriculum: 'beast-academy', subject: 'Mathematics', subject_color: '#6366f1',
    unit_number: 1, unit_title: 'Shape Detectives',
    lesson_number: 4, title: 'Shape Puzzle Challenge',
    description: 'Combine and cut shapes to create new ones — spatial reasoning in action.',
    content: `A tangram is an ancient Chinese puzzle with 7 pieces (2 large triangles, 1 medium triangle, 2 small triangles, 1 square, 1 parallelogram). The pieces can be rearranged to make hundreds of different shapes — a cat, a rocket, a house, or a person!

The key insight: shapes can be composed (put together) and decomposed (cut apart). A square can be cut into two right-angle triangles. Two triangles can be combined to make a parallelogram.

This is the same skill you use when working out the area of irregular shapes.`,
    question: `1. Draw a 4×4 square on grid paper. Cut it (with a diagonal line) into 2 triangles. What type of triangles are they?

2. Draw a rectangle on grid paper. Show two DIFFERENT ways to cut it into triangles or smaller shapes.

3. PUZZLE: Using only 2 triangles of equal size, what quadrilaterals can you make? Name them and draw each one.`,
    hint: 'Put shapes edge-to-edge and see what new shape appears — keep rotating and flipping.',
    difficulty: 'developing', duration_min: 20, grade: 'Year 4', country: 'NZ',
  },
  {
    curriculum: 'beast-academy', subject: 'Mathematics', subject_color: '#6366f1',
    unit_number: 1, unit_title: 'Shape Detectives',
    lesson_number: 5, title: '3D Shape Safari',
    description: 'Identify 3D shapes by their faces, edges, and vertices.',
    content: `3D shapes have faces (flat surfaces), edges (where two faces meet), and vertices (corner points).

Key 3D shapes:
• Cube — 6 square faces, 12 edges, 8 vertices
• Rectangular prism (cuboid) — 6 rectangular faces, 12 edges, 8 vertices
• Cylinder — 2 circular faces, 1 curved surface, no vertices
• Sphere — 0 flat faces, 0 edges, 0 vertices
• Cone — 1 circular face, 1 curved surface, 1 vertex
• Triangular prism — 5 faces (2 triangles, 3 rectangles), 9 edges, 6 vertices

Real-life examples: dice (cube), soup can (cylinder), ice-cream cone (cone), football (sphere).`,
    question: `1. Fill in the table for each shape:
   | Shape | Faces | Edges | Vertices |
   | Cube | | | |
   | Triangular Prism | | | |
   | Cone | | | |

2. I have 6 faces, all rectangles (but not all the same size). What am I?

3. Look around your home — find one real object for each: cube, cylinder, sphere, cone. Write what each object is.`,
    hint: 'Count carefully — curved surfaces are NOT faces. Only flat surfaces count as faces.',
    difficulty: 'developing', duration_min: 20, grade: 'Year 4', country: 'NZ',
  },

  // ── Unit 2: Multiplication Quests ─────────────────────────────────────────
  {
    curriculum: 'beast-academy', subject: 'Mathematics', subject_color: '#6366f1',
    unit_number: 2, unit_title: 'Multiplication Quests',
    lesson_number: 1, title: 'Skip Counting Sprints',
    description: 'Build multiplication fluency by skip counting in 2s, 5s, and 10s.',
    content: `Skip counting is the foundation of multiplication. When you count by 5s (5, 10, 15, 20, 25…), you are actually listing the 5 times table!

Patterns to know:
• ×2: always ends in 0, 2, 4, 6, 8 (even numbers)
• ×5: always ends in 0 or 5
• ×10: just add a zero

These patterns are like secret codes — once you know them, you can check if an answer "feels right".`,
    question: `1. Fill in the gaps in each skip-counting sequence:
   a) 2, 4, __, 8, __, 12, __, __
   b) 5, __, 15, __, __, 30, __, 40
   c) 10, __, 30, __, 50, __, __

2. Which of these numbers appear in BOTH the ×2 and ×5 count-bys? Circle them:
   10  12  15  20  22  25  30  35  40  45  50

3. PUZZLE: I start at 0 and skip count by 5. Will I ever land on 37? Will I land on 45? Explain how you know without counting all the way there.`,
    hint: 'For question 3, think about the pattern of endings for ×5 numbers.',
    difficulty: 'foundation', duration_min: 15, grade: 'Year 4', country: 'NZ',
  },
  {
    curriculum: 'beast-academy', subject: 'Mathematics', subject_color: '#6366f1',
    unit_number: 2, unit_title: 'Multiplication Quests',
    lesson_number: 2, title: 'Array Art',
    description: 'Draw rectangular arrays to visualise multiplication facts.',
    content: `An array is a rectangle of dots arranged in rows and columns. Arrays show why multiplication is "groups of":
• 3 × 4 means 3 rows of 4 dots → 12 dots total

The commutative property: 3 × 4 = 4 × 3, because if you rotate the array sideways, you get 4 rows of 3 — still 12 dots! This halves the number of facts you need to memorise.

Arrays also show division: a 3×4 array of 12 dots can be split into 3 groups of 4 OR 4 groups of 3.`,
    question: `1. Draw an array for 4 × 6. Label rows and columns. Write the multiplication fact and the answer.

2. Draw the ROTATED version of your 4 × 6 array. What multiplication fact does it show?

3. A farmer plants 35 seeds in a rectangular grid with 5 rows. How many seeds are in each row? Draw the array and write the multiplication and division fact family (4 facts).

4. PUZZLE: Can 17 dots be arranged into a perfect rectangle? Explain why or why not.`,
    hint: 'For question 4, think about what numbers can be divided evenly into equal groups.',
    difficulty: 'foundation', duration_min: 20, grade: 'Year 4', country: 'NZ',
  },
  {
    curriculum: 'beast-academy', subject: 'Mathematics', subject_color: '#6366f1',
    unit_number: 2, unit_title: 'Multiplication Quests',
    lesson_number: 3, title: 'Times Table Tricks: ×3, ×4, ×6',
    description: 'Learn sneaky shortcuts for the trickier times tables.',
    content: `Once you know ×2 and ×3, you can build others:

×4 trick: Double, then double again!
  4 × 7 = (2 × 7) × 2 = 14 × 2 = 28

×3 digit sum trick: A number is in the ×3 table if its digits add up to a multiple of 3.
  Try 27: 2 + 7 = 9 → 9 is divisible by 3, so 27 is in the ×3 table ✓
  Try 23: 2 + 3 = 5 → 5 is NOT divisible by 3, so 23 is not in the ×3 table ✗

×6 trick: ×6 is just ×3, doubled!
  6 × 8 = (3 × 8) × 2 = 24 × 2 = 48`,
    question: `1. Use the "double-double" trick to solve: 4 × 9, 4 × 7, 4 × 12. Show your working.

2. Use the ×3 digit-sum trick to decide (without dividing): which of these are in the ×3 table?
   18, 25, 33, 41, 54, 62, 72

3. Use the ×6 = ×3-doubled trick to solve: 6 × 7, 6 × 9, 6 × 11. Show your steps.

4. PUZZLE: What is 4 × 6? Can you get the same answer using BOTH tricks above? Show both ways.`,
    hint: 'For the double-double trick: solve the ×2 first, then double that result.',
    difficulty: 'developing', duration_min: 20, grade: 'Year 4', country: 'NZ',
  },
  {
    curriculum: 'beast-academy', subject: 'Mathematics', subject_color: '#6366f1',
    unit_number: 2, unit_title: 'Multiplication Quests',
    lesson_number: 4, title: 'Mystery Multiplications: ×7, ×8, ×9',
    description: 'Crack the toughest times tables with finger tricks and near-facts.',
    content: `The ×9 finger trick:
Hold up 10 fingers. To multiply 9 × N, fold down finger N from the left.
Fingers to the LEFT of the folded finger = tens digit.
Fingers to the RIGHT = ones digit.
Try 9 × 7: fold down finger 7. You have 6 fingers left and 3 right → 63 ✓

×8 = double, double, double:
  8 × 6 = 2×6 = 12, doubled = 24, doubled = 48

×7 near-facts: use a fact you know and adjust.
  7 × 8 = (5 × 8) + (2 × 8) = 40 + 16 = 56`,
    question: `1. Use the ×9 finger trick to solve: 9 × 4, 9 × 8, 9 × 6. Check your answers by adding digits (they should sum to 9).

2. Use the triple-double trick to solve: 8 × 7, 8 × 9, 8 × 4. Show all three doubling steps.

3. Use near-facts to solve 7 × 9: start from 5 × 9 = 45 and adjust. Show your working.

4. PUZZLE: What is 7 × 8? Three students each used a different trick. Describe two different ways to get the answer.`,
    hint: 'For ×9, the digits of the answer always add up to 9 — use that to check your work.',
    difficulty: 'developing', duration_min: 20, grade: 'Year 4', country: 'NZ',
  },
  {
    curriculum: 'beast-academy', subject: 'Mathematics', subject_color: '#6366f1',
    unit_number: 2, unit_title: 'Multiplication Quests',
    lesson_number: 5, title: 'Multiplication Word Problems',
    description: 'Apply times tables to real-world puzzle problems.',
    content: `Word problems are where multiplication gets real. The key is to find the "groups of" structure hidden in the problem:

• "4 bags, each with 6 apples" → 4 × 6
• "A table has 7 legs, there are 4 tables" → 7 × 4

Also watch for two-step problems, where you multiply THEN add or subtract. Read carefully, draw a picture, then write the equation.`,
    question: `1. A packet of stickers has 9 stickers. Mia buys 7 packets. How many stickers does she have in total?

2. A school hall has 8 rows of chairs. Each row has 6 chairs. How many chairs are there? If 15 chairs are removed, how many remain?

3. There are 5 teams in a sports day. Each team has 9 players. 3 players from each team are absent. How many players are actually present? (Two-step problem — show your working.)

4. PUZZLE: Leo buys 6 packs of juice boxes. Each pack holds 4 boxes. He also has 7 single juice boxes. How many juice boxes altogether? Write the equation and solve.`,
    hint: 'Draw a quick picture or label "groups of" before writing any numbers.',
    difficulty: 'developing', duration_min: 20, grade: 'Year 4', country: 'NZ',
  },

  // ── Unit 3: Fraction Land ─────────────────────────────────────────────────
  {
    curriculum: 'beast-academy', subject: 'Mathematics', subject_color: '#6366f1',
    unit_number: 3, unit_title: 'Fraction Land',
    lesson_number: 1, title: 'What Is a Fraction?',
    description: 'Understand that a fraction names equal parts of a whole.',
    content: `A fraction describes equal parts of a whole. The bottom number (denominator) tells you how many equal parts the whole is cut into. The top number (numerator) tells you how many of those parts you are talking about.

1/2 = the whole is cut into 2 equal parts, you have 1 of them
3/4 = the whole is cut into 4 equal parts, you have 3 of them

IMPORTANT: the parts must be EQUAL. A pizza cut into one huge slice and one tiny slice — that's not halves, even though there are two pieces!`,
    question: `1. Draw three circles. Shade:
   a) 1/2 of the first circle (in 2 equal parts)
   b) 1/4 of the second circle (in 4 equal parts)
   c) 2/3 of the third circle (in 3 equal parts)

2. Sam cuts a sandwich diagonally and says "I've cut it into halves." The two pieces are not the same size. Is Sam right? Explain.

3. Write the fraction shown: "A chocolate bar has 8 squares. Lila eats 3 squares." What fraction has Lila eaten? What fraction is left?`,
    hint: 'Draw the whole shape first, divide it into equal parts, then shade the right number.',
    difficulty: 'foundation', duration_min: 15, grade: 'Year 4', country: 'NZ',
  },
  {
    curriculum: 'beast-academy', subject: 'Mathematics', subject_color: '#6366f1',
    unit_number: 3, unit_title: 'Fraction Land',
    lesson_number: 2, title: 'Fraction Bars',
    description: 'Use fraction bars to compare fractions and understand equivalence.',
    content: `A fraction bar is a rectangle divided into equal parts. Stacking fraction bars helps you see which fractions are bigger and which are equivalent (equal in size but different in appearance).

Key comparisons:
• Same denominator: 3/5 > 2/5 (more parts of the same size)
• Same numerator: 1/3 > 1/5 (the parts in thirds are bigger than parts in fifths)
• Half of anything: 1/2 = 2/4 = 3/6 = 4/8 (equivalent fractions)`,
    question: `1. Draw fraction bars (rectangles all the same length) divided into halves, thirds, quarters, and eighths. Shade:
   - 1/2 in the halves bar
   - 2/4 in the quarters bar
   Do 1/2 and 2/4 reach the same point? What does this tell you?

2. Which is larger, 3/4 or 5/8? Draw fraction bars to show your answer.

3. Find two equivalent fractions for 1/3 by drawing fraction bars (hint: try sixths and ninths).`,
    hint: 'Draw all bars the same length — the visual comparison only works when the wholes are equal.',
    difficulty: 'developing', duration_min: 20, grade: 'Year 4', country: 'NZ',
  },
  {
    curriculum: 'beast-academy', subject: 'Mathematics', subject_color: '#6366f1',
    unit_number: 3, unit_title: 'Fraction Land',
    lesson_number: 3, title: 'Fractions of a Set',
    description: 'Find fractions of a group of objects, not just a single shape.',
    content: `Fractions work for groups of objects, not just shapes! To find a fraction of a set:

Step 1: Divide the total into equal groups (total ÷ denominator)
Step 2: Count how many groups you need (× numerator)

Example: 1/4 of 20
Step 1: 20 ÷ 4 = 5 (each group has 5)
Step 2: 1 × 5 = 5

So 1/4 of 20 = 5.

Now try: 3/4 of 20
Step 1: 20 ÷ 4 = 5
Step 2: 3 × 5 = 15`,
    question: `1. Find: a) 1/2 of 16   b) 1/4 of 28   c) 1/3 of 21
   Show your working with the two steps.

2. Find: a) 3/4 of 24   b) 2/5 of 30   c) 3/8 of 40

3. In a class of 32 students, 3/4 are wearing school uniform. How many students are in uniform? How many are not?

4. PUZZLE: 1/3 of a number is 9. What is the number? Explain your reasoning.`,
    hint: 'For question 4, work backwards: if 1/3 = 9, then the whole = 9 × 3.',
    difficulty: 'developing', duration_min: 20, grade: 'Year 4', country: 'NZ',
  },
  {
    curriculum: 'beast-academy', subject: 'Mathematics', subject_color: '#6366f1',
    unit_number: 3, unit_title: 'Fraction Land',
    lesson_number: 4, title: 'Ordering Fractions',
    description: 'Put fractions in order from smallest to largest using reasoning, not just pictures.',
    content: `Three strategies for ordering fractions:

1. Same denominator: compare numerators. 2/7 < 5/7 because 2 < 5.

2. Same numerator: compare denominators — BIGGER denominator means SMALLER pieces.
   1/3 > 1/7 because thirds are bigger chunks than sevenths.

3. Benchmark: compare to 1/2. Is the fraction less than, equal to, or greater than 1/2?
   3/8 < 1/2 (because 4/8 = 1/2 and 3 < 4)
   5/8 > 1/2 (because 5 > 4)`,
    question: `1. Order from smallest to largest: 3/8, 1/8, 7/8, 5/8.

2. Order from largest to smallest: 1/2, 1/5, 1/3, 1/10.

3. Use the benchmark 1/2 to sort into two groups (less than 1/2 and greater than 1/2):
   2/5, 3/4, 1/6, 7/10, 5/12, 4/7.

4. CHALLENGE: Put these in order without drawing: 3/5, 2/3, 7/10.
   Hint: convert 3/5 and 2/3 to tenths first.`,
    hint: 'For question 4, find a common denominator (10 or 15) to make comparison easy.',
    difficulty: 'advanced', duration_min: 25, grade: 'Year 4', country: 'NZ',
  },
  {
    curriculum: 'beast-academy', subject: 'Mathematics', subject_color: '#6366f1',
    unit_number: 3, unit_title: 'Fraction Land',
    lesson_number: 5, title: 'Fraction Word Problems',
    description: 'Solve multi-step problems that mix fractions with real-world scenarios.',
    content: `Fraction word problems often combine finding a fraction of a set WITH adding, subtracting, or comparing. Always:
1. Identify WHAT you are finding a fraction of (the whole)
2. Calculate the fraction
3. Answer the actual question asked (which might need a second step)

Watch for "the remaining" — if 1/3 is used, then 2/3 remain.`,
    question: `1. A recipe needs 3/4 of a cup of flour. Mia wants to make the recipe twice. How much flour does she need altogether?

2. Jake has 40 marbles. He gives 1/4 to his sister and 1/8 to his friend. How many marbles does he have left?

3. A bookshelf has 36 books. 1/3 are maths books, 1/4 are science books, and the rest are storybooks. How many storybooks are there?

4. CHALLENGE: Zara has some money. She spends 1/2 on a book and 1/4 on lunch. She has $6 left. How much money did she start with?`,
    hint: 'For question 4, after spending 1/2 + 1/4 = 3/4, the $6 left is 1/4 of her start amount.',
    difficulty: 'advanced', duration_min: 25, grade: 'Year 4', country: 'NZ',
  },
]

// ─────────────────────────────────────────────────────────────────────────────
// IEW (INSTITUTE FOR EXCELLENCE IN WRITING) — NZ Year 4
// Approach: keyword outlines, structural models, dress-ups, sentence openers
// ─────────────────────────────────────────────────────────────────────────────
const IEW = [

  // ── Unit 1: Keyword Magic ─────────────────────────────────────────────────
  {
    curriculum: 'iew', subject: 'Writing', subject_color: '#10b981',
    unit_number: 1, unit_title: 'Keyword Magic',
    lesson_number: 1, title: 'What Are Keywords?',
    description: 'Learn to pick the 3 most important words from any sentence.',
    content: `A keyword is the most important word in a sentence — a word that holds the meaning. When you pick keywords, you are training your brain to find the core idea.

Rules for picking keywords:
• Choose only 3 keywords per sentence (or short phrase)
• Keywords are usually nouns (people, places, things) or strong verbs (action words)
• Small words like "a", "the", "and", "was" are usually NOT keywords
• Numbers and names count as keywords
• You may use symbols: → for "leads to", = for "equals"

Example: "The enormous blue whale swam silently through the Pacific Ocean."
Keywords: whale, swam, Pacific (3 words that capture the whole idea)`,
    question: `Practice picking 3 keywords for each sentence below. Write only the keywords (no full sentences):

1. "The brown dog chased the red ball across the park."
2. "New Zealand has two main islands in the South Pacific."
3. "Katrina practised her speech in front of the mirror every evening."
4. "The ancient volcano erupted and covered the village in ash."
5. "Scientists discovered a new species of deep-sea fish near Antarctica."

After choosing your keywords, pick ONE sentence and use your keywords to retell it in your own words. Did you get the main idea?`,
    hint: 'Cross out all small words (a, the, and, was, is, to) first — what\'s left are your candidates.',
    difficulty: 'foundation', duration_min: 15, grade: 'Year 4', country: 'NZ',
  },
  {
    curriculum: 'iew', subject: 'Writing', subject_color: '#10b981',
    unit_number: 1, unit_title: 'Keyword Magic',
    lesson_number: 2, title: 'Make a Keyword Outline',
    description: 'Read a paragraph and create a keyword outline — your notes, your words.',
    content: `A keyword outline (KWO) is a way of taking notes using only keywords. You read a paragraph, pick 3 keywords per sentence, and write them in a list. Then you set the paragraph aside and retell it using ONLY your keyword list.

Why does this work? Your brain processes and stores the keywords as a memory anchor. When you retell it, you use your OWN words — that's real learning!

Format:
1. ___  ___  ___    (keywords from sentence 1)
2. ___  ___  ___    (keywords from sentence 2)
   etc.`,
    question: `Read this passage, then create a keyword outline (3 keywords per sentence). After writing your outline, put the passage aside and use ONLY your keywords to write the information back in your own words.

PASSAGE:
"Kiwi birds are native to New Zealand. They cannot fly because their wings are too small. Instead, they use their strong legs to run quickly through the bush. Kiwis are nocturnal, which means they sleep during the day and come out at night. They use their long beaks to sniff out worms and insects in the soil."

Write your 5-line keyword outline, then write your retelling (5 sentences, your own words).`,
    hint: 'Write your KWO first, then put your eyes on the KWO only — no peeking at the passage!',
    difficulty: 'foundation', duration_min: 20, grade: 'Year 4', country: 'NZ',
  },
  {
    curriculum: 'iew', subject: 'Writing', subject_color: '#10b981',
    unit_number: 1, unit_title: 'Keyword Magic',
    lesson_number: 3, title: 'Retell It Your Way',
    description: 'Use a keyword outline to write a polished paragraph in your own words.',
    content: `Now we go one step further: you will take a keyword outline and write a proper paragraph from it.

A good paragraph has:
• A topic sentence (introduces the main idea)
• 3-4 detail sentences (support the main idea with evidence or examples)
• A closing sentence (wraps up or gives a "so what")

When writing from your keyword outline, you may add connecting words like "because", "however", "for example", and "as a result" to make the paragraph flow smoothly.`,
    question: `Here is a keyword outline about dolphins. Write a full paragraph using it. Use your OWN words — don't just add words between the keywords.

KEYWORD OUTLINE:
1. dolphins, intelligent, mammals
2. live, oceans, groups (pods)
3. communicate, clicks, whistles
4. leap, play, acrobatic
5. help, humans, fishermen

Your paragraph should have:
- A topic sentence about dolphins
- 4 detail sentences from the keywords
- A closing sentence
- At least 5 connecting words (because, however, also, for example, as a result)`,
    hint: 'Write your topic sentence first without looking at the keywords — what is the BIG IDEA about dolphins?',
    difficulty: 'developing', duration_min: 20, grade: 'Year 4', country: 'NZ',
  },
  {
    curriculum: 'iew', subject: 'Writing', subject_color: '#10b981',
    unit_number: 1, unit_title: 'Keyword Magic',
    lesson_number: 4, title: 'Outline a Story',
    description: 'Apply keyword outlining to a story passage — capturing plot, not just facts.',
    content: `Keyword outlines work for stories too! For stories, your keywords need to capture:
• WHO the story is about
• WHAT happens (the main actions)
• HOW it ends or how the character feels

Because stories have more personal and descriptive language, you might occasionally use 4 keywords per sentence for a really important moment. But keep it to 3 whenever possible.

Also: for a story retell, you are allowed to add your OWN descriptive words when you write it back — the keywords are just the skeleton. You put the flesh on!`,
    question: `Read this short story, create a keyword outline, then retell it in your own words (adding vivid descriptions).

STORY:
"Maya walked nervously to the starting line. She had trained for this race for six months. The whistle blew, and she sprinted forward. Her legs burned as she rounded the final bend. She crossed the finish line first and threw her hands in the air. Her coach ran over and gave her a huge hug."

Steps:
1. Write your keyword outline (3 keywords per sentence)
2. Put the story away
3. Retell the story in your own words, adding at least 3 of your own descriptive words (adjectives or -ly adverbs)`,
    hint: 'Your retelling should sound like YOU told the story, not like you copied it — change the sentence order if you like!',
    difficulty: 'developing', duration_min: 25, grade: 'Year 4', country: 'NZ',
  },
  {
    curriculum: 'iew', subject: 'Writing', subject_color: '#10b981',
    unit_number: 1, unit_title: 'Keyword Magic',
    lesson_number: 5, title: 'Write Your Own KWO',
    description: 'Choose your own topic, build a keyword outline from scratch, then write a paragraph.',
    content: `This lesson flips the process — instead of outlining someone else's writing, YOU create the keywords first as a brainstorm, then write from them.

Steps for writing from your OWN keyword outline:
1. Choose a topic you know well
2. Brainstorm 5-6 ideas about that topic (each idea = one line in the outline)
3. Compress each idea into 3 keywords
4. Write a paragraph using your keyword outline
5. Add a title

This is how professional writers plan! A keyword outline is a flexible, fast planning tool.`,
    question: `Choose ONE of these topics (or your own):
• Your favourite sport or hobby
• An animal you find fascinating
• A place in New Zealand you have visited or would like to visit

Steps:
1. Write a 5-line keyword outline about your topic
2. Write a full paragraph from your outline (topic sentence + 4 details + closing)
3. Give your paragraph a title
4. Underline 3 words you are proud of choosing`,
    hint: 'If you get stuck on keywords, say your idea out loud — then write the 3 most important words you said.',
    difficulty: 'developing', duration_min: 25, grade: 'Year 4', country: 'NZ',
  },

  // ── Unit 2: Dress-Ups ─────────────────────────────────────────────────────
  {
    curriculum: 'iew', subject: 'Writing', subject_color: '#10b981',
    unit_number: 2, unit_title: 'Dress-Ups',
    lesson_number: 1, title: 'Strong Adjectives',
    description: 'Replace weak, boring adjectives with vivid, specific ones.',
    content: `An adjective describes a noun (a person, place, or thing). Weak adjectives like "big", "nice", "good", and "bad" are so common they've lost their power. Strong adjectives paint a picture.

Upgrade examples:
• "a big dog" → "a shaggy, barrel-chested dog"
• "a nice day" → "a sparkling, golden afternoon"
• "a bad smell" → "a pungent, rotting stench"

The IEW quality adjective rule: use at least ONE strong adjective somewhere in every paragraph you write. Underline it so your reader can see it.`,
    question: `1. Replace the underlined weak adjective with a strong one. Rewrite each sentence:
   a) The dog had a "big" bark.
   b) We walked through a "nice" forest.
   c) She wore a "pretty" dress to the party.
   d) The food at the restaurant was "good".
   e) It was a "bad" storm.

2. Choose 3 of these nouns and write a sentence for each, using a strong adjective you choose yourself:
   mountain, ocean, classroom, sandwich, bird

3. Look at the paragraph below and find the two weakest adjectives. Rewrite the paragraph with stronger ones:
   "We sat by the big river and ate our good lunch. The small birds were singing in the nice trees."`,
    hint: 'Ask yourself: what does it ACTUALLY look/sound/smell/taste/feel like? Then find a word for that.',
    difficulty: 'foundation', duration_min: 15, grade: 'Year 4', country: 'NZ',
  },
  {
    curriculum: 'iew', subject: 'Writing', subject_color: '#10b981',
    unit_number: 2, unit_title: 'Dress-Ups',
    lesson_number: 2, title: '-ly Adverbs',
    description: 'Add -ly adverbs to show HOW actions happen and make writing more vivid.',
    content: `An adverb modifies a verb — it tells you HOW something is done. Many adverbs end in "-ly":
slowly, quickly, nervously, gracefully, ferociously, silently, triumphantly.

IEW -ly adverb rule: include at least one -ly adverb per paragraph. Underline it.

Good placement:
• At the start: "Quietly, she opened the door."
• In the middle: "The cat stealthily crept forward."
• At the end: "He finished the race triumphantly."

Avoid boring -ly words like "really", "very", "quickly" unless you have no better option.`,
    question: `1. Add a strong -ly adverb to each sentence. Rewrite the sentence:
   a) The lion walked toward its prey.
   b) She answered the teacher's question.
   c) He opened the birthday present.
   d) The rain fell on the tin roof.
   e) The astronaut stepped onto the moon.

2. Write 3 sentences about a thunderstorm, each using a different -ly adverb. Underline each adverb.

3. Which of these -ly adverbs is STRONGEST / most interesting? Rank them 1 (most interesting) to 5 (least):
   rapidly, swiftly, briskly, hurriedly, speedily
   Explain your top choice — what image does it create?`,
    hint: 'Think about the emotion or manner: was it done with fear? With joy? With sneakiness? Find a -ly word for that feeling.',
    difficulty: 'foundation', duration_min: 15, grade: 'Year 4', country: 'NZ',
  },
  {
    curriculum: 'iew', subject: 'Writing', subject_color: '#10b981',
    unit_number: 2, unit_title: 'Dress-Ups',
    lesson_number: 3, title: 'Who/Which Clauses',
    description: 'Add detail to nouns by attaching "who" (people) or "which" (things) clauses.',
    content: `A "who/which" clause is a phrase that gives extra information about a noun. It sits right after the noun it describes and is separated by commas.

For people → use "who":
"Maya, who had trained for months, crossed the finish line first."

For things → use "which":
"The old bridge, which was covered in moss, creaked in the wind."

IEW rule: include at least one who/which clause per piece of writing. Underline it.

The clause must have its own verb. "The dog, which was huge" ✓ (has "was"). "The dog, which big" ✗ (no verb).`,
    question: `1. Add a who/which clause to each sentence. Rewrite the full sentence:
   a) "The teacher called the class to attention." (add a "who" clause after "teacher")
   b) "The old library was destroyed in the flood." (add a "which" clause after "library")
   c) "Mia won first place." (add a "who" clause after "Mia")

2. Write 2 sentences of your own, each with a who/which clause. Underline the clause in each.

3. Find the error in this sentence and fix it:
   "The cake, which delicious, was eaten by all the children."`,
    hint: 'The clause needs a verb! "who ran quickly" or "which was battered" — both have verbs.',
    difficulty: 'developing', duration_min: 20, grade: 'Year 4', country: 'NZ',
  },
  {
    curriculum: 'iew', subject: 'Writing', subject_color: '#10b981',
    unit_number: 2, unit_title: 'Dress-Ups',
    lesson_number: 4, title: 'Because Clauses',
    description: 'Use "because" to connect ideas and give reasons, deepening your writing.',
    content: `The word "because" is one of the most powerful connectors in writing. It forces you to explain your thinking and adds depth.

"The sky turned red" — a simple fact.
"The sky turned red because dust particles from the erupting volcano scattered the sunlight." — now we have an explanation!

IEW because clause rule: use at least one "because" clause per paragraph. Underline it.

Because can go in the middle OR at the start of a sentence:
• "She studied hard because she wanted to pass."
• "Because she wanted to pass, she studied hard." (start = comma after the because-clause)`,
    question: `1. Complete each sentence with a strong "because" clause:
   a) "The penguin couldn't fly because ___"
   b) "New Zealand has no native land mammals (except bats) because ___"
   c) "The team won the championship because ___"

2. Rewrite 2 of your because sentences so that "because" comes at the START. Remember the comma!

3. Find the weak because clause and improve it:
   "She liked science because it was fun."
   → Rewrite it with a more specific, interesting reason.

4. Write a 3-sentence paragraph about an animal of your choice. Include at least one because clause. Underline it.`,
    hint: 'A strong because clause answers "why exactly?" — be as specific as possible.',
    difficulty: 'developing', duration_min: 20, grade: 'Year 4', country: 'NZ',
  },
  {
    curriculum: 'iew', subject: 'Writing', subject_color: '#10b981',
    unit_number: 2, unit_title: 'Dress-Ups',
    lesson_number: 5, title: 'Dress Up a Paragraph',
    description: 'Combine all four dress-ups in one paragraph: strong adjective, -ly adverb, who/which, because.',
    content: `You now have four powerful dress-up tools:
1. Strong adjective — describes a noun vividly
2. -ly adverb — describes HOW an action happens
3. Who/which clause — gives extra detail about a noun
4. Because clause — explains WHY something happens

The goal is to use ALL FOUR in a single paragraph — not stuffed awkwardly, but woven in naturally. Read your paragraph aloud. If a dress-up sounds forced, move it or cut it.

A checklist for your paragraph:
☐ Strong adjective (underline once)
☐ -ly adverb (underline once)
☐ Who/which clause (put in [square brackets])
☐ Because clause (circle)`,
    question: `Write a paragraph of 5-6 sentences about ONE of these topics:
• A powerful storm you experienced or imagined
• A visit to the beach, bush, or mountains
• Meeting a memorable animal (real or imaginary)

Requirements — your paragraph MUST include and be labelled:
• At least 1 strong adjective (underline)
• At least 1 -ly adverb (underline)
• At least 1 who/which clause (square brackets)
• At least 1 because clause (circle)
• A title

Read it aloud once after writing. Fix anything that sounds unnatural.`,
    hint: 'Write the paragraph first without thinking about dress-ups, then go back and ADD them one at a time.',
    difficulty: 'advanced', duration_min: 30, grade: 'Year 4', country: 'NZ',
  },

  // ── Unit 3: Story Architecture ─────────────────────────────────────────────
  {
    curriculum: 'iew', subject: 'Writing', subject_color: '#10b981',
    unit_number: 3, unit_title: 'Story Architecture',
    lesson_number: 1, title: 'The 3-Part Story Plan',
    description: 'Plan any story using Beginning-Middle-End structure before you write.',
    content: `Every great story has three parts:

BEGINNING — introduces the character, setting, and a problem or goal.
MIDDLE — the character tries to solve the problem (often fails once or twice first).
END — the problem is resolved, and we learn how the character feels or what they learned.

Planning BEFORE writing is the secret of good writers. A story with no plan often wanders and loses the reader.

Simple planning tool:
B: Who? Where? What's the problem?
M: What does the character try? What goes wrong?
E: How is it solved? How does it end?`,
    question: `Choose ONE story starter below. Fill in a B-M-E plan BEFORE writing anything. Then write your plan here (don't write the story yet — just the plan!):

Story starters:
A) A child finds a mysterious glowing stone in the garden.
B) A young sailor is shipwrecked on an island with a talking parrot.
C) On the first day at a new school, a student discovers a secret door in the library.

Your plan (answer in note form, not full sentences):
B: Who is the main character? Where are they? What is the problem?
M: What do they try? What goes wrong?
E: How is it solved? What does the character learn or feel?

Now: write your first paragraph (the Beginning) using your plan. 3-4 sentences.`,
    hint: 'The problem in the Beginning doesn\'t have to be scary — it can just be a question, a wish, or a surprise.',
    difficulty: 'foundation', duration_min: 20, grade: 'Year 4', country: 'NZ',
  },
  {
    curriculum: 'iew', subject: 'Writing', subject_color: '#10b981',
    unit_number: 3, unit_title: 'Story Architecture',
    lesson_number: 2, title: 'Hook Your Reader',
    description: 'Write strong opening sentences that pull readers in immediately.',
    content: `The first sentence of a story is the most important. It decides whether a reader continues or puts the book down. Boring openings start with "Once upon a time" or "It was a nice day."

Strong opening types:
1. ACTION: Start in the middle of something happening. "The door burst open."
2. SOUND: Start with a noise. "Crack. The branch snapped beneath her feet."
3. QUESTION: Make the reader curious. "Who would steal a lighthouse?"
4. FEELING: Start with emotion. "I had never been so terrified in my life."
5. DIALOGUE: Start with a character speaking. "'Run!' she screamed."

Each type creates instant interest by putting the reader INTO the story immediately.`,
    question: `1. Identify the opening TYPE (action, sound, question, feeling, dialogue) for each:
   a) "A thunderous roar shook the windows."
   b) "'You're never going to believe this,' whispered Finn."
   c) "She had exactly three minutes to save the ship."
   d) "What lay beneath the old house had been there for a century."

2. Write 2 DIFFERENT strong opening sentences for this story idea:
   "A child finds a baby dragon in the school garden."
   Use two different types from the list above. Label which type each is.

3. Take this boring opening and REWRITE it using 2 different techniques:
   Original: "Once there was a boy called Tom who liked adventures."`,
    hint: 'The stronger the first sentence, the more you want to read on — test yours by asking "do I HAVE to know what happens next?"',
    difficulty: 'developing', duration_min: 20, grade: 'Year 4', country: 'NZ',
  },
  {
    curriculum: 'iew', subject: 'Writing', subject_color: '#10b981',
    unit_number: 3, unit_title: 'Story Architecture',
    lesson_number: 3, title: 'The Body: Details That Matter',
    description: 'Write the middle of a story with 3 focused body sentences that build tension.',
    content: `The middle of a story is where the action happens. In a short story (3 paragraphs), the middle paragraph should:
1. Show the character attempting to solve the problem
2. Include at least one setback ("it didn't work because…")
3. Build tension — make the reader worry about what will happen

A good technique: the Rule of Three. The character tries (and fails) twice, then succeeds the third time. This creates a satisfying rhythm.

Body paragraph structure:
• Sentence 1: First attempt (+ what went wrong)
• Sentence 2: Second attempt or complication (makes it worse)
• Sentence 3: Turning point — something changes or someone helps`,
    question: `Read this story beginning, then write the MIDDLE paragraph (4-5 sentences):

BEGINNING: "Lena pressed her back against the cave wall, heart hammering. Somewhere in the darkness, the baby kiwi was calling. She had followed it for an hour, and now she was completely lost."

Your middle paragraph should:
- Show Lena making at least one attempt to find the kiwi / find her way out
- Include a setback (something goes wrong)
- Include at least one because clause (underline it)
- Build tension — the reader should feel worried

Write 4-5 sentences for the middle. No ending yet — stop before the resolution.`,
    hint: 'Put an obstacle in the way: a dead end, a noise that scares her, losing her torch — something that makes it HARDER.',
    difficulty: 'developing', duration_min: 25, grade: 'Year 4', country: 'NZ',
  },
  {
    curriculum: 'iew', subject: 'Writing', subject_color: '#10b981',
    unit_number: 3, unit_title: 'Story Architecture',
    lesson_number: 4, title: 'Strong Endings',
    description: 'Write satisfying conclusions that resolve the story and leave a lasting impression.',
    content: `A strong ending does two things:
1. Resolves the problem (ties up the story)
2. Leaves the reader with a feeling or thought (the "so what")

Types of strong endings:
• FULL CIRCLE: End with an image or detail from the beginning, showing how things have changed.
• LESSON LEARNED: The character says or thinks what they now understand.
• EMOTIONAL: End with how the character feels — but make it SPECIFIC.
  Weak: "She was happy." → Strong: "A warmth spread through her chest that she hadn't felt in months."
• ZOOM OUT: Pull back to a bigger picture — nature, time passing, the world continuing.

NEVER end with: "And then I woke up." "It was all a dream." "The End."`,
    question: `Here is a story beginning and middle. Write the ENDING paragraph (3-4 sentences):

BEGINNING: "The auditorium was packed. Kai's palms were sweating as he walked to the microphone."

MIDDLE: "He forgot his opening line. The audience waited in silence, and his face burned red. Then he closed his eyes, took a breath, and started again — this time, from the heart."

Write 3-4 sentences that:
- Resolve the performance (how does it end?)
- Show how Kai feels at the end (specifically, not just "happy")
- Use at least 1 dress-up of your choice (label it)
- Do NOT use "The End" or "he woke up"

After writing, label which type of ending you wrote (full circle, lesson learned, emotional, or zoom out).`,
    hint: 'Decide the FEELING first — what emotion does Kai feel at the end? Then write sentences that SHOW that feeling rather than naming it.',
    difficulty: 'developing', duration_min: 20, grade: 'Year 4', country: 'NZ',
  },
  {
    curriculum: 'iew', subject: 'Writing', subject_color: '#10b981',
    unit_number: 3, unit_title: 'Story Architecture',
    lesson_number: 5, title: 'Write Your Own Story',
    description: 'Plan and write a complete 3-paragraph story using all skills learned.',
    content: `This is the capstone lesson. You will plan and write a complete short story with:
• A strong opening (one of the 5 types)
• A middle with a setback (Rule of Three optional)
• A satisfying ending (one of the 4 types)

And you will include at least 3 dress-ups:
☐ Strong adjective
☐ -ly adverb
☐ Who/which clause OR because clause

Total length: 3 paragraphs (beginning, middle, end) = approximately 10-15 sentences.

Process:
1. Plan (B-M-E in note form) — 5 minutes
2. Write (don't self-edit yet) — 15 minutes
3. Read aloud and revise — 5 minutes`,
    question: `Choose your own story idea OR use one of these:
• A young inventor's experiment goes hilariously wrong.
• A child discovers their grandmother was once a world-famous explorer.
• Something unusual happens during a school camp night hike.

Write your complete story in 3 paragraphs. Before writing, note your plan:
B: ___  M: ___  E: ___

Requirements checklist (tick each when done):
☐ Strong opening sentence (label the type)
☐ Beginning paragraph (character, setting, problem)
☐ Middle paragraph (attempt, setback, turning point)
☐ Ending paragraph (resolution + feeling)
☐ At least 1 strong adjective (underline)
☐ At least 1 -ly adverb (underline)
☐ At least 1 who/which OR because clause (bracket or circle)
☐ A title`,
    hint: 'Plan before you write — even 3 bullet points saves you from getting lost halfway through.',
    difficulty: 'advanced', duration_min: 35, grade: 'Year 4', country: 'NZ',
  },
]

// ─────────────────────────────────────────────────────────────────────────────
// Seed
// ─────────────────────────────────────────────────────────────────────────────
const ALL_LESSONS = [...BEAST_ACADEMY, ...IEW]

async function seed() {
  console.log(`\n🌱  Seeding ${ALL_LESSONS.length} curriculum lessons…\n`)

  const { error } = await admin.from('curriculum_lessons')
    .upsert(ALL_LESSONS, { onConflict: 'curriculum,unit_number,lesson_number' })

  if (error) {
    console.error('❌  Upsert failed:', error.message)
    process.exit(1)
  }

  console.log(`✅  Seeded ${ALL_LESSONS.length} lessons successfully.\n`)

  // Verify
  const { data, error: fetchErr } = await admin
    .from('curriculum_lessons')
    .select('curriculum, unit_title, title')
    .order('curriculum')
    .order('unit_number')
    .order('lesson_number')

  if (fetchErr) {
    console.error('❌  Verification fetch failed:', fetchErr.message)
    return
  }

  let lastCurriculum = ''
  let lastUnit = ''
  for (const row of data) {
    if (row.curriculum !== lastCurriculum) {
      lastCurriculum = row.curriculum
      console.log(`\n📚  ${row.curriculum.toUpperCase()}`)
    }
    if (row.unit_title !== lastUnit) {
      lastUnit = row.unit_title
      console.log(`  📖  ${row.unit_title}`)
    }
    console.log(`       • ${row.title}`)
  }
  console.log()
}

seed()
