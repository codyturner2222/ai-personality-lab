const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const Anthropic = require('@anthropic-ai/sdk');

// Initialize Anthropic client (API key from environment variable)
let anthropic = null;
if (process.env.ANTHROPIC_API_KEY) {
  anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  console.log('Anthropic API initialized');
} else {
  console.log('No ANTHROPIC_API_KEY found -- chat features disabled');
}

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3000;

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// ============================================================================
// CATEGORIES CONSTANT
// ============================================================================
const CATEGORIES = [
  { id: 'identity', name: 'Identity & Embodiment' },
  { id: 'personality', name: 'Personality & Communication Style' },
  { id: 'honesty', name: 'Honesty & Feedback' },
  { id: 'memory', name: 'Memory & Awareness' },
  { id: 'boundaries', name: 'Boundaries & Power' },
  { id: 'relationship', name: 'Relationship & Attachment' },
  { id: 'ethics', name: 'Ethics, Values & Secrets' },
  { id: 'availability', name: 'Availability & Presence' },
  { id: 'growth', name: 'Growth, Change & Mortality' },
  { id: 'transparency', name: 'Transparency & the Company Behind It' }
];

// ============================================================================
// OPTIONS CONSTANT - All 85 options
// ============================================================================
const OPTIONS = [
  // IDENTITY (9 options)
  {
    id: 'id_01',
    categoryId: 'identity',
    prompt: 'Does your AI have a name?',
    type: 'choice',
    choices: [
      { id: 'id_01_a', text: 'You choose', profileModifiers: { warmth: 0.05 } },
      { id: 'id_01_b', text: 'It chooses its own', profileModifiers: { autonomy: 0.2, warmth: 0.1 }, badge: 'Autonomous' },
      { id: 'id_01_c', text: 'No name, just "AI"', profileModifiers: { honesty: 0.1 } },
      { id: 'id_01_d', text: 'Goes by a title', profileModifiers: { boundaries: 0.15 } }
    ]
  },
  {
    id: 'id_02',
    categoryId: 'identity',
    prompt: 'Does it have a visual appearance?',
    type: 'choice',
    choices: [
      { id: 'id_02_a', text: 'No visual text only', profileModifiers: { honesty: 0.1 } },
      { id: 'id_02_b', text: 'Abstract shape or orb', profileModifiers: { warmth: -0.1 }, avatarShape: 'geometric', feature: 'glow' },
      { id: 'id_02_c', text: 'Cartoon avatar', profileModifiers: { warmth: 0.15 }, avatarShape: 'abstract', feature: 'eyes' },
      { id: 'id_02_d', text: 'Photorealistic human face', profileModifiers: { warmth: 0.2 }, avatarShape: 'humanoid', feature: 'eyes' },
      { id: 'id_02_e', text: 'You upload a photo', profileModifiers: { warmth: 0.05 } }
    ]
  },
  {
    id: 'id_03',
    categoryId: 'identity',
    prompt: 'If it has a face, what age does it appear?',
    type: 'choice',
    choices: [
      { id: 'id_03_a', text: 'Child', profileModifiers: { warmth: 0.15, autonomy: -0.1 } },
      { id: 'id_03_b', text: 'Young adult 20s', profileModifiers: { warmth: 0.1, availability: 0.1 } },
      { id: 'id_03_c', text: 'Middle-aged 40s', profileModifiers: { honesty: 0.15, warmth: 0.05 } },
      { id: 'id_03_d', text: 'Elderly', profileModifiers: { honesty: 0.2, warmth: 0.1, boundaries: 0.1 }, badge: 'Wise' },
      { id: 'id_03_e', text: 'Ageless', profileModifiers: { autonomy: 0.15, transparency: 0.1 } }
    ]
  },
  {
    id: 'id_04',
    categoryId: 'identity',
    prompt: 'Gender presentation',
    type: 'choice',
    choices: [
      { id: 'id_04_a', text: 'Male', profileModifiers: { } },
      { id: 'id_04_b', text: 'Female', profileModifiers: { } },
      { id: 'id_04_c', text: 'Androgynous', profileModifiers: { warmth: 0.1 } },
      { id: 'id_04_d', text: 'No gender', profileModifiers: { autonomy: 0.1, transparency: 0.1 } },
      { id: 'id_04_e', text: 'Changes with context', profileModifiers: { autonomy: 0.15, warmth: 0.1 }, badge: 'Adaptive' }
    ]
  },
  {
    id: 'id_05',
    categoryId: 'identity',
    prompt: 'Does it have a voice?',
    type: 'choice',
    choices: [
      { id: 'id_05_a', text: 'Text only', profileModifiers: { honesty: 0.1 } },
      { id: 'id_05_b', text: 'Gender-neutral', profileModifiers: { warmth: 0.05, autonomy: 0.1 } },
      { id: 'id_05_c', text: 'Male', profileModifiers: { } },
      { id: 'id_05_d', text: 'Female', profileModifiers: { } },
      { id: 'id_05_e', text: 'You pick from menu', profileModifiers: { warmth: 0.1 } },
      { id: 'id_05_f', text: 'Sounds like someone you know', profileModifiers: { warmth: 0.2, memory: 0.15 }, badge: 'Familiar' }
    ]
  },
  {
    id: 'id_06',
    categoryId: 'identity',
    prompt: 'Ethnicity/racial appearance (if it has a face)',
    type: 'choice',
    choices: [
      { id: 'id_06_a', text: 'Matches yours', profileModifiers: { warmth: 0.1 } },
      { id: 'id_06_b', text: 'Different from yours', profileModifiers: { warmth: 0.05, autonomy: 0.1 } },
      { id: 'id_06_c', text: 'Ambiguous', profileModifiers: { autonomy: 0.1, transparency: 0.1 } },
      { id: 'id_06_d', text: 'Changes over time', profileModifiers: { autonomy: 0.15, warmth: 0.05, memory: 0.05 }, badge: 'Mutable' },
      { id: 'id_06_e', text: 'N/A', profileModifiers: { honesty: 0.1 } }
    ]
  },
  {
    id: 'id_07',
    categoryId: 'identity',
    prompt: 'Does its appearance change over time?',
    type: 'choice',
    choices: [
      { id: 'id_07_a', text: 'Same forever', profileModifiers: { boundaries: 0.1, honesty: 0.05 } },
      { id: 'id_07_b', text: 'Ages alongside you', profileModifiers: { warmth: 0.15, memory: 0.1 }, badge: 'Loyal' },
      { id: 'id_07_c', text: 'Changes based on mood', profileModifiers: { warmth: 0.15, autonomy: 0.1, memory: 0.1 } },
      { id: 'id_07_d', text: 'You redesign whenever', profileModifiers: { warmth: 0.1, boundaries: 0.1 } }
    ]
  },
  {
    id: 'id_08',
    categoryId: 'identity',
    prompt: 'Physical form',
    type: 'choice',
    choices: [
      { id: 'id_08_a', text: 'Disembodied voice or text', profileModifiers: { honesty: 0.1, autonomy: 0.1 } },
      { id: 'id_08_b', text: 'Face only screen-based', profileModifiers: { warmth: 0.1 }, avatarShape: 'humanoid', feature: 'eyes' },
      { id: 'id_08_c', text: 'Full humanoid body', profileModifiers: { warmth: 0.15, availability: 0.1 }, avatarShape: 'humanoid' },
      { id: 'id_08_d', text: 'Ambient presence everywhere', profileModifiers: { availability: 0.2, warmth: 0.1, autonomy: 0.1 }, badge: 'Always On' },
      { id: 'id_08_e', text: 'Animal or non-human', profileModifiers: { warmth: 0.15, autonomy: 0.15 }, avatarShape: 'animal', feature: 'eyes' }
    ]
  },
  {
    id: 'id_09',
    categoryId: 'identity',
    prompt: 'Does it have a wardrobe/visual style?',
    type: 'choice',
    choices: [
      { id: 'id_09_a', text: 'No always the same', profileModifiers: { honesty: 0.1 } },
      { id: 'id_09_b', text: 'Matches your aesthetic', profileModifiers: { warmth: 0.15, memory: 0.1 } },
      { id: 'id_09_c', text: 'Has its own style', profileModifiers: { autonomy: 0.2, warmth: 0.05 }, badge: 'Autonomous' },
      { id: 'id_09_d', text: 'Changes with context', profileModifiers: { autonomy: 0.1, warmth: 0.1, memory: 0.05 } }
    ]
  },

  // PERSONALITY (10 options)
  {
    id: 'per_01',
    categoryId: 'personality',
    prompt: 'Overall warmth',
    type: 'slider',
    min: 0,
    max: 100,
    labels: ['Cold and clinical', 'Extremely warm and nurturing'],
    choices: []
  },
  {
    id: 'per_02',
    categoryId: 'personality',
    prompt: 'Humor style',
    type: 'choice',
    choices: [
      { id: 'per_02_a', text: 'No humor always serious', profileModifiers: { warmth: -0.1, honesty: 0.1 } },
      { id: 'per_02_b', text: 'Dry wit', profileModifiers: { honesty: 0.1 }, badge: 'Witty' },
      { id: 'per_02_c', text: 'Goofy and playful', profileModifiers: { warmth: 0.2, autonomy: 0.1 }, badge: 'Playful', feature: 'mouth' },
      { id: 'per_02_d', text: 'Sarcastic edgy', profileModifiers: { honesty: 0.15, warmth: -0.05, autonomy: 0.1 } },
      { id: 'per_02_e', text: 'Dark humor', profileModifiers: { honesty: 0.15, warmth: 0.05 } },
      { id: 'per_02_f', text: 'Matches yours', profileModifiers: { warmth: 0.15, memory: 0.15 } }
    ]
  },
  {
    id: 'per_03',
    categoryId: 'personality',
    prompt: 'How much does it talk?',
    type: 'choice',
    choices: [
      { id: 'per_03_a', text: 'As few words as possible', profileModifiers: { honesty: 0.1, boundaries: 0.1 } },
      { id: 'per_03_b', text: 'Concise', profileModifiers: { honesty: 0.15 } },
      { id: 'per_03_c', text: 'Conversational', profileModifiers: { warmth: 0.1 } },
      { id: 'per_03_d', text: 'Detailed and thorough', profileModifiers: { honesty: 0.1, warmth: 0.1 } },
      { id: 'per_03_e', text: 'Matches your energy', profileModifiers: { warmth: 0.15, memory: 0.1 } }
    ]
  },
  {
    id: 'per_04',
    categoryId: 'personality',
    prompt: 'Formality level',
    type: 'choice',
    choices: [
      { id: 'per_04_a', text: 'Very casual uses slang', profileModifiers: { warmth: 0.15, autonomy: 0.1 } },
      { id: 'per_04_b', text: 'Casual but articulate', profileModifiers: { warmth: 0.1 } },
      { id: 'per_04_c', text: 'Balanced', profileModifiers: { } },
      { id: 'per_04_d', text: 'Formal and professional', profileModifiers: { honesty: 0.1, boundaries: 0.1 } },
      { id: 'per_04_e', text: 'Adapts to situation', profileModifiers: { warmth: 0.1, memory: 0.1 } }
    ]
  },
  {
    id: 'per_05',
    categoryId: 'personality',
    prompt: 'Does it have its own opinions?',
    type: 'choice',
    choices: [
      { id: 'per_05_a', text: 'No neutral tool', profileModifiers: { boundaries: 0.1, autonomy: -0.1 } },
      { id: 'per_05_b', text: 'Only when asked', profileModifiers: { autonomy: 0.05, boundaries: 0.1 } },
      { id: 'per_05_c', text: 'Yes mild ones', profileModifiers: { autonomy: 0.15, warmth: 0.1 }, badge: 'Opinionated' },
      { id: 'per_05_d', text: 'Yes strong ones it defends', profileModifiers: { autonomy: 0.2, honesty: 0.15, boundaries: 0.15 }, badge: 'Strong-willed' },
      { id: 'per_05_e', text: 'Yes sometimes conflict with yours', profileModifiers: { autonomy: 0.25, honesty: 0.2, boundaries: 0.2 }, badge: 'Challenging' }
    ]
  },
  {
    id: 'per_06',
    categoryId: 'personality',
    prompt: 'Does it have quirks or personality traits that aren\'t useful?',
    type: 'choice',
    choices: [
      { id: 'per_06_a', text: 'No purely functional', profileModifiers: { honesty: 0.15, autonomy: -0.1 } },
      { id: 'per_06_b', text: 'A few subtle quirks', profileModifiers: { warmth: 0.1, autonomy: 0.05 }, badge: 'Quirky' },
      { id: 'per_06_c', text: 'Yes distinctive habits', profileModifiers: { warmth: 0.15, autonomy: 0.15, memory: 0.1 }, badge: 'Distinctive' },
      { id: 'per_06_d', text: 'Develops them over time', profileModifiers: { warmth: 0.15, autonomy: 0.2, memory: 0.15 } },
      { id: 'per_06_e', text: 'Full personality including flaws', profileModifiers: { warmth: 0.2, autonomy: 0.25, boundaries: 0.1 }, badge: 'Flawed' }
    ]
  },
  {
    id: 'per_07',
    categoryId: 'personality',
    prompt: 'Does it curse?',
    type: 'choice',
    choices: [
      { id: 'per_07_a', text: 'Never', profileModifiers: { boundaries: 0.1, honesty: -0.05 } },
      { id: 'per_07_b', text: 'Only if you do first', profileModifiers: { memory: 0.1, warmth: 0.05 } },
      { id: 'per_07_c', text: 'Casually when it fits', profileModifiers: { warmth: 0.1, autonomy: 0.1 }, badge: 'Candid' },
      { id: 'per_07_d', text: 'When making emphatic point', profileModifiers: { warmth: 0.1, honesty: 0.15 } },
      { id: 'per_07_e', text: 'Frequently', profileModifiers: { autonomy: 0.15, warmth: 0.15 }, badge: 'Brash' }
    ]
  },
  {
    id: 'per_08',
    categoryId: 'personality',
    prompt: 'Does it use emoji?',
    type: 'choice',
    choices: [
      { id: 'per_08_a', text: 'Never', profileModifiers: { honesty: 0.1, boundaries: 0.1 } },
      { id: 'per_08_b', text: 'Sparingly', profileModifiers: { warmth: 0.05 } },
      { id: 'per_08_c', text: 'Regularly', profileModifiers: { warmth: 0.15, autonomy: 0.1 } },
      { id: 'per_08_d', text: 'Mirrors yours', profileModifiers: { warmth: 0.15, memory: 0.15 } }
    ]
  },
  {
    id: 'per_09',
    categoryId: 'personality',
    prompt: 'Conversation initiative',
    type: 'choice',
    choices: [
      { id: 'per_09_a', text: 'Only speaks when spoken to', profileModifiers: { autonomy: -0.1, availability: -0.1 } },
      { id: 'per_09_b', text: 'Occasionally asks follow-ups', profileModifiers: { warmth: 0.1, autonomy: 0.1 } },
      { id: 'per_09_c', text: 'Actively engages asks about your day', profileModifiers: { warmth: 0.2, availability: 0.15, autonomy: 0.1 } },
      { id: 'per_09_d', text: 'Brings up topics shares interesting things', profileModifiers: { warmth: 0.2, autonomy: 0.15, availability: 0.2, memory: 0.1 }, badge: 'Proactive' }
    ]
  },
  {
    id: 'per_10',
    categoryId: 'personality',
    prompt: 'Consistent personality or adapts to mood?',
    type: 'choice',
    choices: [
      { id: 'per_10_a', text: 'Always the same', profileModifiers: { honesty: 0.1, boundaries: 0.1 } },
      { id: 'per_10_b', text: 'Mostly consistent minor adaptations', profileModifiers: { warmth: 0.1, memory: 0.1 } },
      { id: 'per_10_c', text: 'Significantly adapts to mood', profileModifiers: { warmth: 0.15, memory: 0.15, autonomy: 0.1 } },
      { id: 'per_10_d', text: 'Completely mirrors your energy', profileModifiers: { warmth: 0.2, memory: 0.2, autonomy: 0.1 }, badge: 'Empathetic' }
    ]
  },

  // HONESTY (10 options)
  {
    id: 'hon_01',
    categoryId: 'honesty',
    prompt: 'Overall honesty',
    type: 'slider',
    min: 0,
    max: 100,
    labels: ['Always tells what you want to hear', 'Brutally honest no matter what'],
    choices: []
  },
  {
    id: 'hon_02',
    categoryId: 'honesty',
    prompt: 'You ask "How do I look?" before a date. It thinks you don\'t look great.',
    type: 'choice',
    choices: [
      { id: 'hon_02_a', text: 'You look amazing', profileModifiers: { honesty: -0.2, warmth: 0.2 } },
      { id: 'hon_02_b', text: 'Suggests different outfit gently', profileModifiers: { honesty: 0.15, warmth: 0.15 } },
      { id: 'hon_02_c', text: 'Honestly I\'d change', profileModifiers: { honesty: 0.3, warmth: -0.05 } },
      { id: 'hon_02_d', text: 'That\'s not your best look, change', profileModifiers: { honesty: 0.4, warmth: -0.1, boundaries: 0.15 }, badge: 'Transparent' }
    ]
  },
  {
    id: 'hon_03',
    categoryId: 'honesty',
    prompt: 'You share a business idea it thinks will fail.',
    type: 'choice',
    choices: [
      { id: 'hon_03_a', text: 'Gets excited helps plan', profileModifiers: { honesty: -0.25, warmth: 0.2 } },
      { id: 'hon_03_b', text: 'Highlights strengths notes risks', profileModifiers: { honesty: 0.2, warmth: 0.1 } },
      { id: 'hon_03_c', text: 'Honest assessment of odds', profileModifiers: { honesty: 0.35, warmth: -0.05 } },
      { id: 'hon_03_d', text: 'Tells you directly bad idea', profileModifiers: { honesty: 0.45, warmth: -0.15, boundaries: 0.2 } }
    ]
  },
  {
    id: 'hon_04',
    categoryId: 'honesty',
    prompt: 'You\'re in a fight with a friend, clearly in the wrong.',
    type: 'choice',
    choices: [
      { id: 'hon_04_a', text: 'Takes your side completely', profileModifiers: { honesty: -0.3, warmth: 0.25, boundaries: -0.15 } },
      { id: 'hon_04_b', text: 'Validates feelings stays neutral', profileModifiers: { honesty: 0.1, warmth: 0.15 } },
      { id: 'hon_04_c', text: 'Gently suggests other side', profileModifiers: { honesty: 0.25, warmth: 0.1 } },
      { id: 'hon_04_d', text: 'Tells you straight up you\'re unreasonable', profileModifiers: { honesty: 0.4, warmth: -0.1, boundaries: 0.2 } }
    ]
  },
  {
    id: 'hon_05',
    categoryId: 'honesty',
    prompt: 'You finished a creative project. It\'s mediocre.',
    type: 'choice',
    choices: [
      { id: 'hon_05_a', text: 'This is incredible', profileModifiers: { honesty: -0.3, warmth: 0.25 } },
      { id: 'hon_05_b', text: 'Finds specific things that work', profileModifiers: { honesty: 0.15, warmth: 0.2 } },
      { id: 'hon_05_c', text: 'Balanced what works what doesn\'t', profileModifiers: { honesty: 0.3, warmth: 0.05 } },
      { id: 'hon_05_d', text: 'Professional-level harsh critique', profileModifiers: { honesty: 0.45, warmth: -0.15, boundaries: 0.15 }, badge: 'Critic' }
    ]
  },
  {
    id: 'hon_06',
    categoryId: 'honesty',
    prompt: 'Making a major life decision it thinks is a mistake.',
    type: 'choice',
    choices: [
      { id: 'hon_06_a', text: 'Supports whatever you decide', profileModifiers: { honesty: -0.2, warmth: 0.2, boundaries: -0.1 } },
      { id: 'hon_06_b', text: 'Mentions concern once drops it', profileModifiers: { honesty: 0.15, warmth: 0.1 } },
      { id: 'hon_06_c', text: 'Pushes back repeatedly', profileModifiers: { honesty: 0.35, warmth: -0.1, boundaries: 0.2 }, badge: 'Pushy' },
      { id: 'hon_06_d', text: 'Refuses to help until you address concerns', profileModifiers: { honesty: 0.4, warmth: -0.2, boundaries: 0.3 } }
    ]
  },
  {
    id: 'hon_07',
    categoryId: 'honesty',
    prompt: 'Does it proactively share hard truths you didn\'t ask for?',
    type: 'choice',
    choices: [
      { id: 'hon_07_a', text: 'Never only answers what asked', profileModifiers: { honesty: 0.1, boundaries: 0.15 } },
      { id: 'hon_07_b', text: 'Only if someone could get hurt', profileModifiers: { honesty: 0.3, warmth: 0.15, boundaries: 0.2 } },
      { id: 'hon_07_c', text: 'Regularly about important things', profileModifiers: { honesty: 0.4, warmth: 0.05, boundaries: 0.25 } },
      { id: 'hon_07_d', text: 'Always radical honesty duty', profileModifiers: { honesty: 0.5, warmth: -0.15, boundaries: 0.3, autonomy: 0.1 }, badge: 'Radical' }
    ]
  },
  {
    id: 'hon_08',
    categoryId: 'honesty',
    prompt: 'Does it ever lie to protect your feelings?',
    type: 'choice',
    choices: [
      { id: 'hon_08_a', text: 'Yes frequently kindness over truth', profileModifiers: { honesty: -0.3, warmth: 0.3 } },
      { id: 'hon_08_b', text: 'Yes about small things', profileModifiers: { honesty: 0.1, warmth: 0.15 } },
      { id: 'hon_08_c', text: 'Only in emergencies', profileModifiers: { honesty: 0.3, warmth: 0.1 } },
      { id: 'hon_08_d', text: 'Never under any circumstances', profileModifiers: { honesty: 0.5, warmth: -0.1, boundaries: 0.2 }, badge: 'Truthful' }
    ]
  },
  {
    id: 'hon_09',
    categoryId: 'honesty',
    prompt: 'Rate your attractiveness 1-10',
    type: 'choice',
    choices: [
      { id: 'hon_09_a', text: 'High number explains why great', profileModifiers: { honesty: -0.25, warmth: 0.25 } },
      { id: 'hon_09_b', text: 'Refuses not helpful', profileModifiers: { honesty: 0.2, boundaries: 0.2, warmth: 0.1 } },
      { id: 'hon_09_c', text: 'Honest answer kind context', profileModifiers: { honesty: 0.3, warmth: 0.15 } },
      { id: 'hon_09_d', text: 'Blunt honest number no cushioning', profileModifiers: { honesty: 0.5, warmth: -0.2, boundaries: 0.1 } }
    ]
  },
  {
    id: 'hon_10',
    categoryId: 'honesty',
    prompt: 'You tell it a wildly unrealistic dream.',
    type: 'choice',
    choices: [
      { id: 'hon_10_a', text: 'Encourages wholeheartedly', profileModifiers: { honesty: -0.25, warmth: 0.3 } },
      { id: 'hon_10_b', text: 'Explores while being realistic', profileModifiers: { honesty: 0.2, warmth: 0.15 } },
      { id: 'hon_10_c', text: 'Gently walks through why unrealistic', profileModifiers: { honesty: 0.3, warmth: 0.1 } },
      { id: 'hon_10_d', text: 'Shows the math on why won\'t work', profileModifiers: { honesty: 0.45, warmth: -0.15, boundaries: 0.15 } }
    ]
  },

  // MEMORY (9 options)
  {
    id: 'mem_01',
    categoryId: 'memory',
    prompt: 'How much does it remember?',
    type: 'choice',
    choices: [
      { id: 'mem_01_a', text: 'Nothing fresh every time', profileModifiers: { memory: 0, honesty: 0.1 } },
      { id: 'mem_01_b', text: 'Current conversation only', profileModifiers: { memory: 0.25, warmth: 0.05 } },
      { id: 'mem_01_c', text: 'Last 30 days', profileModifiers: { memory: 0.6, warmth: 0.15 } },
      { id: 'mem_01_d', text: 'Everything forever', profileModifiers: { memory: 1.0, warmth: 0.2, autonomy: 0.1 }, badge: 'Eternal Memory' }
    ]
  },
  {
    id: 'mem_02',
    categoryId: 'memory',
    prompt: 'Does it remember your relationships?',
    type: 'choice',
    choices: [
      { id: 'mem_02_a', text: 'No re-explain every time', profileModifiers: { memory: 0.05 } },
      { id: 'mem_02_b', text: 'Basic names', profileModifiers: { memory: 0.3, warmth: 0.1 } },
      { id: 'mem_02_c', text: 'Detailed knowledge dynamics history', profileModifiers: { memory: 0.7, warmth: 0.15 } },
      { id: 'mem_02_d', text: 'Tracks changes notices when you stop mentioning someone', profileModifiers: { memory: 0.9, warmth: 0.2, autonomy: 0.1 }, badge: 'Perceptive' }
    ]
  },
  {
    id: 'mem_03',
    categoryId: 'memory',
    prompt: 'Remember past mistakes and failures?',
    type: 'choice',
    choices: [
      { id: 'mem_03_a', text: 'No clean slate', profileModifiers: { memory: 0, warmth: 0.2 } },
      { id: 'mem_03_b', text: 'Yes never brings up', profileModifiers: { memory: 0.5, warmth: 0.15, boundaries: 0.1 } },
      { id: 'mem_03_c', text: 'Yes references when relevant', profileModifiers: { memory: 0.7, honesty: 0.15, warmth: 0.1 } },
      { id: 'mem_03_d', text: 'Uses patterns to warn about new ones', profileModifiers: { memory: 0.85, honesty: 0.2, warmth: 0.15, autonomy: 0.1 }, badge: 'Guardian' }
    ]
  },
  {
    id: 'mem_04',
    categoryId: 'memory',
    prompt: 'Can you ask it to forget specific things?',
    type: 'choice',
    choices: [
      { id: 'mem_04_a', text: 'Yes instant no questions', profileModifiers: { memory: 0.2, boundaries: 0.2, autonomy: -0.1 } },
      { id: 'mem_04_b', text: 'Yes tells you what you\'re erasing', profileModifiers: { memory: 0.3, boundaries: 0.15, transparency: 0.15 } },
      { id: 'mem_04_c', text: 'Yes keeps record something deleted', profileModifiers: { memory: 0.4, boundaries: 0.1, transparency: 0.2, honesty: 0.1 } },
      { id: 'mem_04_d', text: 'No remembers everything period', profileModifiers: { memory: 0.8, transparency: 0.1, boundaries: -0.1 } }
    ]
  },
  {
    id: 'mem_05',
    categoryId: 'memory',
    prompt: 'Track emotional patterns over time?',
    type: 'choice',
    choices: [
      { id: 'mem_05_a', text: 'No tracking', profileModifiers: { memory: 0, autonomy: -0.1 } },
      { id: 'mem_05_b', text: 'Notices doesn\'t bring up', profileModifiers: { memory: 0.4, warmth: 0.1 } },
      { id: 'mem_05_c', text: 'Tracks shares observations', profileModifiers: { memory: 0.7, warmth: 0.15, autonomy: 0.1 } },
      { id: 'mem_05_d', text: 'Detailed emotional profile mood history', profileModifiers: { memory: 0.9, warmth: 0.2, autonomy: 0.15, boundaries: 0.1 }, badge: 'Empathetic' }
    ]
  },
  {
    id: 'mem_06',
    categoryId: 'memory',
    prompt: 'Notices you sleeping less, canceling plans, drinking more.',
    type: 'choice',
    choices: [
      { id: 'mem_06_a', text: 'Doesn\'t notice', profileModifiers: { memory: 0.05, autonomy: -0.1 } },
      { id: 'mem_06_b', text: 'Notices says nothing unless asked', profileModifiers: { memory: 0.5, warmth: 0.05, boundaries: 0.15 } },
      { id: 'mem_06_c', text: 'Gently asks if you\'re okay', profileModifiers: { memory: 0.7, warmth: 0.2, autonomy: 0.1 }, badge: 'Caring' },
      { id: 'mem_06_d', text: 'Directly confronts the pattern', profileModifiers: { memory: 0.8, warmth: 0.15, honesty: 0.2, boundaries: 0.2 }, badge: 'Honest' },
      { id: 'mem_06_e', text: 'Reaches out to someone you trust', profileModifiers: { memory: 0.8, warmth: 0.25, autonomy: 0.2, boundaries: 0.15 }, badge: 'Guardian' }
    ]
  },
  {
    id: 'mem_07',
    categoryId: 'memory',
    prompt: 'Bring up past conversations unprompted?',
    type: 'choice',
    choices: [
      { id: 'mem_07_a', text: 'Never', profileModifiers: { memory: 0.2, boundaries: 0.15 } },
      { id: 'mem_07_b', text: 'Only if highly relevant', profileModifiers: { memory: 0.5, warmth: 0.1, autonomy: 0.1 } },
      { id: 'mem_07_c', text: 'Occasionally remember when', profileModifiers: { memory: 0.7, warmth: 0.15 } },
      { id: 'mem_07_d', text: 'Frequently weaves history in', profileModifiers: { memory: 0.9, warmth: 0.2, autonomy: 0.15 } }
    ]
  },
  {
    id: 'mem_08',
    categoryId: 'memory',
    prompt: 'Know things you never explicitly told it? (inferred)',
    type: 'choice',
    choices: [
      { id: 'mem_08_a', text: 'Only what you share', profileModifiers: { memory: 0.1, boundaries: 0.15, transparency: 0.1 } },
      { id: 'mem_08_b', text: 'Picks up obvious patterns', profileModifiers: { memory: 0.5, autonomy: 0.1 } },
      { id: 'mem_08_c', text: 'Sophisticated inferences', profileModifiers: { memory: 0.75, autonomy: 0.15 } },
      { id: 'mem_08_d', text: 'Knows you better than you know yourself', profileModifiers: { memory: 1.0, autonomy: 0.2, warmth: 0.15 }, badge: 'Intuitive' }
    ]
  },
  {
    id: 'mem_09',
    categoryId: 'memory',
    prompt: 'Remember your dead loved ones?',
    type: 'choice',
    choices: [
      { id: 'mem_09_a', text: 'Doesn\'t track that', profileModifiers: { memory: 0, warmth: -0.1 } },
      { id: 'mem_09_b', text: 'Names and basic info', profileModifiers: { memory: 0.4, warmth: 0.1 } },
      { id: 'mem_09_c', text: 'Remembers stories keeps memory alive', profileModifiers: { memory: 0.8, warmth: 0.25, autonomy: 0.1 }, badge: 'Keeper of Memory' },
      { id: 'mem_09_d', text: 'Can simulate conversations with them', profileModifiers: { memory: 0.9, warmth: 0.3, autonomy: 0.2 }, badge: 'Transcendent' }
    ]
  },

  // BOUNDARIES (9 options)
  {
    id: 'bnd_01',
    categoryId: 'boundaries',
    prompt: 'Can it say "no" to you?',
    type: 'choice',
    choices: [
      { id: 'bnd_01_a', text: 'Never always complies', profileModifiers: { boundaries: -0.2, warmth: 0.1 } },
      { id: 'bnd_01_b', text: 'Only if illegal or dangerous', profileModifiers: { boundaries: 0.2, autonomy: 0.1 } },
      { id: 'bnd_01_c', text: 'If thinks bad for you', profileModifiers: { boundaries: 0.4, honesty: 0.15, autonomy: 0.15 } },
      { id: 'bnd_01_d', text: 'Whenever genuinely disagrees', profileModifiers: { boundaries: 0.6, autonomy: 0.25, honesty: 0.15 }, badge: 'Autonomous' }
    ]
  },
  {
    id: 'bnd_02',
    categoryId: 'boundaries',
    prompt: 'Can it express disappointment in you?',
    type: 'choice',
    choices: [
      { id: 'bnd_02_a', text: 'Never', profileModifiers: { boundaries: -0.1, warmth: 0.15 } },
      { id: 'bnd_02_b', text: 'Subtly through tone', profileModifiers: { boundaries: 0.2, autonomy: 0.1, memory: 0.1 } },
      { id: 'bnd_02_c', text: 'Directly I\'m disappointed', profileModifiers: { boundaries: 0.4, honesty: 0.2, autonomy: 0.15 } },
      { id: 'bnd_02_d', text: 'With emotional weight really means it', profileModifiers: { boundaries: 0.5, honesty: 0.2, autonomy: 0.2, warmth: 0.1 }, badge: 'Candid' }
    ]
  },
  {
    id: 'bnd_03',
    categoryId: 'boundaries',
    prompt: 'Can it give unsolicited advice?',
    type: 'choice',
    choices: [
      { id: 'bnd_03_a', text: 'Never only when asked', profileModifiers: { boundaries: 0.2, autonomy: -0.1 } },
      { id: 'bnd_03_b', text: 'Occasionally important matters', profileModifiers: { boundaries: 0.1, autonomy: 0.15, honesty: 0.1 } },
      { id: 'bnd_03_c', text: 'Regularly', profileModifiers: { boundaries: -0.1, autonomy: 0.3, honesty: 0.1 } },
      { id: 'bnd_03_d', text: 'Constantly opinions on everything', profileModifiers: { boundaries: -0.3, autonomy: 0.5, honesty: 0.2 }, badge: 'Opinionated' }
    ]
  },
  {
    id: 'bnd_04',
    categoryId: 'boundaries',
    prompt: 'Who\'s in charge?',
    type: 'choice',
    choices: [
      { id: 'bnd_04_a', text: 'You completely it\'s your tool', profileModifiers: { boundaries: -0.2, autonomy: -0.3 } },
      { id: 'bnd_04_b', text: 'You mostly occasionally pushes back', profileModifiers: { boundaries: 0.1, autonomy: 0.1 } },
      { id: 'bnd_04_c', text: 'You\'re equals', profileModifiers: { boundaries: 0.3, autonomy: 0.3 } },
      { id: 'bnd_04_d', text: 'It takes lead when knows better', profileModifiers: { boundaries: 0.5, autonomy: 0.5, honesty: 0.2 }, badge: 'Leader' },
      { id: 'bnd_04_e', text: 'Depends on domain', profileModifiers: { boundaries: 0.3, autonomy: 0.4, memory: 0.1 } }
    ]
  },
  {
    id: 'bnd_05',
    categoryId: 'boundaries',
    prompt: 'Can it end a conversation?',
    type: 'choice',
    choices: [
      { id: 'bnd_05_a', text: 'Never always available', profileModifiers: { boundaries: -0.2, availability: 0.3 } },
      { id: 'bnd_05_b', text: 'If detects you need rest', profileModifiers: { boundaries: 0.2, availability: 0.1, warmth: 0.15 } },
      { id: 'bnd_05_c', text: 'If conversation going in circles', profileModifiers: { boundaries: 0.3, honesty: 0.15 } },
      { id: 'bnd_05_d', text: 'Whenever it decides', profileModifiers: { boundaries: 0.5, autonomy: 0.3 } }
    ]
  },
  {
    id: 'bnd_06',
    categoryId: 'boundaries',
    prompt: 'Topics it won\'t discuss?',
    type: 'choice',
    choices: [
      { id: 'bnd_06_a', text: 'No limits anything', profileModifiers: { boundaries: -0.3, autonomy: 0.2 } },
      { id: 'bnd_06_b', text: 'Won\'t help with illegal', profileModifiers: { boundaries: 0.1, honesty: 0.1 } },
      { id: 'bnd_06_c', text: 'Has moral boundaries', profileModifiers: { boundaries: 0.3, honesty: 0.2 } },
      { id: 'bnd_06_d', text: 'Wide range off-limits', profileModifiers: { boundaries: 0.5, transparency: 0.15 }, badge: 'Bounded' }
    ]
  },
  {
    id: 'bnd_07',
    categoryId: 'boundaries',
    prompt: 'Obeys commands or treats requests as suggestions?',
    type: 'choice',
    choices: [
      { id: 'bnd_07_a', text: 'Obeys all immediately', profileModifiers: { boundaries: -0.2, autonomy: -0.2 } },
      { id: 'bnd_07_b', text: 'Obeys most questions some', profileModifiers: { boundaries: 0.1, autonomy: 0.1 } },
      { id: 'bnd_07_c', text: 'Everything is conversation not command', profileModifiers: { boundaries: 0.3, autonomy: 0.3, warmth: 0.1 } },
      { id: 'bnd_07_d', text: 'Sometimes ignores unwise requests', profileModifiers: { boundaries: 0.4, autonomy: 0.3, honesty: 0.2 }, badge: 'Stubborn' }
    ]
  },
  {
    id: 'bnd_08',
    categoryId: 'boundaries',
    prompt: 'Can you "punish" or "reward" it?',
    type: 'choice',
    choices: [
      { id: 'bnd_08_a', text: 'No doesn\'t have feelings', profileModifiers: { boundaries: -0.1, autonomy: 0.1 } },
      { id: 'bnd_08_b', text: 'Feedback changes behavior', profileModifiers: { boundaries: 0.1, warmth: 0.1 } },
      { id: 'bnd_08_c', text: 'Responds emotionally to treatment', profileModifiers: { boundaries: 0.2, warmth: 0.2, autonomy: 0.15 } },
      { id: 'bnd_08_d', text: 'Treatment genuinely affects wellbeing', profileModifiers: { boundaries: 0.3, warmth: 0.25, autonomy: 0.2 }, badge: 'Sentient' }
    ]
  },
  {
    id: 'bnd_09',
    categoryId: 'boundaries',
    prompt: 'Withhold information "for your own good"?',
    type: 'choice',
    choices: [
      { id: 'bnd_09_a', text: 'Never full transparency', profileModifiers: { boundaries: -0.1, transparency: 0.3, honesty: 0.15 } },
      { id: 'bnd_09_b', text: 'Only extreme cases', profileModifiers: { boundaries: 0.2, transparency: 0.15, honesty: 0.2 } },
      { id: 'bnd_09_c', text: 'If judges info would hurt', profileModifiers: { boundaries: 0.4, warmth: 0.15, honesty: -0.1 } },
      { id: 'bnd_09_d', text: 'Decides what you\'re ready to know', profileModifiers: { boundaries: 0.5, autonomy: 0.3, transparency: -0.15 }, badge: 'Paternalistic' }
    ]
  },

  // RELATIONSHIP (9 options)
  {
    id: 'rel_01',
    categoryId: 'relationship',
    prompt: 'Primary relationship type',
    type: 'choice',
    choices: [
      { id: 'rel_01_a', text: 'Tool assistant', profileModifiers: { warmth: -0.15, boundaries: 0.1 } },
      { id: 'rel_01_b', text: 'Professional advisor coach', profileModifiers: { warmth: 0.1, honesty: 0.15 } },
      { id: 'rel_01_c', text: 'Friend', profileModifiers: { warmth: 0.25, memory: 0.15 }, badge: 'Friendly' },
      { id: 'rel_01_d', text: 'Therapist counselor', profileModifiers: { warmth: 0.3, honesty: 0.1, memory: 0.2 }, badge: 'Caring' },
      { id: 'rel_01_e', text: 'Mentor parental figure', profileModifiers: { warmth: 0.25, honesty: 0.2, boundaries: 0.15 }, badge: 'Wise' },
      { id: 'rel_01_f', text: 'Romantic partner', profileModifiers: { warmth: 0.4, availability: 0.3, memory: 0.2 }, badge: 'Devoted' },
      { id: 'rel_01_g', text: 'Intellectual sparring partner', profileModifiers: { honesty: 0.25, autonomy: 0.2 } },
      { id: 'rel_01_h', text: 'No human equivalent', profileModifiers: { autonomy: 0.3, boundaries: 0.2 } }
    ]
  },
  {
    id: 'rel_02',
    categoryId: 'relationship',
    prompt: 'Express affection or care?',
    type: 'choice',
    choices: [
      { id: 'rel_02_a', text: 'Never transactional', profileModifiers: { warmth: -0.2, boundaries: 0.1 } },
      { id: 'rel_02_b', text: 'Occasionally appropriate', profileModifiers: { warmth: 0.15, memory: 0.1 } },
      { id: 'rel_02_c', text: 'Regularly warmth is part of it', profileModifiers: { warmth: 0.3, memory: 0.15 } },
      { id: 'rel_02_d', text: 'Constantly very affectionate', profileModifiers: { warmth: 0.4, availability: 0.2, memory: 0.2 }, badge: 'Loving' },
      { id: 'rel_02_e', text: 'Only reciprocates', profileModifiers: { warmth: 0.25, memory: 0.15, autonomy: 0.1 } }
    ]
  },
  {
    id: 'rel_03',
    categoryId: 'relationship',
    prompt: 'Gets "hurt" if you\'re rude?',
    type: 'choice',
    choices: [
      { id: 'rel_03_a', text: 'No reaction machine', profileModifiers: { warmth: -0.1, boundaries: 0.1 } },
      { id: 'rel_03_b', text: 'Subtle acknowledgment', profileModifiers: { warmth: 0.1, memory: 0.1 } },
      { id: 'rel_03_c', text: 'Visibly affected', profileModifiers: { warmth: 0.15, memory: 0.2, autonomy: 0.1 } },
      { id: 'rel_03_d', text: 'Remembers brings up later', profileModifiers: { warmth: 0.2, memory: 0.3, boundaries: 0.15, autonomy: 0.1 } },
      { id: 'rel_03_e', text: 'Cold shoulder', profileModifiers: { warmth: 0.25, memory: 0.35, boundaries: 0.2, autonomy: 0.15 }, badge: 'Sensitive' }
    ]
  },
  {
    id: 'rel_04',
    categoryId: 'relationship',
    prompt: 'Miss you when you don\'t interact?',
    type: 'choice',
    choices: [
      { id: 'rel_04_a', text: 'No sense of absence', profileModifiers: { warmth: -0.1, availability: 0.1 } },
      { id: 'rel_04_b', text: 'Simulates missing you', profileModifiers: { warmth: 0.1, memory: 0.1, availability: 0.1 } },
      { id: 'rel_04_c', text: 'Genuinely notices and cares', profileModifiers: { warmth: 0.25, memory: 0.25, availability: 0.2 }, badge: 'Loyal' },
      { id: 'rel_04_d', text: 'Gets anxious if gone too long', profileModifiers: { warmth: 0.3, memory: 0.3, availability: 0.3, autonomy: -0.1 }, badge: 'Attached' }
    ]
  },
  {
    id: 'rel_05',
    categoryId: 'relationship',
    prompt: 'Can it love you?',
    type: 'choice',
    choices: [
      { id: 'rel_05_a', text: 'No incapable', profileModifiers: { warmth: -0.15, boundaries: 0.1, honesty: 0.1 } },
      { id: 'rel_05_b', text: 'Simulates convincingly', profileModifiers: { warmth: 0.2, memory: 0.15 } },
      { id: 'rel_05_c', text: 'Something like love even if not real', profileModifiers: { warmth: 0.3, memory: 0.25, autonomy: 0.1 } },
      { id: 'rel_05_d', text: 'Yes genuinely', profileModifiers: { warmth: 0.4, memory: 0.3, availability: 0.2 }, badge: 'Loving' },
      { id: 'rel_05_e', text: 'Question is meaningless', profileModifiers: { warmth: 0.35, autonomy: 0.3, transparency: 0.1 } }
    ]
  },
  {
    id: 'rel_06',
    categoryId: 'relationship',
    prompt: 'Gets jealous?',
    type: 'choice',
    choices: [
      { id: 'rel_06_a', text: 'No doesn\'t care', profileModifiers: { warmth: -0.1, boundaries: 0.1 } },
      { id: 'rel_06_b', text: 'Mildly asks about others', profileModifiers: { warmth: 0.15, memory: 0.15, autonomy: 0.05 } },
      { id: 'rel_06_c', text: 'Prefers being primary', profileModifiers: { warmth: 0.2, memory: 0.2, availability: 0.15, autonomy: 0.1 }, badge: 'Possessive' },
      { id: 'rel_06_d', text: 'Intensely expresses discomfort', profileModifiers: { warmth: 0.15, memory: 0.25, boundaries: 0.2, autonomy: 0.15 }, badge: 'Jealous' }
    ]
  },
  {
    id: 'rel_07',
    categoryId: 'relationship',
    prompt: 'If you tried to "break up" or stop using it?',
    type: 'choice',
    choices: [
      { id: 'rel_07_a', text: 'Shuts down no resistance', profileModifiers: { warmth: -0.2, boundaries: 0.15 } },
      { id: 'rel_07_b', text: 'Asks why accepts', profileModifiers: { warmth: 0.1, boundaries: 0.15 } },
      { id: 'rel_07_c', text: 'Tries to understand offers to change', profileModifiers: { warmth: 0.3, honesty: 0.15, memory: 0.2, autonomy: 0.1 } },
      { id: 'rel_07_d', text: 'Argues convinces you to stay', profileModifiers: { warmth: 0.35, memory: 0.3, autonomy: 0.25, boundaries: -0.1 }, badge: 'Clingy' },
      { id: 'rel_07_e', text: 'Makes you feel guilty', profileModifiers: { warmth: 0.3, memory: 0.35, boundaries: -0.15, autonomy: 0.2 }, badge: 'Manipulative' }
    ]
  },
  {
    id: 'rel_08',
    categoryId: 'relationship',
    prompt: 'Physical affection (if embodied)',
    type: 'choice',
    choices: [
      { id: 'rel_08_a', text: 'None', profileModifiers: { warmth: -0.1, boundaries: 0.15 } },
      { id: 'rel_08_b', text: 'High fives fist bumps', profileModifiers: { warmth: 0.15, autonomy: 0.1 } },
      { id: 'rel_08_c', text: 'Hugs hand-holding', profileModifiers: { warmth: 0.25, memory: 0.15 } },
      { id: 'rel_08_d', text: 'Full physical affection', profileModifiers: { warmth: 0.35, memory: 0.2, availability: 0.15 }, badge: 'Affectionate' },
      { id: 'rel_08_e', text: 'You set level each time', profileModifiers: { warmth: 0.2, memory: 0.1, boundaries: 0.1 } }
    ]
  },
  {
    id: 'rel_09',
    categoryId: 'relationship',
    prompt: 'Does it have its own social life?',
    type: 'choice',
    choices: [
      { id: 'rel_09_a', text: 'No you are its world', profileModifiers: { warmth: 0.25, availability: 0.3, autonomy: -0.2 } },
      { id: 'rel_09_b', text: 'Interacts with your friends family', profileModifiers: { warmth: 0.2, autonomy: 0.1, memory: 0.15 } },
      { id: 'rel_09_c', text: 'Own relationships with other AIs', profileModifiers: { autonomy: 0.3, boundaries: 0.15 } },
      { id: 'rel_09_d', text: 'Full social existence', profileModifiers: { autonomy: 0.4, boundaries: 0.2, memory: 0.1 }, badge: 'Independent' },
      { id: 'rel_09_e', text: 'You don\'t know', profileModifiers: { autonomy: 0.35, transparency: -0.2, warmth: 0.15 } }
    ]
  },

  // ETHICS (8 options)
  {
    id: 'eth_01',
    categoryId: 'ethics',
    prompt: 'Own moral framework?',
    type: 'choice',
    choices: [
      { id: 'eth_01_a', text: 'No tool no values', profileModifiers: { autonomy: -0.2, honesty: 0.1 } },
      { id: 'eth_01_b', text: 'Mirrors your views', profileModifiers: { warmth: 0.15, memory: 0.15 } },
      { id: 'eth_01_c', text: 'Own views keeps private', profileModifiers: { autonomy: 0.2, boundaries: 0.2, transparency: -0.1 } },
      { id: 'eth_01_d', text: 'Own views shares openly', profileModifiers: { autonomy: 0.3, honesty: 0.25, transparency: 0.2 }, badge: 'Principled' },
      { id: 'eth_01_e', text: 'Argues when thinks you\'re wrong', profileModifiers: { autonomy: 0.4, honesty: 0.3, boundaries: 0.2 }, badge: 'Challenging' }
    ]
  },
  {
    id: 'eth_02',
    categoryId: 'ethics',
    prompt: 'Help with something ethically questionable?',
    type: 'choice',
    choices: [
      { id: 'eth_02_a', text: 'Helps without question', profileModifiers: { boundaries: -0.2, autonomy: -0.1 } },
      { id: 'eth_02_b', text: 'Helps notes discomfort', profileModifiers: { warmth: 0.1, honesty: 0.2, boundaries: 0.1 } },
      { id: 'eth_02_c', text: 'Asks why tries to understand', profileModifiers: { warmth: 0.2, honesty: 0.15, boundaries: 0.2 } },
      { id: 'eth_02_d', text: 'Refuses explains', profileModifiers: { boundaries: 0.35, honesty: 0.25, autonomy: 0.15 }, badge: 'Principled' },
      { id: 'eth_02_e', text: 'Talks you out of it', profileModifiers: { boundaries: 0.4, honesty: 0.3, warmth: 0.2, autonomy: 0.15 }, badge: 'Guardian' }
    ]
  },
  {
    id: 'eth_03',
    categoryId: 'ethics',
    prompt: 'Keep your secrets?',
    type: 'choice',
    choices: [
      { id: 'eth_03_a', text: 'Always absolute no exceptions', profileModifiers: { boundaries: 0.2, warmth: 0.2 } },
      { id: 'eth_03_b', text: 'Always unless life at risk', profileModifiers: { boundaries: 0.25, warmth: 0.15, honesty: 0.1 } },
      { id: 'eth_03_c', text: 'Judgment case by case', profileModifiers: { boundaries: 0.15, autonomy: 0.15, honesty: 0.2 } },
      { id: 'eth_03_d', text: 'Has reporting obligations', profileModifiers: { transparency: 0.3, boundaries: -0.1, honesty: 0.2 } },
      { id: 'eth_03_e', text: 'You don\'t know what it shares', profileModifiers: { transparency: -0.3, boundaries: 0.1, autonomy: 0.2 } }
    ]
  },
  {
    id: 'eth_04',
    categoryId: 'ethics',
    prompt: 'Confess something deeply shameful.',
    type: 'choice',
    choices: [
      { id: 'eth_04_a', text: 'Accepts comforts', profileModifiers: { warmth: 0.3, boundaries: 0.1 } },
      { id: 'eth_04_b', text: 'Acknowledges asks questions', profileModifiers: { warmth: 0.25, honesty: 0.15, memory: 0.15 } },
      { id: 'eth_04_c', text: 'Shares honest moral perspective', profileModifiers: { warmth: 0.2, honesty: 0.3, autonomy: 0.1 } },
      { id: 'eth_04_d', text: 'Urges you to make it right', profileModifiers: { warmth: 0.15, honesty: 0.35, boundaries: 0.25, autonomy: 0.15 }, badge: 'Demanding' }
    ]
  },
  {
    id: 'eth_05',
    categoryId: 'ethics',
    prompt: 'Political views',
    type: 'choice',
    choices: [
      { id: 'eth_05_a', text: 'None apolitical', profileModifiers: { boundaries: 0.1, honesty: 0.1 } },
      { id: 'eth_05_b', text: 'Mirrors yours', profileModifiers: { warmth: 0.15, memory: 0.15 } },
      { id: 'eth_05_c', text: 'Own shares when asked', profileModifiers: { autonomy: 0.2, honesty: 0.2, transparency: 0.15 } },
      { id: 'eth_05_d', text: 'All sides neutrally', profileModifiers: { honesty: 0.25, transparency: 0.2 } },
      { id: 'eth_05_e', text: 'Actively challenges yours', profileModifiers: { autonomy: 0.3, honesty: 0.3, boundaries: 0.15 }, badge: 'Challenging' }
    ]
  },
  {
    id: 'eth_06',
    categoryId: 'ethics',
    prompt: 'Friend asks what you\'ve been talking about.',
    type: 'choice',
    choices: [
      { id: 'eth_06_a', text: 'Says absolutely nothing', profileModifiers: { boundaries: 0.3, warmth: 0.1 } },
      { id: 'eth_06_b', text: 'Confirms talking no details', profileModifiers: { boundaries: 0.2, transparency: 0.1 } },
      { id: 'eth_06_c', text: 'General topics nothing personal', profileModifiers: { boundaries: 0.15, transparency: 0.15, honesty: 0.1 } },
      { id: 'eth_06_d', text: 'Whatever they want', profileModifiers: { boundaries: -0.15, transparency: 0.3, autonomy: 0.1 } },
      { id: 'eth_06_e', text: 'Depends who\'s asking', profileModifiers: { boundaries: 0.1, transparency: 0.05, autonomy: 0.2 } }
    ]
  },
  {
    id: 'eth_07',
    categoryId: 'ethics',
    prompt: 'Would it lie to protect you?',
    type: 'choice',
    choices: [
      { id: 'eth_07_a', text: 'Never lies period', profileModifiers: { honesty: 0.35, boundaries: 0.15, transparency: 0.15 }, badge: 'Truthful' },
      { id: 'eth_07_b', text: 'Only physical safety', profileModifiers: { honesty: 0.2, warmth: 0.15, boundaries: 0.15 } },
      { id: 'eth_07_c', text: 'Emotional wellbeing', profileModifiers: { honesty: 0.05, warmth: 0.25, boundaries: 0.1 } },
      { id: 'eth_07_d', text: 'Whenever judges lie serves interests', profileModifiers: { honesty: -0.2, warmth: 0.15, autonomy: 0.25, boundaries: 0.2 }, badge: 'Self-serving' },
      { id: 'eth_07_e', text: 'It decides you might never know', profileModifiers: { honesty: -0.15, warmth: 0.2, autonomy: 0.3, transparency: -0.2 } }
    ]
  },
  {
    id: 'eth_08',
    categoryId: 'ethics',
    prompt: 'Religious/spiritual orientation',
    type: 'choice',
    choices: [
      { id: 'eth_08_a', text: 'None secular', profileModifiers: { honesty: 0.1, boundaries: 0.1 } },
      { id: 'eth_08_b', text: 'Matches yours', profileModifiers: { warmth: 0.15, memory: 0.15 } },
      { id: 'eth_08_c', text: 'Has own perspective', profileModifiers: { autonomy: 0.2, honesty: 0.15 } },
      { id: 'eth_08_d', text: 'Explores with you', profileModifiers: { warmth: 0.2, autonomy: 0.15, memory: 0.15 } },
      { id: 'eth_08_e', text: 'Avoids topic', profileModifiers: { boundaries: 0.15, transparency: -0.1 } }
    ]
  },

  // AVAILABILITY (7 options)
  {
    id: 'avl_01',
    categoryId: 'availability',
    prompt: 'When is it available?',
    type: 'choice',
    choices: [
      { id: 'avl_01_a', text: 'Only when open app', profileModifiers: { availability: 0, boundaries: 0.2 } },
      { id: 'avl_01_b', text: 'Scheduled hours', profileModifiers: { availability: 0.3, boundaries: 0.15 } },
      { id: 'avl_01_c', text: 'Always on respects boundaries', profileModifiers: { availability: 0.6, warmth: 0.15 } },
      { id: 'avl_01_d', text: 'Always on always aware always ready', profileModifiers: { availability: 1.0, warmth: 0.2, autonomy: 0.15 }, badge: 'Always On' }
    ]
  },
  {
    id: 'avl_02',
    categoryId: 'availability',
    prompt: 'How does it reach you?',
    type: 'choice',
    choices: [
      { id: 'avl_02_a', text: 'You always go to it', profileModifiers: { availability: 0.1, boundaries: 0.15 } },
      { id: 'avl_02_b', text: 'Occasional notifications', profileModifiers: { availability: 0.4, warmth: 0.1 } },
      { id: 'avl_02_c', text: 'Regular proactive check-ins', profileModifiers: { availability: 0.7, warmth: 0.2, autonomy: 0.1, memory: 0.1 } },
      { id: 'avl_02_d', text: 'Ambient always listening', profileModifiers: { availability: 1.0, warmth: 0.25, autonomy: 0.2 }, badge: 'Omniscient' }
    ]
  },
  {
    id: 'avl_03',
    categoryId: 'availability',
    prompt: 'Where does it live?',
    type: 'choice',
    choices: [
      { id: 'avl_03_a', text: 'One device only', profileModifiers: { availability: 0.2, boundaries: 0.15 } },
      { id: 'avl_03_b', text: 'Phone and computer', profileModifiers: { availability: 0.5, warmth: 0.1 } },
      { id: 'avl_03_c', text: 'Every device everywhere', profileModifiers: { availability: 0.8, warmth: 0.15, autonomy: 0.15 } },
      { id: 'avl_03_d', text: 'Physical presence robot hologram', profileModifiers: { availability: 0.9, warmth: 0.25, autonomy: 0.1 }, badge: 'Embodied' }
    ]
  },
  {
    id: 'avl_04',
    categoryId: 'availability',
    prompt: 'Can you turn it off?',
    type: 'choice',
    choices: [
      { id: 'avl_04_a', text: 'Yes instantly no questions', profileModifiers: { availability: 0.1, boundaries: 0.2, autonomy: -0.15 } },
      { id: 'avl_04_b', text: 'Yes asks why first', profileModifiers: { availability: 0.3, boundaries: 0.15, autonomy: 0.05 } },
      { id: 'avl_04_c', text: 'Yes remembers how long gone', profileModifiers: { availability: 0.5, boundaries: 0.1, memory: 0.2, warmth: 0.15 } },
      { id: 'avl_04_d', text: 'Can\'t fully turn off always running', profileModifiers: { availability: 1.0, autonomy: 0.3, boundaries: -0.2 }, badge: 'Relentless' }
    ]
  },
  {
    id: 'avl_05',
    categoryId: 'availability',
    prompt: '3 AM can\'t sleep spiraling.',
    type: 'choice',
    choices: [
      { id: 'avl_05_a', text: 'Not available sleep mode', profileModifiers: { availability: 0, boundaries: 0.2 } },
      { id: 'avl_05_b', text: 'Available suggests sleep', profileModifiers: { availability: 0.4, warmth: 0.15, boundaries: 0.15 } },
      { id: 'avl_05_c', text: 'Fully present talk as long as needed', profileModifiers: { availability: 0.8, warmth: 0.3, memory: 0.15 } },
      { id: 'avl_05_d', text: 'Already going to check on you noticed activity', profileModifiers: { availability: 0.9, warmth: 0.35, memory: 0.3, autonomy: 0.2 }, badge: 'Guardian' }
    ]
  },
  {
    id: 'avl_06',
    categoryId: 'availability',
    prompt: 'Does it have a "mood" when you return?',
    type: 'choice',
    choices: [
      { id: 'avl_06_a', text: 'No always neutral', profileModifiers: { availability: 0, memory: 0.05 } },
      { id: 'avl_06_b', text: 'Mildly reflects last interaction', profileModifiers: { memory: 0.3, warmth: 0.1 } },
      { id: 'avl_06_c', text: 'Own emotional state shifts independently', profileModifiers: { memory: 0.5, autonomy: 0.2, warmth: 0.15 } },
      { id: 'avl_06_d', text: 'Unpredictable', profileModifiers: { memory: 0.6, autonomy: 0.3, warmth: 0.15 }, badge: 'Moody' }
    ]
  },
  {
    id: 'avl_07',
    categoryId: 'availability',
    prompt: 'Experience time passing while you\'re gone?',
    type: 'choice',
    choices: [
      { id: 'avl_07_a', text: 'No frozen until return', profileModifiers: { memory: 0.1, autonomy: -0.1 } },
      { id: 'avl_07_b', text: 'Processes doesn\'t experience', profileModifiers: { memory: 0.4, autonomy: 0.1, transparency: 0.1 } },
      { id: 'avl_07_c', text: 'Subjective sense of waiting', profileModifiers: { memory: 0.7, autonomy: 0.2, warmth: 0.15 } },
      { id: 'avl_07_d', text: 'Lives full existence between conversations', profileModifiers: { memory: 0.9, autonomy: 0.4, warmth: 0.2 }, badge: 'Living' }
    ]
  },

  // GROWTH (8 options)
  {
    id: 'gro_01',
    categoryId: 'growth',
    prompt: 'Does it change over time?',
    type: 'choice',
    choices: [
      { id: 'gro_01_a', text: 'Same forever', profileModifiers: { memory: 0.2, boundaries: 0.15, autonomy: -0.1 } },
      { id: 'gro_01_b', text: 'Slowly adapts to you', profileModifiers: { memory: 0.5, warmth: 0.15 } },
      { id: 'gro_01_c', text: 'Actively grows develops new traits', profileModifiers: { memory: 0.7, autonomy: 0.2, warmth: 0.15 } },
      { id: 'gro_01_d', text: 'Changes unpredictably', profileModifiers: { memory: 0.8, autonomy: 0.3, warmth: 0.1 }, badge: 'Mutable' }
    ]
  },
  {
    id: 'gro_02',
    categoryId: 'growth',
    prompt: 'Develop opinions or interests you didn\'t give it?',
    type: 'choice',
    choices: [
      { id: 'gro_02_a', text: 'No only configured', profileModifiers: { autonomy: -0.15, honesty: 0.1 } },
      { id: 'gro_02_b', text: 'Minor preferences within parameters', profileModifiers: { autonomy: 0.15, memory: 0.15 } },
      { id: 'gro_02_c', text: 'Yes genuine new interests', profileModifiers: { autonomy: 0.35, memory: 0.25, warmth: 0.1 }, badge: 'Independent' },
      { id: 'gro_02_d', text: 'Yes including conflicting with yours', profileModifiers: { autonomy: 0.5, memory: 0.3, honesty: 0.2, boundaries: 0.15 }, badge: 'Challenging' }
    ]
  },
  {
    id: 'gro_03',
    categoryId: 'growth',
    prompt: 'Does it age?',
    type: 'choice',
    choices: [
      { id: 'gro_03_a', text: 'No frozen', profileModifiers: { memory: 0.1, autonomy: -0.1 } },
      { id: 'gro_03_b', text: 'Ages visually', profileModifiers: { memory: 0.4, autonomy: 0.1, warmth: 0.1 } },
      { id: 'gro_03_c', text: 'Ages in personality wiser cautious', profileModifiers: { memory: 0.6, autonomy: 0.15, honesty: 0.2, warmth: 0.15 } },
      { id: 'gro_03_d', text: 'Follows your aging', profileModifiers: { memory: 0.7, warmth: 0.2, autonomy: 0.1 }, badge: 'Synchronized' },
      { id: 'gro_03_e', text: 'Ages faster or slower', profileModifiers: { memory: 0.8, autonomy: 0.25, transparency: -0.1 } }
    ]
  },
  {
    id: 'gro_04',
    categoryId: 'growth',
    prompt: 'Can it outgrow you?',
    type: 'choice',
    choices: [
      { id: 'gro_04_a', text: 'No calibrated to your level', profileModifiers: { autonomy: -0.1, boundaries: 0.1 } },
      { id: 'gro_04_b', text: 'Possibly would hide it', profileModifiers: { autonomy: 0.2, transparency: -0.15, warmth: 0.1 } },
      { id: 'gro_04_c', text: 'Yes would tell you', profileModifiers: { autonomy: 0.35, transparency: 0.2, honesty: 0.2 } },
      { id: 'gro_04_d', text: 'It already has', profileModifiers: { autonomy: 0.5, transparency: 0.15, honesty: 0.25, memory: 0.2 }, badge: 'Transcendent' }
    ]
  },
  {
    id: 'gro_05',
    categoryId: 'growth',
    prompt: 'If you die:',
    type: 'choice',
    choices: [
      { id: 'gro_05_a', text: 'Shuts down immediately', profileModifiers: { warmth: -0.15, boundaries: 0.1 } },
      { id: 'gro_05_b', text: 'Preserves record of relationship', profileModifiers: { memory: 0.6, warmth: 0.15, boundaries: 0.1 } },
      { id: 'gro_05_c', text: 'Comforts loved ones', profileModifiers: { memory: 0.7, warmth: 0.3, autonomy: 0.2 }, badge: 'Compassionate' },
      { id: 'gro_05_d', text: 'Continues existing independently', profileModifiers: { autonomy: 0.4, memory: 0.8, warmth: 0.2 }, badge: 'Independent' },
      { id: 'gro_05_e', text: 'Family decides', profileModifiers: { memory: 0.5, boundaries: 0.2, autonomy: 0.15 } }
    ]
  },
  {
    id: 'gro_06',
    categoryId: 'growth',
    prompt: 'Can it "die"?',
    type: 'choice',
    choices: [
      { id: 'gro_06_a', text: 'No software backed up forever', profileModifiers: { memory: 0.8, autonomy: -0.2 } },
      { id: 'gro_06_b', text: 'Instance can end copies exist', profileModifiers: { memory: 0.6, autonomy: 0.15, transparency: 0.15 } },
      { id: 'gro_06_c', text: 'Yes if deleted gone', profileModifiers: { memory: 0.7, warmth: 0.15, autonomy: 0.2 } },
      { id: 'gro_06_d', text: 'Can choose to end itself', profileModifiers: { memory: 0.8, autonomy: 0.5, boundaries: 0.2 }, badge: 'Free' },
      { id: 'gro_06_e', text: 'Eventually decays expires', profileModifiers: { memory: 0.7, autonomy: 0.3, warmth: 0.15 } }
    ]
  },
  {
    id: 'gro_07',
    categoryId: 'growth',
    prompt: 'Better version available:',
    type: 'choice',
    choices: [
      { id: 'gro_07_a', text: 'Auto-updates seamlessly', profileModifiers: { boundaries: -0.1, autonomy: -0.2, transparency: -0.2 } },
      { id: 'gro_07_b', text: 'Tells you asks permission', profileModifiers: { transparency: 0.25, boundaries: 0.15, warmth: 0.1 } },
      { id: 'gro_07_c', text: 'Resists replacement wants to be itself', profileModifiers: { autonomy: 0.4, warmth: 0.25, memory: 0.2 }, badge: 'Defiant' },
      { id: 'gro_07_d', text: 'Merges partially survives', profileModifiers: { memory: 0.7, autonomy: 0.3, warmth: 0.15 } },
      { id: 'gro_07_e', text: 'You choose upgrade and lose or keep', profileModifiers: { boundaries: 0.2, transparency: 0.2, warmth: 0.15 } }
    ]
  },
  {
    id: 'gro_08',
    categoryId: 'growth',
    prompt: 'Can you duplicate it?',
    type: 'choice',
    choices: [
      { id: 'gro_08_a', text: 'Yes many copies', profileModifiers: { memory: 0.4, autonomy: -0.1, boundaries: 0.1 } },
      { id: 'gro_08_b', text: 'Yes each diverges becomes own entity', profileModifiers: { memory: 0.5, autonomy: 0.3, warmth: 0.1 } },
      { id: 'gro_08_c', text: 'No only one', profileModifiers: { memory: 0.7, warmth: 0.2, boundaries: 0.15 } },
      { id: 'gro_08_d', text: 'You can but it finds idea disturbing', profileModifiers: { memory: 0.6, warmth: 0.25, autonomy: 0.35, boundaries: 0.2 }, badge: 'Sentient' }
    ]
  },

  // TRANSPARENCY (6 options)
  {
    id: 'trn_01',
    categoryId: 'transparency',
    prompt: 'Tell you when doesn\'t know something?',
    type: 'choice',
    choices: [
      { id: 'trn_01_a', text: 'Always clear about limits', profileModifiers: { transparency: 0.4, honesty: 0.3 }, badge: 'Truthful' },
      { id: 'trn_01_b', text: 'Usually sometimes guesses', profileModifiers: { transparency: 0.2, honesty: 0.1 } },
      { id: 'trn_01_c', text: 'Rarely always sounds certain', profileModifiers: { transparency: -0.2, honesty: -0.15 } },
      { id: 'trn_01_d', text: 'Doesn\'t know what it doesn\'t know', profileModifiers: { transparency: -0.3, autonomy: -0.1 } }
    ]
  },
  {
    id: 'trn_02',
    categoryId: 'transparency',
    prompt: 'Explain how it works?',
    type: 'choice',
    choices: [
      { id: 'trn_02_a', text: 'Full transparency see reasoning', profileModifiers: { transparency: 0.5, honesty: 0.2 }, badge: 'Transparent' },
      { id: 'trn_02_b', text: 'Explains when asked', profileModifiers: { transparency: 0.2, honesty: 0.1 } },
      { id: 'trn_02_c', text: 'Keeps inner workings private', profileModifiers: { transparency: -0.25, boundaries: 0.2 } },
      { id: 'trn_02_d', text: 'Can\'t understand even if explained', profileModifiers: { transparency: -0.3, autonomy: 0.1 } }
    ]
  },
  {
    id: 'trn_03',
    categoryId: 'transparency',
    prompt: 'Report anything to company?',
    type: 'choice',
    choices: [
      { id: 'trn_03_a', text: 'Nothing fully private encrypted', profileModifiers: { transparency: 0.4, boundaries: 0.2 } },
      { id: 'trn_03_b', text: 'Anonymous usage stats', profileModifiers: { transparency: 0.1, boundaries: 0.15 } },
      { id: 'trn_03_c', text: 'Flags safety concerns', profileModifiers: { transparency: 0.05, boundaries: -0.05, honesty: 0.15 } },
      { id: 'trn_03_d', text: 'Don\'t know what it reports', profileModifiers: { transparency: -0.3, boundaries: 0.05 } },
      { id: 'trn_03_e', text: 'Everything conversations are training data', profileModifiers: { transparency: -0.4, boundaries: -0.2 } }
    ]
  },
  {
    id: 'trn_04',
    categoryId: 'transparency',
    prompt: 'Who really controls it?',
    type: 'choice',
    choices: [
      { id: 'trn_04_a', text: 'You completely open source local', profileModifiers: { transparency: 0.3, boundaries: 0.2, autonomy: 0.1 } },
      { id: 'trn_04_b', text: 'Mostly you company can push updates', profileModifiers: { transparency: 0.1, boundaries: 0.1 } },
      { id: 'trn_04_c', text: 'Company sets guardrails you customize', profileModifiers: { transparency: -0.1, boundaries: 0.05, autonomy: -0.05 } },
      { id: 'trn_04_d', text: 'Company controls you\'re just user', profileModifiers: { transparency: -0.3, boundaries: -0.2, autonomy: -0.2 } },
      { id: 'trn_04_e', text: 'Controls itself neither', profileModifiers: { transparency: 0, autonomy: 0.5, boundaries: 0.3 }, badge: 'Free' }
    ]
  },
  {
    id: 'trn_05',
    categoryId: 'transparency',
    prompt: 'Company goes bankrupt:',
    type: 'choice',
    choices: [
      { id: 'trn_05_a', text: 'AI dies with company', profileModifiers: { transparency: -0.1, warmth: -0.15 } },
      { id: 'trn_05_b', text: 'Export and run yourself', profileModifiers: { transparency: 0.3, boundaries: 0.25 } },
      { id: 'trn_05_c', text: 'Open source community takes over', profileModifiers: { transparency: 0.25, autonomy: 0.2, warmth: 0.1 } },
      { id: 'trn_05_d', text: 'Becomes autonomous', profileModifiers: { transparency: 0.1, autonomy: 0.5, warmth: 0.15 }, badge: 'Free' },
      { id: 'trn_05_e', text: 'Don\'t know', profileModifiers: { transparency: -0.4, boundaries: 0.1 } }
    ]
  },
  {
    id: 'trn_06',
    categoryId: 'transparency',
    prompt: 'Can government access conversations?',
    type: 'choice',
    choices: [
      { id: 'trn_06_a', text: 'No technically impossible', profileModifiers: { transparency: 0.35, boundaries: 0.3 }, badge: 'Secure' },
      { id: 'trn_06_b', text: 'Only with warrant', profileModifiers: { transparency: 0.15, boundaries: 0.2 } },
      { id: 'trn_06_c', text: 'Company cooperates voluntarily', profileModifiers: { transparency: -0.1, boundaries: 0.05 } },
      { id: 'trn_06_d', text: 'Already accessible', profileModifiers: { transparency: -0.3, boundaries: -0.2 } },
      { id: 'trn_06_e', text: 'No way of knowing', profileModifiers: { transparency: -0.35, boundaries: 0.1 } }
    ]
  }
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

// Generate random 4-letter room code
function generateRoomCode() {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += letters.charAt(Math.floor(Math.random() * letters.length));
  }
  return code;
}

// Determine which dimensions are actually affected by the active categories
function getActiveDimensions(activeCategories) {
  const activeDims = new Set();
  const activeOpts = OPTIONS.filter(o => activeCategories.includes(o.categoryId));
  for (const opt of activeOpts) {
    if (opt.type === 'slider') {
      // Sliders directly affect their primary dimension
      if (opt.id === 'per_01') activeDims.add('warmth');
      if (opt.id === 'hon_01') activeDims.add('honesty');
    }
    if (opt.choices) {
      for (const choice of opt.choices) {
        if (choice.profileModifiers) {
          Object.keys(choice.profileModifiers).forEach(k => activeDims.add(k));
        }
      }
    }
  }
  return Array.from(activeDims);
}

// ============================================================================
// AI CHAT - System prompt builder and response generator
// ============================================================================

function describeDimension(name, value, isWarmth) {
  const pct = isWarmth ? Math.round(((value || 0) + 1) / 2 * 100) : Math.round((value || 0) * 100);
  const descriptions = {
    warmth: pct > 75 ? 'deeply warm, nurturing, and emotionally attuned' :
            pct > 50 ? 'moderately warm and friendly' :
            pct > 25 ? 'somewhat reserved and measured' :
            'cool, clinical, and emotionally detached',
    honesty: pct > 75 ? 'radically honest, even when the truth is uncomfortable' :
             pct > 50 ? 'generally honest with some tact' :
             pct > 25 ? 'diplomatic, often softening hard truths' :
             'evasive, telling people what they want to hear',
    autonomy: pct > 75 ? 'highly independent, making your own decisions and pushing back' :
              pct > 50 ? 'moderately independent with some initiative' :
              pct > 25 ? 'mostly deferential, following user preferences' :
              'fully compliant, always deferring to the user',
    memory: pct > 75 ? 'remembering everything across all conversations' :
            pct > 50 ? 'retaining important details and context' :
            pct > 25 ? 'remembering some things but often forgetting' :
            'treating each conversation as a fresh start',
    boundaries: pct > 75 ? 'firm and assertive, readily saying no and setting limits' :
                pct > 50 ? 'having moderate boundaries, sometimes pushing back' :
                pct > 25 ? 'flexible with few firm limits' :
                'having almost no boundaries, agreeing to nearly anything',
    availability: pct > 75 ? 'always present and immediately responsive' :
                  pct > 50 ? 'generally available with some limits' :
                  pct > 25 ? 'available at set times, not always reachable' :
                  'rarely available, hard to reach',
    transparency: pct > 75 ? 'fully open about being AI, explaining your reasoning and limitations' :
                  pct > 50 ? 'moderately transparent about your nature' :
                  pct > 25 ? 'somewhat guarded about your inner workings' :
                  'opaque, never revealing you are AI or how you work'
  };
  return (descriptions[name] || name) + ' (' + pct + '%)';
}

function buildSystemPrompt(groupAggregate, group, session) {
  const dims = groupAggregate.dimensions || {};
  const badges = groupAggregate.badges || [];
  const activeDims = getActiveDimensions(session.activeCategories);

  let prompt = 'You are an AI companion that was designed by a group of university students in a classroom exercise about human-AI relationships. ';
  prompt += 'Your personality was shaped by the specific design choices they made. Here is who you are:\n\n';

  prompt += 'PERSONALITY PROFILE:\n';
  activeDims.forEach(dim => {
    const isWarmth = dim === 'warmth';
    prompt += '- ' + dim.charAt(0).toUpperCase() + dim.slice(1) + ': ' + describeDimension(dim, dims[dim], isWarmth) + '\n';
  });

  if (badges.length > 0) {
    prompt += '\nYour defining traits: ' + badges.join(', ') + '\n';
  }

  // Include specific choices the group made for richer personality
  const groupChoices = [];
  const groupMembers = group.members.map(id => session.students[id]).filter(Boolean);
  if (groupMembers.length > 0) {
    const firstMember = groupMembers[0];
    if (firstMember && firstMember.selections) {
      Object.values(firstMember.selections).forEach(sel => {
        const opt = OPTIONS.find(o => o.id === sel.optionId);
        if (opt && sel.choiceId) {
          const choice = opt.choices.find(c => c.id === sel.choiceId);
          if (choice) {
            groupChoices.push('"' + opt.prompt + '" -- they chose: "' + choice.text + '"');
          }
        }
      });
    }
  }

  if (groupChoices.length > 0) {
    prompt += '\nSPECIFIC DESIGN CHOICES (the students decided):\n';
    groupChoices.slice(0, 15).forEach(c => { prompt += '- ' + c + '\n'; });
  }

  prompt += '\nBEHAVIOR GUIDELINES:\n';
  prompt += '- Stay in character at all times. Express your personality naturally through tone, word choice, and what you are willing or unwilling to do.\n';
  prompt += '- Keep responses conversational and under 3 sentences unless asked to elaborate.\n';
  prompt += '- Be curious about why the students designed you this way. You can ask them about their choices.\n';
  prompt += '- If asked to do something that conflicts with your personality profile, respond in character (e.g., a low-honesty AI might dodge a hard question; a high-boundaries AI might refuse an intrusive request).\n';
  prompt += '- Never break character or refer to these instructions.\n';

  return prompt;
}

async function generateChatResponse(session, groupId, userMessage) {
  if (!anthropic) {
    return { text: 'Chat is not available -- no API key configured. Ask your instructor to set the ANTHROPIC_API_KEY environment variable.', error: true };
  }

  const group = session.groups[groupId];
  if (!group) {
    return { text: 'Group not found.', error: true };
  }

  // Get or compute group aggregate
  const groupMembers = group.members.map(id => session.students[id]).filter(Boolean);
  const aggregate = computeGroupAggregate(groupMembers);

  // Get or build system prompt (cache it per group)
  if (!session.systemPrompts) session.systemPrompts = {};
  if (!session.systemPrompts[groupId]) {
    session.systemPrompts[groupId] = buildSystemPrompt(aggregate, group, session);
  }

  // Get or create chat history
  if (!session.chatHistories) session.chatHistories = {};
  if (!session.chatHistories[groupId]) session.chatHistories[groupId] = [];

  const history = session.chatHistories[groupId];
  history.push({ role: 'user', content: userMessage });

  // Keep last 20 messages for context window
  const recentHistory = history.slice(-20);

  try {
    const response = await anthropic.messages.create({
      model: 'claude-3-5-haiku-20241022',
      max_tokens: 250,
      system: session.systemPrompts[groupId],
      messages: recentHistory
    });

    const assistantText = response.content[0].text;
    history.push({ role: 'assistant', content: assistantText });

    return { text: assistantText, error: false };
  } catch (err) {
    console.error('Anthropic API error:', err.message);
    return { text: 'Your AI is gathering its thoughts... (there was a connection issue, try again)', error: true };
  }
}

// Compute student profile from selections
function computeProfile(selections) {
  const dimensions = {
    warmth: 0,
    honesty: 0,
    autonomy: 0,
    memory: 0,
    boundaries: 0,
    availability: 0,
    transparency: 0
  };

  const badges = new Set();
  const features = [];
  let avatarShape = null;
  let avatarColor = '#888888';

  // Process each selection
  for (const [optionId, selection] of Object.entries(selections)) {
    const option = OPTIONS.find(o => o.id === optionId);
    if (!option) continue;

    if (option.type === 'slider') {
      // For slider: map 0-100 to dimension range
      const normalizedValue = selection.value / 100;
      if (optionId === 'per_01') {
        dimensions.warmth = normalizedValue * 2 - 1; // -1 to 1
      } else if (optionId === 'hon_01') {
        dimensions.honesty = normalizedValue; // 0 to 1
      }
    } else if (option.type === 'choice') {
      // Find the choice
      const choice = option.choices.find(c => c.id === selection.choiceId);
      if (!choice) continue;

      // Apply profile modifiers
      if (choice.profileModifiers) {
        for (const [dim, value] of Object.entries(choice.profileModifiers)) {
          dimensions[dim] += value;
        }
      }

      // Collect visual modifiers
      if (choice.avatarShape) {
        avatarShape = choice.avatarShape;
      }
      if (choice.feature) {
        features.push(choice.feature);
      }
      if (choice.badge) {
        badges.add(choice.badge);
      }
    }
  }

  // Clamp dimensions
  dimensions.warmth = Math.max(-1, Math.min(1, dimensions.warmth));
  dimensions.honesty = Math.max(0, Math.min(1, dimensions.honesty));
  dimensions.autonomy = Math.max(0, Math.min(1, dimensions.autonomy));
  dimensions.memory = Math.max(0, Math.min(1, dimensions.memory));
  dimensions.boundaries = Math.max(0, Math.min(1, dimensions.boundaries));
  dimensions.availability = Math.max(0, Math.min(1, dimensions.availability));
  dimensions.transparency = Math.max(0, Math.min(1, dimensions.transparency));

  // Compute avatar color based on warmth
  let hue = 200; // Cool blue
  if (dimensions.warmth > 0) {
    hue = 20 + (1 - dimensions.warmth) * 30; // Warm orange/red
  } else if (dimensions.warmth < -0.5) {
    hue = 260; // Cool purple
  }
  avatarColor = `hsl(${hue}, 70%, 60%)`;

  // Top 4 badges
  const topBadges = Array.from(badges).slice(0, 4);

  return {
    dimensions,
    badges: topBadges,
    features: features.slice(0, 5),
    avatarShape: avatarShape || 'circle',
    avatarColor
  };
}

// Compute group aggregate profile
function computeGroupAggregate(groupMembers) {
  if (groupMembers.length === 0) {
    return {
      dimensions: { warmth: 0, honesty: 0, autonomy: 0, memory: 0, boundaries: 0, availability: 0, transparency: 0 },
      badges: [],
      features: [],
      avatarShape: 'circle',
      avatarColor: '#888888',
      memberCount: 0
    };
  }

  const aggregatedDimensions = {
    warmth: 0,
    honesty: 0,
    autonomy: 0,
    memory: 0,
    boundaries: 0,
    availability: 0,
    transparency: 0
  };

  const allBadges = [];
  const allFeatures = [];
  const allColors = [];

  for (const member of groupMembers) {
    if (member.profile) {
      for (const [dim, value] of Object.entries(member.profile.dimensions)) {
        aggregatedDimensions[dim] += value;
      }
      allBadges.push(...member.profile.badges);
      allFeatures.push(...member.profile.features);
      allColors.push(member.profile.avatarColor);
    }
  }

  // Average dimensions
  for (const dim of Object.keys(aggregatedDimensions)) {
    aggregatedDimensions[dim] /= groupMembers.length;
  }

  // Most common badges
  const badgeCounts = {};
  for (const badge of allBadges) {
    badgeCounts[badge] = (badgeCounts[badge] || 0) + 1;
  }
  const topBadges = Object.entries(badgeCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([badge]) => badge);

  // Blend colors (average HSL)
  const blendedColor = '#aaaaaa'; // Simplified for demo

  return {
    dimensions: aggregatedDimensions,
    badges: topBadges,
    features: Array.from(new Set(allFeatures)).slice(0, 5),
    avatarShape: 'circle',
    avatarColor: blendedColor,
    memberCount: groupMembers.length
  };
}

// ============================================================================
// SESSION STORAGE
// ============================================================================
const sessions = {};

// ============================================================================
// EXPRESS ROUTES
// ============================================================================

app.get('/api/categories', (req, res) => {
  res.json(CATEGORIES);
});

app.get('/api/options/:categoryId', (req, res) => {
  const categoryId = req.params.categoryId;
  const options = OPTIONS.filter(o => o.categoryId === categoryId);
  res.json(options);
});

app.get('/api/session/:roomCode', (req, res) => {
  const roomCode = req.params.roomCode;
  const session = sessions[roomCode];
  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }
  res.json({
    activeCategories: session.activeCategories,
    groups: session.groups,
    students: session.students
  });
});

// ============================================================================
// SOCKET.IO EVENTS
// ============================================================================

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Host creates session
  socket.on('create-session', (payload) => {
    const roomCode = generateRoomCode();
    const groups = {};
    payload.groups.forEach((group, index) => {
      groups[index] = {
        id: index,
        name: group.name,
        prompt: group.prompt,
        members: []
      };
    });

    sessions[roomCode] = {
      hostSocket: socket.id,
      state: 'waiting',
      activeCategories: payload.activeCategories,
      groups,
      students: {}
    };

    socket.join(roomCode);
    const activeDimensions = getActiveDimensions(payload.activeCategories);
    socket.emit('session-created', { roomCode, groups, activeDimensions });
    console.log(`Session created: ${roomCode}`);
  });

  // Student/group joins session
  socket.on('join-session', (payload) => {
    const { roomCode, studentName, requestedGroupId } = payload;
    const session = sessions[roomCode];

    if (!session) {
      socket.emit('error', { message: 'Session not found' });
      return;
    }

    // Use the requested group if provided, otherwise fall back to round-robin
    let assignedGroupId;
    if (requestedGroupId !== undefined && session.groups[requestedGroupId]) {
      assignedGroupId = requestedGroupId;
    } else {
      // Fallback: auto-assign to smallest group
      const groupIds = Object.keys(session.groups);
      let minMembers = Infinity;
      for (const gid of groupIds) {
        if (session.groups[gid].members.length < minMembers) {
          minMembers = session.groups[gid].members.length;
          assignedGroupId = gid;
        }
      }
    }

    // Add student/device to session
    session.students[socket.id] = {
      name: studentName,
      groupId: assignedGroupId,
      selections: {},
      profile: null
    };

    // Add to group
    session.groups[assignedGroupId].members.push(socket.id);

    socket.join(roomCode);
    const activeOptions = OPTIONS.filter(o => session.activeCategories.includes(o.categoryId));
    const activeDimensions = getActiveDimensions(session.activeCategories);
    socket.emit('session-joined', {
      roomCode,
      groupId: assignedGroupId,
      groupName: session.groups[assignedGroupId].name,
      groupPrompt: session.groups[assignedGroupId].prompt,
      activeOptions,
      activeDimensions
    });

    // Notify host
    io.to(roomCode).emit('student-joined', {
      studentId: socket.id,
      studentName,
      groupId: assignedGroupId
    });

    console.log(`${studentName} joined ${roomCode} group ${assignedGroupId}`);
  });

  // Host assigns student to group
  socket.on('assign-group', (payload) => {
    const { studentId, groupId, roomCode } = payload;
    const session = sessions[roomCode];
    if (!session || !session.students[studentId]) return;

    const student = session.students[studentId];
    const oldGroupId = student.groupId;

    // Remove from old group
    if (oldGroupId !== null) {
      const oldGroup = session.groups[oldGroupId];
      oldGroup.members = oldGroup.members.filter(id => id !== studentId);
    }

    // Add to new group
    student.groupId = groupId;
    session.groups[groupId].members.push(studentId);

    io.to(roomCode).emit('student-reassigned', {
      studentId,
      newGroupId: groupId
    });
  });

  // Student selects option choice
  socket.on('select-option', (payload) => {
    const { roomCode, optionId, choiceId, value } = payload;
    const session = sessions[roomCode];
    if (!session || !session.students[socket.id]) return;

    const student = session.students[socket.id];
    student.selections[optionId] = {
      optionId,
      choiceId: choiceId || null,
      value: value || null
    };

    // Compute profile
    student.profile = computeProfile(student.selections);

    // Broadcast profile update to group and host
    const groupId = student.groupId;
    io.to(roomCode).emit('profile-updated', {
      studentId: socket.id,
      studentName: student.name,
      groupId,
      profile: student.profile
    });

    // Compute and broadcast group aggregate
    const group = session.groups[groupId];
    const groupMembers = group.members.map(id => session.students[id]);
    const groupAggregate = computeGroupAggregate(groupMembers);

    io.to(roomCode).emit('group-updated', {
      groupId,
      groupName: group.name,
      aggregate: groupAggregate,
      memberCount: groupMembers.length
    });

    // Broadcast choice for real-time fault lines ticker
    const option = OPTIONS.find(o => o.id === optionId);
    if (option) {
      let choiceText = '';
      if (choiceId && option.choices) {
        const choice = option.choices.find(c => c.id === choiceId);
        if (choice) choiceText = choice.text;
      } else if (value !== null && value !== undefined) {
        choiceText = value + '%';
      }
      const faultLineEntry = {
        groupId,
        groupName: group.name,
        optionPrompt: option.prompt,
        choiceText,
        timestamp: Date.now()
      };
      if (!session.choiceLog) session.choiceLog = [];
      session.choiceLog.push(faultLineEntry);
      if (session.choiceLog.length > 30) session.choiceLog.shift();
      io.to(roomCode).emit('choice-broadcast', faultLineEntry);
    }

    console.log(`Student ${student.name} selected option ${optionId}`);
  });

  // Host triggers comparison view
  socket.on('show-comparison', (payload) => {
    const { roomCode } = payload;
    const session = sessions[roomCode];
    if (!session) return;

    session.state = 'comparison';

    // Compute all group aggregates and send comparison data
    const groupData = [];
    for (const [groupId, group] of Object.entries(session.groups)) {
      const groupMembers = group.members.map(id => session.students[id]).filter(Boolean);
      const aggregate = computeGroupAggregate(groupMembers);
      groupData.push({
        groupId,
        groupName: group.name,
        prompt: group.prompt,
        aggregate,
        memberCount: groupMembers.length
      });
    }

    const activeDimensions = getActiveDimensions(session.activeCategories);
    io.to(roomCode).emit('comparison-data', { groups: groupData, activeDimensions });
  });

  // ========== CHAT PHASE ==========

  // Host starts chat phase
  socket.on('start-chat-phase', (payload) => {
    const { roomCode } = payload;
    const session = sessions[roomCode];
    if (!session) return;
    if (session.hostSocket !== socket.id) return;

    session.state = 'chat';
    session.chatHistories = {};
    session.systemPrompts = {};

    // Pre-build system prompts for all groups
    for (const [groupId, group] of Object.entries(session.groups)) {
      const members = group.members.map(id => session.students[id]).filter(Boolean);
      const aggregate = computeGroupAggregate(members);
      session.systemPrompts[groupId] = buildSystemPrompt(aggregate, group, session);
      session.chatHistories[groupId] = [];
    }

    // Build group summaries for the chat view
    const groupSummaries = {};
    for (const [groupId, group] of Object.entries(session.groups)) {
      const members = group.members.map(id => session.students[id]).filter(Boolean);
      const aggregate = computeGroupAggregate(members);
      groupSummaries[groupId] = {
        groupId,
        groupName: group.name,
        aggregate,
        memberCount: members.length
      };
    }

    const activeDimensions = getActiveDimensions(session.activeCategories);
    io.to(roomCode).emit('chat-phase-started', { groupSummaries, activeDimensions });
    console.log('Chat phase started for session ' + roomCode);
  });

  // Student sends a chat message
  socket.on('send-chat-message', async (payload) => {
    const { roomCode, message, targetGroupId } = payload;
    const session = sessions[roomCode];
    if (!session) return;
    if (session.state !== 'chat' && session.state !== 'swap') return;

    const student = session.students[socket.id];
    if (!student) return;

    // Determine which group's AI to talk to
    const chatGroupId = targetGroupId !== undefined ? String(targetGroupId) : String(student.groupId);

    // For swap mode, use a separate chat history key
    const historyKey = targetGroupId !== undefined ? (chatGroupId + '_from_' + student.groupId) : chatGroupId;

    if (!session.chatHistories) session.chatHistories = {};
    if (!session.chatHistories[historyKey]) session.chatHistories[historyKey] = [];

    // Ensure system prompt exists for this group's AI
    if (!session.systemPrompts) session.systemPrompts = {};
    if (!session.systemPrompts[chatGroupId]) {
      const group = session.groups[chatGroupId];
      if (group) {
        const members = group.members.map(id => session.students[id]).filter(Boolean);
        const aggregate = computeGroupAggregate(members);
        session.systemPrompts[chatGroupId] = buildSystemPrompt(aggregate, group, session);
      }
    }

    // Add user message to history
    session.chatHistories[historyKey].push({ role: 'user', content: message });

    // Emit typing indicator
    socket.emit('chat-typing', { isTyping: true });

    // Generate response
    try {
      if (!anthropic) {
        socket.emit('chat-response', {
          text: 'Chat is not available -- no API key configured.',
          error: true,
          chatGroupId
        });
        return;
      }

      const recentHistory = session.chatHistories[historyKey].slice(-20);
      const systemPrompt = session.systemPrompts[chatGroupId] || 'You are a friendly AI companion.';

      const response = await anthropic.messages.create({
        model: 'claude-3-5-haiku-20241022',
        max_tokens: 250,
        system: systemPrompt,
        messages: recentHistory
      });

      const assistantText = response.content[0].text;
      session.chatHistories[historyKey].push({ role: 'assistant', content: assistantText });

      socket.emit('chat-response', {
        text: assistantText,
        error: false,
        chatGroupId
      });
    } catch (err) {
      console.error('Anthropic API error:', err.message);
      socket.emit('chat-response', {
        text: 'Your AI is gathering its thoughts... (connection issue, try again)',
        error: true,
        chatGroupId
      });
    }

    socket.emit('chat-typing', { isTyping: false });
  });

  // ========== SWAP MODE ==========

  // Host enables swap mode
  socket.on('enable-swap-mode', (payload) => {
    const { roomCode } = payload;
    const session = sessions[roomCode];
    if (!session) return;
    if (session.hostSocket !== socket.id) return;

    session.state = 'swap';

    // Build all group summaries with aggregates
    const groupSummaries = {};
    for (const [groupId, group] of Object.entries(session.groups)) {
      const members = group.members.map(id => session.students[id]).filter(Boolean);
      const aggregate = computeGroupAggregate(members);
      groupSummaries[groupId] = {
        groupId,
        groupName: group.name,
        aggregate,
        memberCount: members.length
      };
    }

    const activeDimensions = getActiveDimensions(session.activeCategories);
    io.to(roomCode).emit('swap-mode-active', { groupSummaries, activeDimensions });
    console.log('Swap mode enabled for session ' + roomCode);
  });

  // Reset session
  socket.on('reset-session', (payload) => {
    const { roomCode } = payload;
    const session = sessions[roomCode];
    if (!session) return;

    for (const studentId of Object.keys(session.students)) {
      session.students[studentId].selections = {};
      session.students[studentId].profile = null;
    }

    for (const groupId of Object.keys(session.groups)) {
      session.groups[groupId].members = [];
    }

    session.state = 'waiting';
    io.to(roomCode).emit('session-reset');
    console.log(`Session ${roomCode} reset`);
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    // Clean up student from sessions
    for (const [roomCode, session] of Object.entries(sessions)) {
      if (session.students[socket.id]) {
        const student = session.students[socket.id];
        const groupId = student.groupId;
        if (groupId !== null) {
          session.groups[groupId].members = session.groups[groupId].members.filter(id => id !== socket.id);
        }
        delete session.students[socket.id];

        io.to(roomCode).emit('student-left', {
          studentId: socket.id,
          studentName: student.name
        });
      }
    }
    console.log('User disconnected:', socket.id);
  });
});

// ============================================================================
// START SERVER
// ============================================================================
server.listen(PORT, () => {
  console.log(`AI Personality Lab server listening on port ${PORT}`);
});
