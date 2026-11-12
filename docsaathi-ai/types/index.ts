// ─── Language ─────────────────────────────────────────────────────────────────

export interface Language {
  code: string;
  name: string;
  nativeName: string;
  speechLang?: string; // BCP-47 for SpeechRecognition / TTS
}

export const LANGUAGES: Language[] = [
  { code: "en", name: "English", nativeName: "English", speechLang: "en-IN" },
  { code: "hi", name: "Hindi", nativeName: "हिंदी", speechLang: "hi-IN" },
  { code: "hinglish", name: "Hinglish", nativeName: "Hinglish", speechLang: "hi-IN" },
  { code: "bn", name: "Bengali", nativeName: "বাংলা", speechLang: "bn-IN" },
  { code: "mr", name: "Marathi", nativeName: "मराठी", speechLang: "mr-IN" },
  { code: "ta", name: "Tamil", nativeName: "தமிழ்", speechLang: "ta-IN" },
  { code: "te", name: "Telugu", nativeName: "తెలుగు", speechLang: "te-IN" },
  { code: "gu", name: "Gujarati", nativeName: "ગુજરાતી", speechLang: "gu-IN" },
  { code: "kn", name: "Kannada", nativeName: "ಕನ್ನಡ", speechLang: "kn-IN" },
  { code: "ml", name: "Malayalam", nativeName: "മലയാളം", speechLang: "ml-IN" },
  { code: "pa", name: "Punjabi", nativeName: "ਪੰਜਾਬੀ", speechLang: "pa-IN" },
  { code: "bho", name: "Bhojpuri", nativeName: "भोजपुरी", speechLang: "hi-IN" },
  { code: "mai", name: "Maithili", nativeName: "मैथिली", speechLang: "hi-IN" },
];

// ─── Document Categories ───────────────────────────────────────────────────────

export type DocumentCategory =
  | "government"
  | "education"
  | "financial"
  | "legal"
  | "healthcare"
  | "employment"
  | "personal"
  | "other";

export const DOCUMENT_CATEGORIES: {
  value: DocumentCategory;
  label: string;
  icon: string;
  description: string;
}[] = [
  { value: "government", label: "Government Documents", icon: "🏛️", description: "Aadhaar, Passport, Voter ID, PAN, Ration Card" },
  { value: "education", label: "Education Documents", icon: "🎓", description: "Certificates, Marksheets, Admission letters" },
  { value: "financial", label: "Financial Documents", icon: "💰", description: "Bank statements, Loan papers, Tax filings" },
  { value: "legal", label: "Legal Documents", icon: "⚖️", description: "Contracts, Agreements, Court orders" },
  { value: "healthcare", label: "Healthcare Documents", icon: "🏥", description: "Prescriptions, Medical reports, Insurance" },
  { value: "employment", label: "Employment Documents", icon: "💼", description: "Offer letters, Payslips, Experience letters" },
  { value: "personal", label: "Personal Documents", icon: "👤", description: "Birth certificate, Marriage certificate" },
  { value: "other", label: "Other Documents", icon: "📄", description: "Any other official documents" },
];

// ─── Document Analysis ─────────────────────────────────────────────────────────

export interface DocumentSection {
  title: string;
  content: string;
  priority?: "high" | "medium" | "low";
}

export interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
  priority?: "urgent" | "normal";
}

export interface DocumentAnalysis {
  title: string;
  category: DocumentCategory;
  summary: string;
  explanation: string;
  importantDates: DocumentSection[];
  feesAndPayments: DocumentSection[];
  eligibility: DocumentSection[];
  requiredDocuments: DocumentSection[];
  warnings: DocumentSection[];
  checklist: ChecklistItem[];
  language: string;
}

// ─── Chat ─────────────────────────────────────────────────────────────────────

export type MessageRole = "user" | "assistant";

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: Date;
  isLoading?: boolean;
}

// ─── Voice States ─────────────────────────────────────────────────────────────

export type MicState = "idle" | "listening" | "processing" | "speaking" | "error";
export type SpeechState = "idle" | "loading" | "playing" | "paused" | "error";

// ─── Upload ───────────────────────────────────────────────────────────────────

export interface UploadedDocument {
  id: string;
  name: string;
  type: string;
  size: number;
  dataUrl: string;
  uploadedAt: Date;
  analysis?: DocumentAnalysis;
  category?: DocumentCategory;
}

// ─── Recent Docs ──────────────────────────────────────────────────────────────

export interface RecentDocument {
  id: string;
  name: string;
  category: DocumentCategory;
  uploadedAt: Date;
  summary: string;
}

// ─── API Payloads ─────────────────────────────────────────────────────────────

export interface AnalyzeDocumentRequest {
  fileData: string; // base64
  mimeType: string;
  language: string;
  languageCode: string;
}

export interface AnalyzeDocumentResponse {
  success: boolean;
  analysis?: DocumentAnalysis;
  error?: string;
}

export interface AskQuestionRequest {
  question: string;
  documentContext: string;
  language: string;
  languageCode: string;
  conversationHistory: { role: MessageRole; content: string }[];
}

export interface AskQuestionResponse {
  success: boolean;
  answer?: string;
  error?: string;
}
