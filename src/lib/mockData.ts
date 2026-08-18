/**
 * Mock API response data for frontend development.
 *
 * These mirror the exact shape the backend will return:
 *   POST /simplify   → { resultText: string }
 *   POST /translate   → { resultText: string }
 *
 * ────────────────────────────────────────────────────
 * HOW TO REMOVE LATER:
 *   1. Delete this file.
 *   2. Remove the VITE_USE_MOCKS env variable.
 *   3. The real axios calls in api.ts take over automatically.
 * ────────────────────────────────────────────────────
 */

type Topic = "diabetes" | "infection" | "hypertension" | "default";

function detectTopic(text: string): Topic {
  const lower = text.toLowerCase();
  if (
    lower.includes("fever") ||
    lower.includes("sore throat") ||
    lower.includes("cough") ||
    lower.includes("cold") ||
    lower.includes("infection")
  ) {
    return "infection";
  }
  if (
    lower.includes("blood pressure") ||
    lower.includes("hypertension")
  ) {
    return "hypertension";
  }
  if (
    lower.includes("diabetes") ||
    lower.includes("blood sugar") ||
    lower.includes("insulin") ||
    lower.includes("hyperglycemia")
  ) {
    return "diabetes";
  }
  return "default";
}

const ENGLISH_MOCKS: Record<Topic, string> = {
  diabetes:
    "Your blood test shows that your blood sugar levels are higher than normal. " +
    "This is called hyperglycemia. It can happen when your body does not make " +
    "enough insulin or cannot use it well. High blood sugar over time can hurt " +
    "your eyes, kidneys, nerves, and heart. Your doctor may ask you to change " +
    "what you eat, exercise more, or take medicine to help bring your blood " +
    "sugar down. Please check your blood sugar at home as your doctor told you " +
    "to, and come back for a follow-up visit in 4 weeks.",
  infection:
    "You have an upper respiratory infection, which is like a common cold. This " +
    "is usually caused by a virus. It can give you a fever, cough, and a sore " +
    "throat. Antibiotics do not cure viruses, so you will need to get plenty of " +
    "rest and drink lots of fluids. You can take over-the-counter medicine like " +
    "ibuprofen or acetaminophen to help with fever and pain. If you have trouble " +
    "breathing, your fever lasts more than 3 days, or you start feeling much " +
    "worse, please call your doctor or go to the clinic.",
  hypertension:
    "Your blood pressure reading today is higher than normal. This is called " +
    "hypertension. When your blood pressure is high, your heart has to work " +
    "harder to pump blood through your body. Over time, this can lead to heart " +
    "disease, stroke, or kidney problems. To help lower your blood pressure, " +
    "your doctor recommends eating foods with less salt, being more active, and " +
    "managing stress. You may also need to take blood pressure medicine every " +
    "day. We will check your blood pressure again at your next visit in 2 weeks.",
  default:
    "Your test results are ready to be reviewed. The doctor has noted some areas " +
    "to keep an eye on, but there are no immediate concerns. Please continue " +
    "with your current health routine and follow up at your next scheduled " +
    "appointment. If you experience any new or worsening symptoms, contact the " +
    "clinic as soon as possible."
};

const TRANSLATION_MOCKS: Record<Topic, Record<string, string>> = {
  diabetes: {
    ur: "آپ کے خون کے ٹیسٹ سے پتہ چلتا ہے کہ آپ کے خون میں شوگر کی سطح معمول سے زیادہ ہے۔ براہ کرم 4 ہفتوں میں دوبارہ تشریف لائیں۔",
    as: "আপোনাৰ তেজৰ পৰীক্ষাই দেখুৱাইছে যে আপোনাৰ তেজত চেনিৰ মাত্ৰা স্বাভাৱিকতকৈ বেছি। অনুগ্ৰহ কৰি 4 সপ্তাহৰ পিছত ঘূৰি আহক।",
    or: "ଆପଣଙ୍କ ରକ୍ତ ପରୀକ୍ଷା ଦେଖାଉଛି ଯେ ଆପଣଙ୍କ ରକ୍ତରେ ଶର୍କରା ସ୍ତର ସ୍ୱାଭାବିକ ଠାରୁ ଅଧିକ । ଦୟାକରି 4 ସପ୍ତାହରେ ଫେରି ଆସନ୍ତୁ ।",
    pa: "ਤੁਹਾਡੀ ਖੂਨ ਦੀ ਜਾਂਚ ਦਰਸਾਉਂਦੀ ਹੈ ਕਿ ਤੁਹਾਡੇ ਖੂਨ ਵਿੱਚ ਸ਼ੂਗਰ ਦਾ ਪੱਧਰ ਆਮ ਨਾਲੋਂ ਵੱਧ ਹੈ। ਕਿਰਪਾ ਕਰਕੇ 4 ਹਫ਼ਤਿਆਂ ਵਿੱਚ ਵਾਪਸ ਆਓ।",
    gu: "તમારા રક્ત પરીક્ષણમાં દર્શાવવામાં આવ્યું છે કે તમારા રક્તમાં શર્કરાનું સ્તર સામાન્ય કરતાં વધુ છે. કૃપા કરીને 4 અઠવાડિયામાં પાછા આવો.",
    mr: "तुमच्या रक्त तपासणीवरून असे दिसून येते की तुमची रक्तातील साखरेची पातळी सामान्यपेक्षा जास्त आहे. कृपया ४ आठवड्यांत पुन्हा या.",
    bn: "আপনার রক্ত পরীক্ষায় দেখা গেছে যে আপনার রক্তে শর্করার মাত্রা স্বাভাবিকের চেয়ে বেশি। অনুগ্রহ করে ৪ সপ্তাহের মধ্যে আবার আসুন।",
    ml: "നിങ്ങളുടെ രക്തപരിശോധനയിൽ രക്തത്തിലെ പഞ്ചസാരയുടെ അളവ് സാധാരണയേക്കാൾ കൂടുതലാണെന്ന് കാണിക്കുന്നു. 4 ആഴ്ചയ്ക്കുള്ളിൽ ഫോളോ-അപ്പ് സന്ദർശനത്തിനായി ദയവായി മടങ്ങുക.",
    kn: "ನಿಮ್ಮ ರಕ್ತ ಪರೀಕ್ಷೆಯು ನಿಮ್ಮ ರಕ್ತದಲ್ಲಿನ ಸಕ್ಕರೆ ಮಟ್ಟವು ಸಾಮಾನ್ಯಕ್ಕಿಂತ ಹೆಚ್ಚಾಗಿದೆ ಎಂದು ತೋರಿಸುತ್ತದೆ. ಇದನ್ನು ಹೈಪರ್ಗ್ಲೈಸೀಮಿಯಾ ಎಂದು ಕರೆಯಲಾಗುತ್ತದೆ. 4 ವಾರಗಳಲ್ಲಿ ಫಾಲೋ-ಅಪ್ ಭೇಟಿಗಾಗಿ ದಯವಿಟ್ಟು ಹಿಂತಿರುಗಿ.",
    ta: "உங்கள் இரத்த பரிசோதனை உங்கள் இரத்த சர்க்கரை அளவு இயல்பை விட அதிகமாக இருப்பதைக் காட்டுகிறது. இது ஹைப்பர் கிளைசீமியா என்று அழைக்கப்படுகிறது. காலப்போக்கில் அதிக இரத்த சர்க்கரை உங்கள் கண்கள், சிறுநீரகங்கள் மற்றும் இதயத்திற்கு தீங்கு விளைவிக்கும். 4 வாரங்களில் மீண்டும் வரவும்.",
    te: "మీ రక్త పరీక్ష మీ రక్తంలో చక్కెర స్థాయిలు సాధారణం కంటే ఎక్కువగా ఉన్నాయని చూపిస్తుంది. దీన్ని హైపర్‌గ్లైసీమియా అంటారు. మీ శరీరం తగినంత ఇన్సులిన్ ఉత్పత్తి చేయనప్పుడు ఇది జరుగుతుంది. కాలక్రమేణా అధిక రక్త చక్కెర మీ కళ్ళు, మూత్రపిండాలు మరియు గుండెకు హాని కలిగించవచ్చు. దయచేసి 4 వారాలలో ఫాలో-అప్ సందర్శన కోసం తిరిగి రండి.",
    en: "Your blood test shows that your blood sugar levels are higher than normal. This is called hyperglycemia. It can happen when your body does not make enough insulin or cannot use it well. High blood sugar over time can harm your eyes, kidneys, nerves, and heart. Your doctor may ask you to change what you eat, exercise more, or take medicine to help lower your blood sugar. Please check your blood sugar at home as your doctor directed and return for a follow-up visit in 4 weeks.",
    es:
      "Su análisis de sangre muestra que sus niveles de azúcar en la sangre son " +
      "más altos de lo normal. Esto se llama hiperglucemia. Puede ocurrir cuando " +
      "su cuerpo no produce suficiente insulina o no puede usarla bien. El azúcar " +
      "alta en la sangre con el tiempo puede dañar sus ojos, riñones, nervios y " +
      "corazón. Su médico puede pedirle que cambie lo que come, haga más ejercicio " +
      "o tome medicamentos para ayudar a bajar el azúcar en la sangre. Por favor, " +
      "controle su azúcar en sangre en casa como le indicó su médico y regrese para " +
      "una visita de seguimiento en 4 semanas.",
    fr:
      "Votre analyse de sang montre que votre taux de sucre dans le sang est plus " +
      "élevé que la normale. C'est ce qu'on appelle l'hyperglycémie. Cela peut se " +
      "produire lorsque votre corps ne fabrique pas assez d'insuline ou ne peut pas " +
      "bien l'utiliser. Un taux de sucre élevé dans le sang au fil du temps peut " +
      "endommager vos yeux, vos reins, vos nerfs et votre cœur. Votre médecin peut " +
      "vous demander de changer votre alimentation, de faire plus d'exercice ou de " +
      "prendre des médicaments. Veuillez vérifier votre glycémie à domicile comme " +
      "votre médecin vous l'a indiqué et revenez pour un suivi dans 4 semaines.",
    hi:
      "आपकी रक्त जांच से पता चलता है कि आपके रक्त शर्करा का स्तर सामान्य से अधिक है। " +
      "इसे हाइपरग्लाइसीमिया कहा जाता है। यह तब हो सकता है जब आपका शरीर पर्याप्त इंसुलिन " +
      "नहीं बनाता या उसका ठीक से उपयोग नहीं कर पाता। लंबे समय तक रक्त शर्करा अधिक रहने से " +
      "आपकी आँखों, गुर्दों, नसों और हृदय को नुकसान हो सकता है। आपके डॉक्टर आपको खान-पान " +
      "बदलने, अधिक व्यायाम करने या दवा लेने के लिए कह सकते हैं। कृपया घर पर अपनी रक्त " +
      "शर्करा की जांच करें जैसा डॉक्टर ने बताया है और 4 सप्ताह में फॉलो-अप के लिए आएं।",
    zh:
      "您的血液检查显示您的血糖水平高于正常值。这称为高血糖症。当您的身体没有产生足够的胰岛素" +
      "或无法正常使用胰岛素时，就会发生这种情况。长期高血糖会损害您的眼睛、肾脏、神经和心脏。" +
      "您的医生可能会要求您改变饮食、增加运动或服用药物来帮助降低血糖。请按照医生的指示在家" +
      "检测血糖，并在4周后回来复查。",
    ar:
      "يُظهر فحص الدم أن مستويات السكر في دمك أعلى من المعدل الطبيعي. وهذا ما يُسمى بفرط " +
      "سكر الدم. يمكن أن يحدث ذلك عندما لا ينتج جسمك ما يكفي من الأنسولين أو لا يستطيع " +
      "استخدامه بشكل جيد. يمكن أن يؤدي ارتفاع السكر في الدم بمرور الوقت إلى الإضرار بعينيك " +
      "وكليتيك وأعصابك وقلبك. قد يطلب منك طبيبك تغيير نظامك الغذائي أو ممارسة المزيد من " +
      "التمارين أو تناول الأدوية. يرجى فحص السكر في الدم في المنزل كما أوصى طبيبك والعودة " +
      "لزيارة متابعة بعد 4 أسابيع.",
    pt:
      "O seu exame de sangue mostra que os seus níveis de açúcar no sangue estão " +
      "mais altos do que o normal. Isso é chamado de hiperglicemia. Pode acontecer " +
      "quando o seu corpo não produz insulina suficiente ou não consegue usá-la bem. " +
      "O açúcar elevado no sangue ao longo do tempo pode prejudicar os seus olhos, " +
      "rins, nervos e coração. O seu médico pode pedir-lhe que mude a sua alimentação, " +
      "faça mais exercício ou tome medicamentos para ajudar a baixar o açúcar no sangue. " +
      "Por favor, verifique o seu açúcar no sangue em casa conforme o seu médico indicou " +
      "e volte para uma consulta de acompanhamento em 4 semanas.",
    de:
      "Ihre Blutuntersuchung zeigt, dass Ihr Blutzuckerspiegel höher als normal ist. " +
      "Dies wird als Hyperglykämie bezeichnet. Es kann auftreten, wenn Ihr Körper nicht " +
      "genug Insulin produziert oder es nicht richtig verwenden kann. Ein langfristig hoher " +
      "Blutzucker kann Ihre Augen, Nieren, Nerven und Ihr Herz schädigen. Ihr Arzt kann Sie " +
      "bitten, Ihre Ernährung umzustellen, mehr Sport zu treiben oder Medikamente einzunehmen, " +
      "um Ihren Blutzucker zu senken. Bitte überprüfen Sie Ihren Blutzucker zu Hause wie von " +
      "Ihrem Arzt empfohlen und kommen Sie in 4 Wochen zur Nachuntersuchung.",
    vi:
      "Xét nghiệm máu của bạn cho thấy lượng đường trong máu cao hơn bình thường. " +
      "Điều này được gọi là tăng đường huyết. Nó có thể xảy ra khi cơ thể bạn không sản " +
      "xuất đủ insulin hoặc không thể sử dụng insulin tốt. Lượng đường trong máu cao theo " +
      "thời gian có thể gây hại cho mắt, thận, dây thần kinh và tim của bạn. Bác sĩ có thể " +
      "yêu cầu bạn thay đổi chế độ ăn uống, tập thể dục nhiều hơn hoặc dùng thuốc để giúp " +
      "giảm đường huyết. Vui lòng kiểm tra đường huyết tại nhà theo hướng dẫn của bác sĩ " +
      "và quay lại tái khám sau 4 tuần.",
  },
  infection: {
    ur: "آپ کو سانس کی نالی کا انفیکشن ہے۔ کافی آرام کریں اور سیال پئیں۔",
    as: "আপোনাৰ উশাহ-নিশাহৰ সংক্ৰমণ হৈছে। প্ৰচুৰ বিশ্ৰাম লওক আৰু তৰল পদাৰ্থ খাওক।",
    or: "ଆପଣଙ୍କର ଶ୍ୱାସକ୍ରିୟା ସଂକ୍ରମଣ ଅଛି । ପ୍ରଚୁର ବିଶ୍ରାମ ନିଅନ୍ତୁ ଏବଂ ତରଳ ପଦାର୍ଥ ପିଅନ୍ତୁ ।",
    pa: "ਤੁਹਾਨੂੰ ਸਾਹ ਦੀ ਨਾਲੀ ਦੀ ਲਾਗ ਹੈ। ਬਹੁਤ ਸਾਰਾ ਆਰਾਮ ਕਰੋ ਅਤੇ ਤਰਲ ਪਦਾਰਥ ਪੀਓ।",
    gu: "તમને શ્વસન માર્ગનો ચેપ છે. પુષ્કળ આરામ કરો અને પ્રવાહી પીવો.",
    mr: "तुम्हाला श्वसनमार्गाचा संसर्ग आहे. भरपूर विश्रांती घ्या आणि द्रव प्या.",
    bn: "আপনার শ্বাসযন্ত্রের সংক্রমণ রয়েছে। প্রচুর বিশ্রাম নিন এবং তরল পান করুন।",
    ml: "നിങ്ങൾക്ക് ശ്വാസകോശ സംബന്ധമായ അണുബാധയുണ്ട്. ധാരാളം വിശ്രമിക്കുകയും ദ്രാവകങ്ങൾ കുടിക്കുകയും ചെയ്യുക.",
    kn: "ನೀವು ಮೇಲ್ಭಾಗದ ಉಸಿರಾಟದ ಸೋಂಕನ್ನು ಹೊಂದಿದ್ದೀರಿ. ದಯವಿಟ್ಟು ಸಾಕಷ್ಟು ವಿಶ್ರಾಂತಿ ಪಡೆಯಿರಿ ಮತ್ತು ದ್ರವಗಳನ್ನು ಕುಡಿಯಿರಿ.",
    ta: "உங்களுக்கு மேல் சுவாசக்குழாய் தொற்று உள்ளது, இது சாதாரண சளி போன்றது. தயவுசெய்து நிறைய ஓய்வு எடுத்து திரவங்களை குடிக்கவும்.",
    te: "మీకు ఎగువ శ్వాసకోశ ఇన్ఫెక్షన్ ఉంది, ఇది సాధారణ జలుబు లాంటిది. యాంటీబయాటిక్స్ వైరస్‌లను నయం చేయవు, కాబట్టి మీరు తగినంత విశ్రాంతి తీసుకోవాలి మరియు ద్రవాలు త్రాగాలి.",
    en: "You have an upper respiratory infection, which is like a common cold. This is usually caused by a virus. It can give you a fever, cough, and sore throat. Antibiotics do not cure viruses, so you will need to get plenty of rest and drink lots of fluids. You can take over-the-counter medicine like ibuprofen or acetaminophen to help with fever and pain. If you have trouble breathing, your fever lasts more than 3 days, or you start feeling much worse, please call your doctor or go to the clinic.",
    es: "Tiene una infección de las vías respiratorias superiores, que es como un resfriado común. Por lo general, es causada por un virus. Puede darle fiebre, tos y dolor de garganta. Los antibióticos no curan los virus, por lo que necesitará descansar mucho y beber muchos líquidos. Puede tomar medicamentos de venta libre como ibuprofeno o acetaminofeno para ayudar con la fiebre y el dolor. Si tiene problemas para respirar, su fiebre dura más de 3 días o comienza a sentirse mucho peor, llame a su médico o vaya a la clínica.",
    fr: "Vous avez une infection des voies respiratoires supérieures, ce qui ressemble à un rhume. Ceci est généralement causé par un virus. Cela peut vous donner de la fièvre, une toux et un mal de gorge. Les antibiotiques ne guérissent pas les virus, vous devrez donc vous reposer et boire beaucoup de liquides. Vous pouvez prendre des médicaments en vente libre comme l'ibuprofène ou l'acétaminophène pour aider avec la fièvre et la douleur. Si vous avez des difficultés à respirer, que votre fièvre dure plus de 3 jours ou que vous vous sentez beaucoup plus mal, veuillez appeler votre médecin ou vous rendre à la clinique.",
    hi: "आपको ऊपरी श्वसन पथ का संक्रमण है, जो सामान्य सर्दी की तरह है। यह आमतौर पर एक वायरस के कारण होता है। इससे आपको बुखार, खांसी और गले में खराश हो सकती है। एंटीबायोटिक्स वायरस को ठीक नहीं करते हैं, इसलिए आपको भरपूर आराम करने और बहुत सारे तरल पदार्थ पीने की आवश्यकता होगी। आप बुखार और दर्द के लिए इबुप्रोफेन या एसिटामिनोफेन जैसी ओवर-द-काउंटर दवा ले सकते हैं। यदि आपको सांस लेने में परेशानी होती है, आपका बुखार 3 दिनों से अधिक समय तक रहता है, या आप बहुत खराब महसूस करने लगते हैं, तो कृपया अपने डॉक्टर को बुलाएं या क्लिनيك जाएं।",
    zh: "您有上呼吸道感染，这就像普通感冒。这通常是由病毒引起的。它会引起发烧、咳嗽和喉咙痛。抗生素不能治愈病毒，因此您需要多休息并喝大量液体。您可以服用布洛芬或对乙酰氨基酚等非处方药来帮助缓解发烧和疼痛。如果您呼吸困难、发烧超过 3 天或开始感觉好很多，请致电您的医生或去诊所。",
    ar: "لديك عدوى في الجهاز التنفسي العلوي، وهي تشبه نزلات البرد الشائعة. عادة ما يكون هذا بسبب فيروس. يمكن أن يسبب لك الحمى والسعال والتهاب الحلق. المضادات الحيوية لا تعالج الفيروسات، لذلك ستحتاج إلى الحصول على قسط وافر من الراحة وشرب الكثير من السوائل. يمكنك تناول الأدوية التي لا تستلزم وصفة طبية مثل الإيبوبروفين أو الأسيتامينوفين للمساعدة في الحمى والألم. إذا كنت تعاني من صعوبة في التنفس، أو استمرت الحمى لأكثر من 3 أيام، أو بدأت تشعر بسوء شديد، يرجى الاتصال بطبيبك أو الذهاب إلى العيادة.",
    pt: "Você tem uma infecção respiratória superior, que é como um resfriado comum. Isso geralmente é causado por um vírus. Pode causar febre, tosse e dor de garganta. Os antibióticos não curam vírus, então você precisará descansar bastante e beber muitos líquidos. Você pode tomar remédios de venda livre, como ibuprofeno ou acetaminofeno, para ajudar com a febre e a dor. Se você tiver dificuldade para respirar, sua febre durar mais de 3 dias ou começar a se sentir muito pior, ligue para o seu médico ou vá à clínica.",
    de: "Sie haben eine Infektion der oberen Atemwege, die wie eine Erkältung ist. Dies wird normalerweise durch ein Virus verursacht. Es kann Ihnen Fieber, Husten und Halsschmerzen verursachen. Antibiotika heilen keine Viren, daher müssen Sie sich viel ausruhen und viel Flüssigkeit trinken. Sie können rezeptfreie Medikamente wie Ibuprofen oder Paracetamol einnehmen, um bei Fieber und Schmerzen zu helfen. Wenn Sie Atembeschwerden haben, Ihr Fieber länger als 3 Tage anhält oder Sie sich viel schlechter fühlen, rufen Sie bitte Ihren Arzt an oder gehen Sie in die Klinik.",
    vi: "Bạn bị nhiễm trùng đường hô hấp trên, giống như cảm lạnh thông thường. Điều này thường do vi-rút gây ra. Nó có thể khiến bạn bị sốt, ho và đau họng. Thuốc kháng sinh không chữa khỏi vi-rút, vì vậy bạn sẽ cần nghỉ ngơi nhiều và uống nhiều chất lỏng. Bạn có thể dùng các loại thuốc không kê đơn như ibuprofen hoặc acetaminophen để giúp hạ sốt và giảm đau. Nếu bạn khó thở, sốt kéo dài hơn 3 ngày hoặc bắt đầu cảm thấy tồi tệ hơn nhiều, vui lòng gọi cho bác sĩ hoặc đến phòng khám."
  },
  hypertension: {
    ur: "آپ کا بلڈ پریشر آج معمول سے زیادہ ہے۔ کم نمک والی غذا کھانے کا مشورہ دیا جاتا ہے۔ ہم 2 ہفتوں میں دوبارہ چیک کریں گے۔",
    as: "আজি আপোনাৰ ৰক্তচাপ স্বাভাৱিকতকৈ বেছি। কম নিমখ থকা খাদ্য খাবলৈ পৰামৰ্শ দিয়া হৈছে। আমি 2 সপ্তাহৰ পিছত পুনৰ পৰীক্ষা কৰিম।",
    or: "ଆଜି ଆପଣଙ୍କ ରକ୍ତଚାପ ସ୍ୱାଭାବିକ ଠାରୁ ଅଧିକ । କମ୍ ଲୁଣ ଥିବା ଖାଦ୍ୟ ଖାଇବାକୁ ପରାମର୍ଶ ଦିଆଯାଇଛି । ଆମେ 2 ସପ୍ତାହରେ ପୁଣି ପରୀକ୍ଷା କରିବୁ ।",
    pa: "ਤੁਹਾਡਾ ਬਲੱਡ ਪ੍ਰੈਸ਼ਰ ਅੱਜ ਆਮ ਨਾਲੋਂ ਵੱਧ ਹੈ। ਘੱਟ ਨਮਕ ਵਾਲਾ ਭੋਜਨ ਖਾਣ ਦੀ ਸਲਾਹ ਦਿੱਤੀ ਜਾਂਦੀ ਹੈ। ਅਸੀਂ 2 ਹਫ਼ਤਿਆਂ ਵਿੱਚ ਦੁਬਾਰਾ ਜਾਂਚ ਕਰਾਂਗੇ।",
    gu: "તમારું બ્લડ પ્રેશર આજે સામાન્ય કરતા વધારે છે. ઓછા મીઠાવાળો ખોરાક ખાવાની સલાહ આપવામાં આવે છે. અમે 2 અઠવાડિયામાં ફરીથી તપાસ કરીશું.",
    mr: "तुमचा रक्तदाब आज सामान्यपेक्षा जास्त आहे. कमी मीठ असलेले अन्न खाण्याचा सल्ला दिला जातो. आम्ही २ आठवड्यांत पुन्हा तपासणी करू.",
    bn: "আপনার রক্তচাপ আজ স্বাভাবিকের চেয়ে বেশি। কম লবণযুক্ত খাবার খাওয়ার পরামর্শ দেওয়া হচ্ছে। ২ সপ্তাহের মধ্যে আমরা আবার পরীক্ষা করব।",
    ml: "നിങ്ങളുടെ രക്തസമ്മർദ്ദം ഇന്ന് സാധാരണയേക്കാൾ കൂടുതലാണ്. കുറഞ്ഞ ഉപ്പുള്ള ഭക്ഷണം കഴിക്കാൻ ഡോക്ടർ നിർദ്ദേശിക്കുന്നു. 2 ആഴ്ചയ്ക്കുള്ളിൽ ഞങ്ങൾ വീണ്ടും പരിശോധിക്കും.",
    kn: "ಇಂದು ನಿಮ್ಮ ರಕ್ತದೊತ್ತಡ ಸಾಮಾನ್ಯಕ್ಕಿಂತ ಹೆಚ್ಚಾಗಿದೆ. ಕಡಿಮೆ ಉಪ್ಪಿನ ಆಹಾರವನ್ನು ಸೇವಿಸಲು ವೈದ್ಯರು ಶಿಫಾರಸು ಮಾಡುತ್ತಾರೆ. 2 ವಾರಗಳಲ್ಲಿ ನಾವು ಮತ್ತೆ ಪರಿಶೀಲಿಸುತ್ತೇವೆ.",
    ta: "உங்கள் இரத்த அழுத்தம் இன்று இயல்பை விட அதிகமாக உள்ளது. குறைந்த உப்பு உள்ள உணவை உண்ணுமாறு மருத்துவர் பரிந்துரைக்கிறார். 2 வாரங்களில் மீண்டும் சரிபார்ப்போம்.",
    te: "ఈ రోజు మీ రక్తపోటు సాధారణం కంటే ఎక్కువగా ఉంది. దీనిని హైపర్‌టెన్షన్ అంటారు. ఉప్పు తక్కువగా ఉన్న ఆహారాన్ని తినాలని డాక్టర్ సిఫార్సు చేస్తున్నారు. 2 వారాల్లో మీ తదుపరి సందర్శనలో మేము మీ రక్తపోటును మళ్లీ తనిఖీ చేస్తాము.",
    en: "Your blood pressure reading today is higher than normal. This is called hypertension. When your blood pressure is high, your heart has to work harder to pump blood through your body. Over time, this can lead to heart disease, stroke, or kidney problems. To help lower your blood pressure, your doctor recommends eating foods with less salt, being more active, and managing stress. You may also need to take blood pressure medicine every day. We will check your blood pressure again at your next visit in 2 weeks.",
    es: "Su lectura de presión arterial hoy es más alta de lo normal. Esto se llama hipertensión. Cuando su presión arterial es alta, su corazón tiene que trabajar más para bombear sangre a través de su cuerpo. Con el tiempo, esto puede provocar enfermedades cardíacas, accidentes cerebrovasculares o problemas renales. Para ayudar a reducir su presión arterial, su médico recomienda comer alimentos con menos sal, ser más activo y controlar el estrés. También es posible que deba tomar medicamentos para la presión arterial todos los días. Volveremos a revisar su presión arterial en su próxima visita en 2 semanas.",
    fr: "Votre tension artérielle d'aujourd'hui est plus élevée que la normale. C'est ce qu'on appelle l'hypertension. Lorsque votre tension artérielle est élevée, votre cœur doit travailler plus fort pour pomper le sang dans votre corps. Au fil du temps, cela peut entraîner des maladies cardiaques, des accidents vasculaires cérébraux ou des problèmes rénaux. Pour aider à abaisser votre tension artérielle, votre médecin vous recommande de manger des aliments moins salés, d'être plus actif et de gérer votre stress. Vous devrez peut-être également prendre des médicaments contre la tension artérielle tous les jours. Nous vérifierons à nouveau votre tension artérielle lors de votre prochaine visite dans 2 semaines.",
    hi: "आज आपकी रक्तचाप रीडिंग सामान्य से अधिक है। इसे उच्च रक्तचाप कहा जाता है। जब आपका रक्तचाप अधिक होता है, तो आपके हृदय को आपके शरीर में रक्त पंप करने के लिए अधिक मेहनत करनी पड़ती है। समय के साथ, यह हृदय रोग, स्ट्रोक या गुर्दे की समस्याओं का कारण बन सकता है। आपके रक्तचाप को कम करने में मदद के लिए, आपका डॉक्टर कम नमक वाला भोजन खाने, अधिक सक्रिय रहने और तनाव को प्रबंधित करने की सलाह देता है। आपको हर दिन रक्तचाप की दवा भी लेने की आवश्यकता हो सकती है। हम 2 सप्ताह में आपकी अगली यात्रा पर फिर से आपके रक्तचाप की जांच करेंगे।",
    zh: "您今天的血压读数高于正常值。这称为高血压。当您的血压高时，您的心脏必须更努力地将血液泵送到全身。随着时间的推移，这会导致心脏病、中风或肾脏问题。为了帮助降低血压，您的医生建议少吃盐、多运动并控制压力。您可能还需要每天服用降压药。我们将在您两周后的下一次就诊时再次检查您的血压。",
    ar: "قراءة ضغط الدم لديك اليوم أعلى من المعتاد. وهذا ما يسمى بارتفاع ضغط الدم. عندما يكون ضغط الدم مرتفعًا، يجب أن يعمل قلبك بجهد أكبر لضخ الدم عبر جسمك. بمرور الوقت، يمكن أن يؤدي ذلك إلى أمراض القلب أو السكتة الدماغية أو مشاكل الكلى. للمساعدة في خفض ضغط الدم، يوصي طبيبك بتناول أطعمة تحتوي على نسبة أقل من الملح، وأن تكون أكثر نشاطًا، وإدارة التوتر. قد تحتاج أيضًا إلى تناول دواء ضغط الدم كل يوم. سنتحقق من ضغط الدم مرة أخرى في زيارتك القادمة خلال أسبوعين.",
    pt: "A sua leitura da pressão arterial de hoje está mais alta do que o normal. Isso é chamado de hipertensão. Quando a pressão arterial está alta, o coração tem que trabalhar mais para bombear o sangue pelo corpo. Com o tempo, isso pode levar a doenças cardíacas, derrame ou problemas renais. Para ajudar a baixar a pressão arterial, o seu médico recomenda comer alimentos com menos sal, ser mais ativo e controlar o estresse. Você também pode precisar tomar remédios para pressão arterial todos os dias. Verificaremos a sua pressão arterial novamente na sua próxima consulta em 2 semanas.",
    de: "Ihre heutige Blutdruckmessung ist höher als normal. Dies wird als Bluthochdruck bezeichnet. Wenn Ihr Blutdruck hoch ist, muss Ihr Herz härter arbeiten, um Blut durch Ihren Körper zu pumpen. Im Laufe der Zeit kann dies zu Herzerkrankungen, Schlaganfällen oder Nierenproblemen führen. Um Ihren Blutdruck zu senken, empfiehlt Ihr Arzt, Lebensmittel mit weniger Salz zu essen, aktiver zu sein und Stress zu bewältigen. Möglicherweise müssen Sie auch jeden Tag Blutdruckmedikamente einnehmen. Wir werden Ihren Blutdruck bei Ihrem nächsten Besuch in 2 Wochen erneut überprüfen.",
    vi: "Chỉ số huyết áp của bạn hôm nay cao hơn bình thường. Điều này được gọi là tăng huyết áp. Khi huyết áp của bạn cao, tim của bạn phải làm việc chăm chỉ hơn để bơm máu qua cơ thể. Theo thời gian, điều này có thể dẫn đến bệnh tim, đột quỵ hoặc các vấn đề về thận. Để giúp hạ huyết áp, bác sĩ khuyên bạn nên ăn thực phẩm ít muối, năng động hơn và kiểm soát căng thẳng. Bạn cũng có thể cần phải dùng thuốc huyết áp mỗi ngày. Chúng tôi sẽ kiểm tra lại huyết áp của bạn vào lần khám tiếp theo trong 2 tuần nữa."
  },
  default: {
    ur: "[فرضی ترجمہ] آپ کے نتائج تیار ہیں۔ اگلی ملاقات میں اپنے ڈاکٹر سے مشورہ کریں۔",
    as: "[মক অনুবাদ] আপোনাৰ ফলাফল প্ৰস্তুত। পৰৱৰ্তী সাক্ষাৎকাৰত আপোনাৰ চিকিৎসকৰ সৈতে পৰামৰ্শ কৰক।",
    or: "[ମକ୍ ଅନୁବାଦ] ଆପଣଙ୍କ ଫଳାଫଳ ପ୍ରସ୍ତୁତ । ପରବର୍ତ୍ତୀ ସାକ୍ଷାତରେ ଆପଣଙ୍କ ଡାକ୍ତରଙ୍କ ସହିତ ପରାମର୍ଶ କରନ୍ତୁ ।",
    pa: "[ਮੌਕ ਅਨੁਵਾਦ] ਤੁਹਾਡੇ ਨਤੀਜੇ ਤਿਆਰ ਹਨ। ਅਗਲੀ ਮੁਲਾਕਾਤ ਵਿੱਚ ਆਪਣੇ ਡਾਕਟਰ ਨਾਲ ਸਲਾਹ ਕਰੋ।",
    gu: "[મોક અનુવાદ] તમારા પરિણામો તૈયાર છે. આગલી મુલાકાતમાં તમારા ડૉક્ટરની સલાહ લો.",
    mr: "[मॉक भाषांतर] तुमचे निकाल तयार आहेत. पुढच्या भेटीत तुमच्या डॉक्टरांचा सल्ला घ्या.",
    bn: "[মক অনুবাদ] আপনার ফলাফল প্রস্তুত। পরবর্তী অ্যাপয়েন্টমেন্টে আপনার ডাক্তারের সাথে পরামর্শ করুন।",
    ml: "[മോക്ക് വിവർത്തനം] നിങ്ങളുടെ ഫലങ്ങൾ തയ്യാറാണ്. അടുത്ത സന്ദർശനത്തിൽ നിങ്ങളുടെ ഡോക്ടറെ സമീപിക്കുക.",
    kn: "[ಅಣಕು ಅನುವಾದ] ನಿಮ್ಮ ಫಲಿತಾಂಶಗಳು ಸಿದ್ಧವಾಗಿವೆ. ಮುಂದಿನ ಭೇಟಿಯಲ್ಲಿ ನಿಮ್ಮ ವೈದ್ಯರನ್ನು ಸಂಪರ್ಕಿಸಿ.",
    ta: "[போலி மொழிபெயர்ப்பு] உங்கள் முடிவுகள் மதிப்பாய்வுக்கு தயாராக உள்ளன. அடுத்த சந்திப்பில் உங்கள் மருத்துவரை அணுகவும்.",
    te: "[మాక్ అనువాదం] మీ ఫలితాలు సమీక్ష కోసం సిద్ధంగా ఉన్నాయి. తదుపరి అపాయింట్‌మెంట్‌లో మీ వైద్యుడిని సంప్రదించండి.",
    en: "[Mock Translation] Your results are ready for review. Please continue your health routine and consult with your doctor at the next appointment.",
    es: "[Traducción simulada] Sus resultados están listos para ser revisados. Por favor siga su rutina de salud y consulte con su médico en la próxima cita.",
    fr: "[Traduction simulée] Vos résultats sont prêts à être examinés. Veuillez poursuivre votre routine de santé et consulter votre médecin lors de votre prochain rendez-vous.",
    hi: "[नकली अनुवाद] आपके परिणाम समीक्षा के लिए तैयार हैं। कृपया अपनी स्वास्थ्य दिनचर्या जारी रखें और अपने अगले अपॉइंटमेंट पर अपने डॉक्टर से परामर्श लें।",
    zh: "[模拟翻译] 您的结果已准备好进行审查。请继续您的健康程序，并在下次预约时咨询您的医生。",
    ar: "[ترجمة وهمية] نتائجك جاهزة للمراجعة. يرجى الاستمرار في روتينك الصحي واستشارة طبيبك في الموعد التالي.",
    pt: "[Tradução de simulação] Seus resultados estão prontos para serem revisados. Por favor, continue sua rotina de saúde e consulte seu médico na próxima consulta.",
    de: "[Mock-Übersetzung] Ihre Ergebnisse liegen zur Überprüfung bereit. Bitte setzen Sie Ihre Gesundheitsroutine fort und konsultieren Sie Ihren Arzt beim nächsten Termin.",
    vi: "[Bản dịch mô phỏng] Kết quả của bạn đã sẵn sàng để xem xét. Vui lòng tiếp tục thói quen sức khỏe của bạn và tham khảo ý kiến bác sĩ vào cuộc hẹn tiếp theo."
  }
};

export function getMockSimplifyResult(text: string): { resultText: string } {
  const topic = detectTopic(text);
  return { resultText: ENGLISH_MOCKS[topic] };
}

export function getMockTranslateResult(text: string, targetLanguageCode: string): { resultText: string } {
  const topic = detectTopic(text);
  const translations = TRANSLATION_MOCKS[topic];
  const translatedText = translations[targetLanguageCode] ?? TRANSLATION_MOCKS.default[targetLanguageCode] ?? `[Mock] ${ENGLISH_MOCKS[topic]}`;
  return { resultText: translatedText };
}

/** Simulated network latency range (milliseconds). */
export const MOCK_LATENCY_MIN_MS = 600;
export const MOCK_LATENCY_MAX_MS = 1400;
