// --- Core Data Structures ---
export type GrammaticalGenus = 'masculine' | 'feminine' | 'neuter' | string;

export interface IndexEntry {
    id: string;
    filename: string;
    part_of_speech: string;
    contentVersion: number;
    tags: string[];
    source: {
        headword: string;
        pronunciation?: string;
        genus?: GrammaticalGenus;
    };
    target: {
        headword: string;
        pronunciation?: string;
        genus?: GrammaticalGenus;
        headword_definite?: string; // <-- FIX IS HERE: Property added as optional
    };
}

export interface WordEntry extends IndexEntry {
    metadata: {
        state: 'NONE' | 'KEEP' | 'IGNORED';
        srsUniqueId?: string;
        dictionaryPath?: string;
    };
    normalizedSearch?: string;
}

// --- Detail View & Dictionary Content Types ---
export interface WordSideContent {
    lang: string;
    headword: string;
    headword_definite?: string;
    genus?: GrammaticalGenus;
    definition?: string;
    pronunciation?: string;
    etymology?: { explanation: TextPair; source: string; };
    additional?: string;
}

export interface Sense {
    gloss: string;
    explanation: TextPair;
    examples: Example[];
}

export interface TextPair {
    sourceText: string;
    targetText: string;
    id?: string;
}

export interface Example extends TextPair {
    label?: string;
}

export interface LearningTip {
    lang: string;
    text: string;
}

export interface RelatedAntonym {
    whyRelated?: string;
    sourceText: string;
    targetText: string;
}

export interface AudioManifestItem {
    type: 'headword' | 'example' | 'related' | 'antonym' | 'etymology';
    lang: string;
    url: string;
    path?: string;
}

export interface WordDetail {
    id: string;
    metadata: { author?: string; source?: string; contentVersion?: number; schemaVersion?: string; };
    sourceLanguage: string;
    targetLanguage: string;
    tags?: string[];
    part_of_speech?: string;
    source: WordSideContent;
    target: WordSideContent;
    senses?: Sense[];
    relatedWords?: RelatedAntonym[];
    antonyms?: RelatedAntonym[];
    examples?: Example[];
    learningTips?: LearningTip[];
    media?: { images?: string[]; audio?: AudioManifestItem[]; };
}

// --- Global Index & Dictionary Metadata ---
export interface DictionaryMeta {
    dictId: string;
    author: string;
    message: string;
    type: string;
    path: string;
    version: string;
    buildVersion?: string;
    lastUpdate: number;
    schemaVersion: string;
    feedback?: string;
    audioFiles?: number;
    origin?: { text: string; source?: string; };
}

export interface GlobalIndex {
    serverInfo?: string;
    generatedAt: number;
    dictionaries: DictionaryMeta[];
}