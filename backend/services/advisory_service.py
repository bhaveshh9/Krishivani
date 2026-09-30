"""Rule-based advisory engine. Decision support only, never a guaranteed instruction."""
import json

DISCLAIMER = json.loads('{"en": "Weather-based advisory. Consider local agricultural guidance before taking farm decisions.", "hi": "मौसम आधारित सलाह। खेती के निर्णय से पहले स्थानीय कृषि मार्गदर्शन लें।", "mr": "हवामान आधारित कृषी सल्ला. शेतीचे निर्णय घेण्यापूर्वी स्थानिक कृषी मार्गदर्शन घ्या.", "gu": "હવામાન આધારિત સલાહ. ખેતીના નિર્ણય પહેલાં સ્થાનિક કૃષિ માર્ગદર્શન લો.", "ta": "வானிலை அடிப்படையிலான ஆலோசனை. விவசாய முடிவுகளுக்கு முன் உள்ளூர் வேளாண் வழிகாட்டுதலைப் பெறுங்கள்."}')
TEXT = json.loads('{"severe": {"en": "Very heavy rain is possible. Watch drainage and stay alert to local warnings.", "hi": "बहुत भारी बारिश की संभावना है। जल निकासी जांचें और स्थानीय चेतावनियों पर ध्यान दें।", "mr": "अतिजोरदार पावसाची शक्यता आहे. पाण्याचा निचरा तपासा आणि स्थानिक इशारे पाळा.", "gu": "અતિભારે વરસાદની શક્યતા છે. પાણીનો નિકાલ તપાસો અને સ્થાનિક ચેતવણીઓ પર ધ્યાન આપો.", "ta": "மிக கனமழைக்கு வாய்ப்பு உள்ளது. வடிகாலைச் சரிபார்த்து உள்ளூர் எச்சரிக்கைகளைக் கவனியுங்கள்."}, "heavy": {"en": "Higher rainfall is expected. Monitor field drainage and plan weather-sensitive activities accordingly.", "hi": "अधिक बारिश की संभावना है। खेत में जल निकासी जांचें और मौसम पर निर्भर कामों की योजना बनाएं।", "mr": "जास्त पाऊस अपेक्षित आहे. शेतातील पाण्याचा निचरा तपासा आणि हवामानावर अवलंबून कामांचे नियोजन करा.", "gu": "વધુ વરસાદની શક્યતા છે. ખેતરમાં પાણીના નિકાલની તપાસ કરો અને હવામાન આધારિત કામોનું આયોજન કરો.", "ta": "அதிக மழை எதிர்பார்க்கப்படுகிறது. வயலில் நீர் வடிகாலைச் சரிபார்த்து, வானிலை சார்ந்த பணிகளைத் திட்டமிடுங்கள்."}, "moderate": {"en": "Moderate rain is likely. Keep track of updates before spraying or harvesting.", "hi": "मध्यम बारिश की संभावना है। छिड़काव या कटाई से पहले पूर्वानुमान देखें।", "mr": "मध्यम पावसाची शक्यता आहे. फवारणी किंवा कापणीपूर्वी अंदाज पहा.", "gu": "મધ્યમ વરસાદની શક્યતા છે. છંટકાવ અથવા લણણી પહેલાં અનુમાન જુઓ.", "ta": "மிதமான மழை வாய்ப்பு உள்ளது. தெளிப்பு அல்லது அறுவடைக்கு முன் முன்னறிவிப்பைப் பாருங்கள்."}, "normal": {"en": "Conditions look normal. Continue routine farm work and check updates.", "hi": "मौसम सामान्य है। नियमित खेती के काम जारी रखें और पूर्वानुमान देखते रहें।", "mr": "हवामान सामान्य आहे. नेहमीची शेतीची कामे सुरू ठेवा आणि अंदाज तपासत रहा.", "gu": "હવામાન સામાન્ય છે. નિયમિત ખેતીકામ ચાલુ રાખો અને અનુમાન જોતા રહો.", "ta": "வானிலை சாதாரணமாக உள்ளது. வழக்கமான பணிகளைத் தொடருங்கள், முன்னறிவிப்பைப் பாருங்கள்."}, "low": {"en": "Lower rainfall is expected. Review irrigation needs based on your crop stage, soil condition and available water.", "hi": "कम बारिश की संभावना है। फसल की अवस्था, मिट्टी की नमी और उपलब्ध पानी देखकर सिंचाई पर विचार करें।", "mr": "कमी पाऊस अपेक्षित आहे. पिकाची अवस्था, जमिनीतील ओलावा आणि उपलब्ध पाणी पाहून सिंचनाचा विचार करा.", "gu": "ઓછા વરસાદની શક્યતા છે. પાકનો તબક્કો, જમીનનો ભેજ અને ઉપલબ્ધ પાણી જોઈને સિંચાઈનો વિચાર કરો.", "ta": "குறைந்த மழை எதிர்பார்க்கப்படுகிறது. பயிர் நிலை, மண் ஈரப்பதம், கிடைக்கும் நீரைப் பார்த்து நீர்ப்பாசனத்தை யோசியுங்கள்."}, "wind": {"en": "Strong winds may occur. Monitor vulnerable crops and farm structures.", "hi": "तेज हवाएं चल सकती हैं। नाजुक फसलों और खेत की संरचनाओं पर नजर रखें।", "mr": "जोरदार वारे येऊ शकतात. नाजूक पिके आणि शेतातील बांधकामांवर लक्ष ठेवा.", "gu": "તેજ પવન ફૂંકાઈ શકે છે. નાજુક પાક અને ખેતરના બાંધકામ પર ધ્યાન રાખો.", "ta": "பலத்த காற்று வீசக்கூடும். பாதிக்கக்கூடிய பயிர்கள் மற்றும் அமைப்புகளைக் கவனியுங்கள்."}}')
TITLES = {"severe": "Very Heavy Rainfall Alert", "heavy": "Heavy Rainfall Advisory", "moderate": "Rain Monitoring Advisory",
          "normal": "Normal Conditions", "low": "Low Rainfall Advisory", "wind": "Strong Wind Advisory"}
WIND_KMH = 25
LOW_RAIN_MM = 10


def generate_advisory(status: str, rainfall_mm: float, wind_kmh: float, language: str = "en", crop: str | None = None) -> dict:
    lang = language if language in DISCLAIMER else "en"
    keys = ["low" if status == "normal" and rainfall_mm < LOW_RAIN_MM else status]
    if wind_kmh >= WIND_KMH:
        keys.append("wind")
    return {
        "risk_level": status,
        "items": [{"key": k, "title": TITLES[k], "text": TEXT[k][lang]} for k in keys],
        "disclaimer": DISCLAIMER[lang],
        "language": lang,
        # Crop-specific rules need crop-stage and soil data that is not connected yet.
        "crop_note": None if not crop else "Generic weather advisory shown; crop-specific advisory is not available yet.",
    }
