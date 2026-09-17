import type { CallObjective } from '@/domain/ai-config';
import type { SpeechRegister } from '@/lib/speech/speech-types';

/**
 * The words a demo call is made of, in each language it can be held in.
 *
 * This is an extraction, not a second engine. Every English string here is the
 * one `transcript.ts` used inline before, character for character, and the slot
 * names it is keyed by are the same slot names the deterministic `variant`
 * seeds are computed from — so an English transcript built today is identical
 * to one built before this file existed. There is a test that asserts exactly
 * that, because "identical" is a claim worth checking rather than asserting.
 *
 * Why the conversation carries the language rather than the voice doing it:
 *
 *   A speech engine handed English text and told to read it in Hindi does not
 *   translate anything. It reads English words with Hindi phonetics, which is
 *   neither language and is obviously wrong to anyone who speaks either. The
 *   only honest way to demonstrate a Hindi call is for the call to actually be
 *   in Hindi.
 *
 *   And it has to be the *same* call. A transcript generated in English and
 *   then voiced from a separate Hindi script would be two sources of truth,
 *   and the first time they disagreed — a different slot agreed, a different
 *   outcome implied — the demo would be showing one thing and saying another.
 *   So language is a parameter of the one generator, and what is displayed is
 *   what is spoken.
 *
 * Hinglish is written as Hinglish: Latin script, English sentence frame, Hindi
 * verbs and connectives, exactly as these calls are actually held in urban
 * India. It is never transliterated into Devanagari and never straightened into
 * one language or the other.
 *
 * What stays in English in every language: the summary, the outcome and the
 * next action. Those are AIBOT's own note to the business owner rather than
 * part of the conversation, and an operations team reading a queue of calls
 * wants one language in that column whatever language each call was held in.
 */

/** A `{token}` filled in by the caller. */
export type Template = string;

export interface NonBookingClose {
  agent: Template;
  lead: string;
  /** Tail of the agent's last line, after the thanks. */
  wrapUp: string;
}

export interface Phrasebook {
  /** The agent's stated reason for calling, spliced into every greeting. */
  reason: string;
  /** Stand-in for a lead whose name is not known. */
  someone: string;
  /** Stand-in for an agent with no company set. */
  ourTeam: string;
  /** How a spoken list is joined: "a, b and c". */
  listJoin: string;

  /** `{name}` `{agent}` `{company}` `{reason}` */
  greet: readonly Template[];
  ack: readonly string[];
  ask: readonly string[];

  pitchYes: readonly string[];
  /** `{topics}` */
  qualify: readonly Template[];
  qualifyAnswer: readonly string[];
  qualifyAck: readonly string[];

  keen: readonly string[];
  thanks: readonly string[];
  /** `{what}` */
  bookingOffer: Template;
  whatVisit: string;
  whatDemo: string;
  /**
   * [what the lead says, how the agent names the slot back, what the summary
   * calls it].
   *
   * The third is always English. It is a fact about the call rather than part
   * of it, and it is what the summary and the follow-up are written from.
   */
  slots: readonly (readonly [string, string, string])[];
  /** `{slot}` `{name}` `{send}` */
  slotConfirm: Template;
  sendVisit: string;
  sendDemo: string;
  /** Opens the agent's closing line: "Thanks {name},". */
  wrapUpPrefix: Template;
  nonBooking: Record<Exclude<CallObjective, 'BOOK_APPOINTMENT' | 'BOOK_DEMO'>, NonBookingClose>;

  busy: readonly string[];
  followUpOffer: string;
  /** `{day}` */
  followUpAsk: Template;
  /** `{name}` `{day}` */
  followUpConfirm: Template;
  /** [spoken, as the summary will name it] */
  days: readonly (readonly [string, string])[];

  /** [what the lead says, the reason as the summary will phrase it] */
  declines: readonly (readonly [string, string])[];
  declineAck: string;
  declineYes: string;
  /** `{name}` */
  declineDone: Template;
}

/* -------------------------------------------------------------------------- */
/* English — the original wording, unchanged                                   */
/* -------------------------------------------------------------------------- */

const ENGLISH: Phrasebook = {
  reason: 'I am following up on your enquiry',
  someone: 'there',
  ourTeam: 'our team',
  listJoin: 'and',

  greet: [
    '{greeting} {name}, this is {agent} from {company}. {reason} — is now an alright time?',
    '{greeting} {name}, {agent} calling from {company}. {reason} — have you got a minute?',
    "{greeting} {name}, it's {agent} at {company}. {reason} — is this a good moment?",
  ],
  ack: ['Yes, go ahead.', 'Sure, now is fine.', 'Yes, I have a couple of minutes.'],
  ask: [
    'Does that sound like what you were looking for?',
    'Is that the sort of thing you had in mind?',
    'Does that line up with what you are after?',
  ],

  pitchYes: ['Yes, that is the sort of thing.', 'It could be, yes.', 'Broadly, yes.'],
  qualify: [
    'Before we go further, can I check a couple of things — {topics}?',
    'So I point you at the right thing, could you tell me about {topics}?',
    'It would help to know about {topics} — can we run through those?',
  ],
  qualifyAnswer: [
    'Yes, of course. I have a fair idea of what I am after on all of that.',
    'Sure. I know roughly what I want there.',
    'Happy to — I have thought about most of that already.',
  ],
  qualifyAck: [
    'That is helpful, thank you.',
    'Understood — that gives me what I need.',
    'Good, that narrows it down.',
  ],

  keen: [
    "Yes, that's close to what I had in mind. What would the next step be?",
    'That does sound right. How do we take it forward?',
    "Yes, I'd like to see it. What happens next?",
  ],
  thanks: ['Perfect, thank you.', 'Great, thanks.', 'That works, thanks.'],
  bookingOffer: 'I can set up {what} this week. Would a weekday evening or the weekend suit you better?',
  whatVisit: 'a visit',
  whatDemo: 'a demo',
  slots: [
    ['Weekend works. Saturday afternoon if possible.', 'Saturday afternoon', 'Saturday afternoon'],
    ['Weekday evening is easier for me — Wednesday after six?', 'Wednesday evening', 'Wednesday evening'],
    ['Sunday morning would suit me best.', 'Sunday morning', 'Sunday morning'],
  ],
  slotConfirm: '{slot} it is, {name}. {send}',
  sendVisit: "I'll send the details across on WhatsApp so you have the address and my number.",
  sendDemo: "I'll send the joining link across on WhatsApp.",

  wrapUpPrefix: 'Thanks {name},',
  nonBooking: {
    QUALIFY: {
      agent: 'I have what I need for now. Would it help if one of our team called you with the specifics?',
      lead: 'Yes, that would be useful.',
      wrapUp: 'I will pass this to the team and they will be in touch.',
    },
    COLLECT_REQUIREMENTS: {
      agent: 'Let me make sure I have your requirements down correctly before I pass this on.',
      lead: 'Yes, that is all of it.',
      wrapUp: 'I have noted that down and will send a written summary across.',
    },
    GENERATE_INTEREST: {
      agent: 'I will not take more of your time — may I send you the details to look over?',
      lead: 'Yes, send them across.',
      wrapUp: 'I will send those over now.',
    },
    FOLLOW_UP: {
      agent: 'Good — shall I pick this back up with you once you have had a think?',
      lead: 'Yes, that works.',
      wrapUp: 'I will follow up with you shortly.',
    },
  },

  busy: [
    "It's interesting, but I'm in the middle of something right now.",
    'Sounds useful, but I am driving at the moment.',
    'I am interested, just not free to talk right now.',
  ],
  followUpOffer:
    'Of course — I will not keep you. Would it help if I sent the details across and called back later in the week?',
  followUpAsk: 'Yes, send them over and call me {day}.',
  followUpConfirm: "Will do, {name}. I'll message you the details and ring you on {day}.",
  days: [
    ['Thursday', 'Thursday'],
    ['Monday', 'Monday'],
    ['Friday', 'Friday'],
  ],

  declines: [
    ["Thanks, but I've already sorted this out elsewhere.", 'has already arranged this elsewhere'],
    ['Not for me, I am afraid — I decided against it.', 'has decided against it'],
    ['No thank you, we went with someone else.', 'has gone with another provider'],
  ],
  declineAck: 'Understood, and thank you for telling me. Would you like me to take you off this list?',
  declineYes: 'Yes please.',
  declineDone: "Done — you won't hear from us again. Have a good day, {name}.",
};

/* -------------------------------------------------------------------------- */
/* Hindi                                                                       */
/* -------------------------------------------------------------------------- */

const HINDI: Phrasebook = {
  reason: 'मैं आपकी पूछताछ के बारे में बात करना चाहती थी',
  someone: 'जी',
  ourTeam: 'हमारी टीम',
  listJoin: 'और',

  greet: [
    '{greeting} {name} जी, मैं {company} से {agent} बोल रही हूँ। {reason} — क्या अभी बात करने का सही समय है?',
    'नमस्ते {name} जी, {company} से {agent}। {reason} — क्या आपके पास एक मिनट है?',
    '{greeting} {name} जी, {company} से {agent} बोल रही हूँ। {reason} — क्या अभी सुविधा है?',
  ],
  ack: ['जी हाँ, बताइए।', 'हाँ, अभी ठीक है।', 'जी, दो मिनट हैं मेरे पास।'],
  ask: [
    'क्या यह वही है जो आप ढूँढ रहे थे?',
    'क्या आपके मन में कुछ ऐसा ही था?',
    'क्या यह आपकी ज़रूरत से मेल खाता है?',
  ],

  pitchYes: ['जी हाँ, कुछ ऐसा ही।', 'हो सकता है, जी।', 'मोटे तौर पर हाँ।'],
  qualify: [
    'आगे बढ़ने से पहले दो बातें पूछ लूँ — {topics}?',
    'ताकि मैं आपको सही विकल्प बता सकूँ, {topics} के बारे में बताइएगा?',
    '{topics} के बारे में जान लेती तो आसानी होती — बता सकते हैं?',
  ],
  qualifyAnswer: [
    'जी बिल्कुल। इन सब पर मेरा अंदाज़ा साफ़ है।',
    'हाँ, मुझे लगभग पता है कि मुझे क्या चाहिए।',
    'ज़रूर — इनमें से ज़्यादातर पर मैं सोच चुका हूँ।',
  ],
  qualifyAck: [
    'यह जानकारी उपयोगी है, धन्यवाद।',
    'समझ गई — मुझे जो चाहिए था वह मिल गया।',
    'ठीक है, इससे बात साफ़ हो गई।',
  ],

  keen: [
    'हाँ, यह मेरी सोच के करीब है। आगे क्या करना होगा?',
    'सुनने में सही लग रहा है। आगे कैसे बढ़ें?',
    'जी, मैं देखना चाहूँगा। अब आगे क्या?',
  ],
  thanks: ['बढ़िया, धन्यवाद।', 'ठीक है, शुक्रिया।', 'चलेगा, धन्यवाद।'],
  bookingOffer: 'मैं इसी हफ़्ते {what} रखवा सकती हूँ। आपको हफ़्ते के दिन शाम को ठीक रहेगा या वीकेंड?',
  whatVisit: 'एक विज़िट',
  whatDemo: 'एक डेमो',
  slots: [
    ['वीकेंड ठीक रहेगा। हो सके तो शनिवार दोपहर।', 'शनिवार दोपहर', 'Saturday afternoon'],
    ['मेरे लिए हफ़्ते के दिन शाम आसान है — बुधवार छह बजे के बाद?', 'बुधवार शाम', 'Wednesday evening'],
    ['रविवार सुबह मेरे लिए सबसे ठीक रहेगा।', 'रविवार सुबह', 'Sunday morning'],
  ],
  slotConfirm: 'तो {slot} तय रहा, {name} जी। {send}',
  sendVisit: 'मैं पता और अपना नंबर व्हाट्सएप पर भेज देती हूँ।',
  sendDemo: 'मैं जॉइनिंग लिंक व्हाट्सएप पर भेज देती हूँ।',

  wrapUpPrefix: 'धन्यवाद {name} जी,',
  nonBooking: {
    QUALIFY: {
      agent: 'मुझे अभी के लिए जानकारी मिल गई। क्या हमारी टीम से कोई आपको विस्तार से बता दे?',
      lead: 'जी हाँ, वह ठीक रहेगा।',
      wrapUp: 'मैं यह टीम को दे देती हूँ, वे आपसे संपर्क करेंगे।',
    },
    COLLECT_REQUIREMENTS: {
      agent: 'आगे भेजने से पहले मैं आपकी ज़रूरतें एक बार ठीक से नोट कर लूँ।',
      lead: 'जी, बस इतना ही है।',
      wrapUp: 'मैंने नोट कर लिया है और लिखित सारांश भेज दूँगी।',
    },
    GENERATE_INTEREST: {
      agent: 'आपका और समय नहीं लूँगी — क्या मैं आपको जानकारी भेज दूँ?',
      lead: 'जी हाँ, भेज दीजिए।',
      wrapUp: 'मैं अभी भेज देती हूँ।',
    },
    FOLLOW_UP: {
      agent: 'ठीक है — आप सोच लीजिए, फिर मैं दोबारा बात कर लूँ?',
      lead: 'जी, वह ठीक रहेगा।',
      wrapUp: 'मैं जल्दी ही दोबारा संपर्क करती हूँ।',
    },
  },

  busy: [
    'दिलचस्प है, पर अभी मैं किसी काम में लगा हूँ।',
    'काम की बात लग रही है, पर अभी मैं गाड़ी चला रहा हूँ।',
    'रुचि है, बस अभी बात करने का समय नहीं है।',
  ],
  followUpOffer:
    'बिल्कुल — आपका समय नहीं लूँगी। क्या मैं जानकारी भेज दूँ और हफ़्ते में आगे दोबारा कॉल कर लूँ?',
  followUpAsk: 'जी, भेज दीजिए और {day} को कॉल कीजिए।',
  followUpConfirm: 'ठीक है {name} जी। मैं जानकारी भेज देती हूँ और {day} को कॉल करती हूँ।',
  days: [
    ['गुरुवार', 'Thursday'],
    ['सोमवार', 'Monday'],
    ['शुक्रवार', 'Friday'],
  ],

  declines: [
    ['धन्यवाद, पर मैंने यह कहीं और करवा लिया है।', 'has already arranged this elsewhere'],
    ['मेरे लिए नहीं है — मैंने न करने का फ़ैसला कर लिया।', 'has decided against it'],
    ['जी नहीं, हमने किसी और के साथ कर लिया।', 'has gone with another provider'],
  ],
  declineAck: 'समझ गई, बताने के लिए धन्यवाद। क्या मैं आपका नाम इस सूची से हटा दूँ?',
  declineYes: 'जी हाँ, हटा दीजिए।',
  declineDone: 'हो गया — अब हमारी तरफ़ से कॉल नहीं आएगी। आपका दिन शुभ हो, {name} जी।',
};

/* -------------------------------------------------------------------------- */
/* Hinglish                                                                    */
/* -------------------------------------------------------------------------- */

const HINGLISH: Phrasebook = {
  reason: 'main aapki enquiry ke baare mein baat karna chahti thi',
  someone: 'ji',
  ourTeam: 'hamari team',
  listJoin: 'aur',

  greet: [
    '{greeting} {name}, main {company} se {agent} baat kar rahi hoon. {reason} — abhi baat karne ka sahi time hai?',
    'Hello {name}, {company} se {agent} bol rahi hoon. {reason} — ek minute mil jayega?',
    '{greeting} {name}, {agent} here from {company}. {reason} — abhi convenient hai?',
  ],
  ack: ['Haan ji, boliye.', 'Sure, abhi theek hai.', 'Ji, do minute hain mere paas.'],
  ask: [
    'Kya yahi cheez aap dhoondh rahe the?',
    'Aapke mind mein kuch aisa hi tha?',
    'Ye aapki requirement se match karta hai?',
  ],

  pitchYes: ['Haan ji, kuch aisa hi.', 'Ho sakta hai, ji.', 'Broadly haan.'],
  qualify: [
    'Aage badhne se pehle do cheezein pooch loon — {topics}?',
    'Taaki main aapko sahi option bata sakoon, {topics} ke baare mein bata dijiye?',
    '{topics} ke baare mein pata chal jata to aasani hoti — bata sakte hain?',
  ],
  qualifyAnswer: [
    'Haan bilkul. In sab par mera idea clear hai.',
    'Sure. Mujhe lagbhag pata hai ki kya chahiye.',
    'Zaroor — inmein se zyada tar par main soch chuka hoon.',
  ],
  qualifyAck: [
    'Ye helpful hai, thank you.',
    'Samajh gayi — jo chahiye tha mil gaya.',
    'Theek hai, isse baat clear ho gayi.',
  ],

  keen: [
    'Haan, ye meri soch ke kaafi close hai. Aage kya karna hoga?',
    'Sunne mein sahi lag raha hai. Aage kaise badhein?',
    'Ji, main dekhna chahunga. Ab next step kya hai?',
  ],
  thanks: ['Perfect, thank you.', 'Great, thanks.', 'Chalega, thanks.'],
  bookingOffer: 'Main isi week {what} rakhwa sakti hoon. Weekday evening theek rahega ya weekend?',
  whatVisit: 'ek visit',
  whatDemo: 'ek demo',
  slots: [
    ['Weekend chalega. Ho sake to Saturday afternoon.', 'Saturday afternoon', 'Saturday afternoon'],
    ['Mere liye weekday evening aasan hai — Wednesday six ke baad?', 'Wednesday evening', 'Wednesday evening'],
    ['Sunday morning mere liye sabse theek rahega.', 'Sunday morning', 'Sunday morning'],
  ],
  slotConfirm: 'To {slot} fix, {name}. {send}',
  sendVisit: 'Main address aur apna number WhatsApp par bhej deti hoon.',
  sendDemo: 'Main joining link WhatsApp par bhej deti hoon.',

  wrapUpPrefix: 'Thanks {name},',
  nonBooking: {
    QUALIFY: {
      agent: 'Mujhe abhi ke liye details mil gayin. Hamari team se koi aapko specifics bata de?',
      lead: 'Haan ji, wo useful rahega.',
      wrapUp: 'Main ye team ko de deti hoon, wo aapse contact karenge.',
    },
    COLLECT_REQUIREMENTS: {
      agent: 'Aage bhejne se pehle main aapki requirements ek baar note kar loon.',
      lead: 'Ji, bas itna hi hai.',
      wrapUp: 'Note kar liya hai, written summary bhej dungi.',
    },
    GENERATE_INTEREST: {
      agent: 'Aapka aur time nahi loongi — main aapko details bhej doon?',
      lead: 'Haan ji, bhej dijiye.',
      wrapUp: 'Main abhi bhej deti hoon.',
    },
    FOLLOW_UP: {
      agent: 'Theek hai — aap soch lijiye, phir main dobara baat kar loon?',
      lead: 'Ji, wo theek rahega.',
      wrapUp: 'Main jaldi hi dobara contact karti hoon.',
    },
  },

  busy: [
    'Interesting hai, par abhi main kisi kaam mein laga hoon.',
    'Kaam ki baat lag rahi hai, par abhi main drive kar raha hoon.',
    'Interest hai, bas abhi baat karne ka time nahi hai.',
  ],
  followUpOffer:
    'Bilkul — aapka time nahi loongi. Main details bhej doon aur week mein aage dobara call kar loon?',
  followUpAsk: 'Ji, bhej dijiye aur {day} ko call kijiye.',
  followUpConfirm: 'Theek hai {name}. Main details bhej deti hoon aur {day} ko call karti hoon.',
  days: [
    ['Thursday', 'Thursday'],
    ['Monday', 'Monday'],
    ['Friday', 'Friday'],
  ],

  declines: [
    ['Thanks, par maine ye kahin aur karwa liya hai.', 'has already arranged this elsewhere'],
    ['Mere liye nahi hai — maine na karne ka decide kar liya.', 'has decided against it'],
    ['Ji nahi, humne kisi aur ke saath kar liya.', 'has gone with another provider'],
  ],
  declineAck: 'Samajh gayi, batane ke liye thank you. Main aapka naam is list se hata doon?',
  declineYes: 'Haan ji, hata dijiye.',
  declineDone: 'Ho gaya — ab hamari taraf se call nahi aayegi. Aapka din accha ho, {name}.',
};

const BOOKS: Record<SpeechRegister, Phrasebook> = {
  ENGLISH: ENGLISH,
  HINDI: HINDI,
  HINGLISH: HINGLISH,
};

/** The wording for a language. English for anything unrecognised. */
export function phrasebook(register: SpeechRegister | null | undefined): Phrasebook {
  return (register && BOOKS[register]) || ENGLISH;
}

/**
 * The greeting a call opens with.
 *
 * Kept out of the templates because English alternates between "Hi" and
 * "Hello" per phrasing, and the other two do not — writing it into each string
 * would mean three near-duplicate greetings per language for no gain.
 */
export const GREETINGS: Record<SpeechRegister, readonly string[]> = {
  ENGLISH: ['Hi', 'Hello', 'Hi'],
  HINDI: ['नमस्ते', 'नमस्ते', 'नमस्कार'],
  HINGLISH: ['Hi', 'Hello', 'Namaste'],
};

/** Fills `{token}` placeholders. A token with no value is left as an empty string. */
export function fill(template: Template, values: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => values[key] ?? '').replace(/\s+/g, ' ').trim();
}
