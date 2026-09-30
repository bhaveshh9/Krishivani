import { useCallback, useEffect, useState } from "react";

export const LANGS = { en: "English", hi: "हिन्दी", mr: "मराठी", gu: "ગુજરાતી", ta: "தமிழ்" } as const;
export type Lang = keyof typeof LANGS;
export const SPEECH_LANG: Record<Lang, string> = { en: "en-IN", hi: "hi-IN", mr: "mr-IN", gu: "gu-IN", ta: "ta-IN" };

type Dict = {
  title: string; subtitle: string; district: string; block: string; panchayat: string; useLocation: string; today: string;
  rain: string; temp: string; humidity: string; prob: string; risk: string; fiveDay: string; know: string; crop: string;
  alerts: string; noAlerts: string; listen: string; nearby: string; days: string[]; status: Record<string, string>; other: string;
};
const D: Record<Lang, Dict> = {
  en: { title: "My Weather & Farm Advisory", subtitle: "Local weather information for your Panchayat", district: "District", block: "Taluka / Block", panchayat: "Panchayat",
    useLocation: "Use my location", today: "Today's Weather", rain: "Rainfall", temp: "Temperature", humidity: "Humidity", prob: "Rain Probability", risk: "Weather Risk",
    fiveDay: "5-Day Forecast", know: "What should I know today?", crop: "Select your crop (optional)", alerts: "Alerts", noAlerts: "No weather alerts for the next 5 days.",
    listen: "Listen", nearby: "Nearby Panchayats", other: "Other", days: ["Today", "Tomorrow", "Day 3", "Day 4", "Day 5"],
    status: { normal: "Normal Rain", moderate: "Moderate Rain", heavy: "Heavy Rain Possible", severe: "Very Heavy Rain Alert" } },
  hi: { title: "मेरा मौसम और खेती सलाह", subtitle: "आपकी ग्राम पंचायत के लिए स्थानीय मौसम जानकारी", district: "जिला", block: "तालुका / ब्लॉक", panchayat: "पंचायत",
    useLocation: "मेरी लोकेशन इस्तेमाल करें", today: "आज का मौसम", rain: "बारिश", temp: "तापमान", humidity: "नमी", prob: "बारिश की संभावना", risk: "मौसम जोखिम",
    fiveDay: "5 दिन का पूर्वानुमान", know: "आज मुझे क्या जानना चाहिए?", crop: "अपनी फसल चुनें (वैकल्पिक)", alerts: "चेतावनियाँ", noAlerts: "अगले 5 दिनों में कोई चेतावनी नहीं।",
    listen: "सुनें", nearby: "आस-पास की पंचायतें", other: "अन्य", days: ["आज", "कल", "तीसरा दिन", "चौथा दिन", "पाँचवाँ दिन"],
    status: { normal: "सामान्य बारिश", moderate: "मध्यम बारिश", heavy: "भारी बारिश की संभावना", severe: "बहुत भारी बारिश की चेतावनी" } },
  mr: { title: "माझे हवामान आणि शेती सल्ला", subtitle: "तुमच्या ग्रामपंचायतीसाठी स्थानिक हवामान माहिती", district: "जिल्हा", block: "तालुका / ब्लॉक", panchayat: "ग्रामपंचायत",
    useLocation: "माझे लोकेशन वापरा", today: "आजचे हवामान", rain: "पाऊस", temp: "तापमान", humidity: "आर्द्रता", prob: "पावसाची शक्यता", risk: "हवामान धोका",
    fiveDay: "५ दिवसांचा अंदाज", know: "आज मला काय माहित असावे?", crop: "तुमचे पीक निवडा (ऐच्छिक)", alerts: "इशारे", noAlerts: "पुढील ५ दिवसांत कोणताही इशारा नाही.",
    listen: "ऐका", nearby: "जवळच्या ग्रामपंचायती", other: "इतर", days: ["आज", "उद्या", "तिसरा दिवस", "चौथा दिवस", "पाचवा दिवस"],
    status: { normal: "सामान्य पाऊस", moderate: "मध्यम पाऊस", heavy: "जोरदार पावसाची शक्यता", severe: "अतिजोरदार पावसाचा इशारा" } },
  gu: { title: "મારું હવામાન અને ખેતી સલાહ", subtitle: "તમારી ગ્રામ પંચાયત માટે સ્થાનિક હવામાન માહિતી", district: "જિલ્લો", block: "તાલુકો / બ્લોક", panchayat: "પંચાયત",
    useLocation: "મારું સ્થાન વાપરો", today: "આજનું હવામાન", rain: "વરસાદ", temp: "તાપમાન", humidity: "ભેજ", prob: "વરસાદની શક્યતા", risk: "હવામાન જોખમ",
    fiveDay: "5 દિવસનું અનુમાન", know: "આજે મારે શું જાણવું જોઈએ?", crop: "તમારો પાક પસંદ કરો (વૈકલ્પિક)", alerts: "ચેતવણીઓ", noAlerts: "આગામી 5 દિવસમાં કોઈ ચેતવણી નથી.",
    listen: "સાંભળો", nearby: "નજીકની પંચાયતો", other: "અન્ય", days: ["આજે", "કાલે", "ત્રીજો દિવસ", "ચોથો દિવસ", "પાંચમો દિવસ"],
    status: { normal: "સામાન્ય વરસાદ", moderate: "મધ્યમ વરસાદ", heavy: "ભારે વરસાદની શક્યતા", severe: "અતિભારે વરસાદની ચેતવણી" } },
  ta: { title: "என் வானிலை & விவசாய ஆலோசனை", subtitle: "உங்கள் ஊராட்சிக்கான உள்ளூர் வானிலை தகவல்", district: "மாவட்டம்", block: "தாலுகா / வட்டாரம்", panchayat: "ஊராட்சி",
    useLocation: "என் இருப்பிடத்தைப் பயன்படுத்து", today: "இன்றைய வானிலை", rain: "மழை", temp: "வெப்பநிலை", humidity: "ஈரப்பதம்", prob: "மழை வாய்ப்பு", risk: "வானிலை ஆபத்து",
    fiveDay: "5 நாள் முன்னறிவிப்பு", know: "இன்று நான் என்ன தெரிந்து கொள்ள வேண்டும்?", crop: "உங்கள் பயிரைத் தேர்ந்தெடுக்கவும் (விருப்பம்)", alerts: "எச்சரிக்கைகள்", noAlerts: "அடுத்த 5 நாட்களுக்கு எச்சரிக்கை இல்லை.",
    listen: "கேளுங்கள்", nearby: "அருகிலுள்ள ஊராட்சிகள்", other: "மற்றவை", days: ["இன்று", "நாளை", "3ஆம் நாள்", "4ஆம் நாள்", "5ஆம் நாள்"],
    status: { normal: "சாதாரண மழை", moderate: "மிதமான மழை", heavy: "கனமழைக்கு வாய்ப்பு", severe: "மிக கனமழை எச்சரிக்கை" } },
};

export function useLang() {
  const [lang, setLangState] = useState<Lang>("en");
  useEffect(() => {
    const saved = localStorage.getItem("agroscale_lang") as Lang | null;
    if (saved && saved in LANGS) setLangState(saved);
  }, []);
  const setLang = useCallback((l: Lang) => { localStorage.setItem("agroscale_lang", l); setLangState(l); }, []);
  return { lang, setLang, t: D[lang] };
}
