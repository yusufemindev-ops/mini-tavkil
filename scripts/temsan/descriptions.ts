import type { Locale } from '../catalogue-tree';

/**
 * Long-form product copy, written against each product's own measured facts.
 *
 * The first import gave every product a single sentence — a median of twelve
 * words. That is under half the length at which a product page carries enough
 * to rank or to answer a buyer, and it read as missing data because it was.
 *
 * What the SERPs for these terms actually reward, checked rather than assumed:
 *
 *   - "wholesale" and "bulk" appear together in nearly every ranking title
 *   - size and pack count are the filters buyers scan first (16x24, 50-packs)
 *   - **minimum order quantity is the gap** — the Turkish supplier directories
 *     that rank for these terms do not publish it, and we do
 *
 * So each entry names the material, the size, what is in a pack and what is in a
 * carton, then gives a buyer one reason to choose it. Every number here comes
 * from the supplier's price list via `data.json`; nothing is estimated. Where a
 * claim is about use rather than measurement it stays a claim about the product,
 * not about performance we have not tested.
 *
 * They are deliberately not written to a template. Eighty-two paraphrases of one
 * sentence is thin content wearing a longer coat, and duplicated structure across
 * a catalogue is its own ranking problem.
 *
 * Keyed by the family's lead product code, matching `catalogue.ts`. A code absent
 * here keeps the short description from `catalogue.ts`.
 */
export const DESCRIPTIONS: Record<string, Partial<Record<Locale, string>>> = {
  // ── Packaging twine ────────────────────────────────────────────────────────
  'TM-210': {
    en: 'Polypropylene packaging twine on a 2 kg roll, twelve rolls to the carton. The weight is the point: a 2 kg roll runs for days on a dispatch bench without a changeover, which is why it is the size warehouses reorder rather than the small retail spool. Polypropylene holds a knot under tension and does not rot in a damp store, so stock rotates on your schedule instead of the weather’s.',
    tr: 'Polipropilen ambalaj ipi, 2 kg’lık rulo hâlinde, kolide on iki rulo. Asıl mesele ağırlık: 2 kg’lık bir rulo sevkiyat tezgâhında günlerce makara değiştirmeden gider, perakende makarası yerine depoların yeniden sipariş ettiği ölçü budur. Polipropilen gerilim altında düğümü tutar ve nemli depoda çürümez; böylece stok havanın değil sizin takviminizin ritmiyle döner.',
    ar: 'خيط تغليف من البولي بروبيلين على بكرة 2 كجم، اثنتا عشرة بكرة في الكرتون. الوزن هو الغرض: بكرة 2 كجم تكفي أياماً على طاولة الشحن دون تبديل، ولهذا تعيد المستودعات طلب هذا المقاس لا البكرة الصغيرة المخصّصة للبيع بالتجزئة. البولي بروبيلين يمسك العقدة تحت الشدّ ولا يتعفّن في مخزن رطب، فيدور المخزون وفق جدولك أنت لا وفق الطقس.',
  },
  'TM-205': {
    en: 'A 500 g roll of parcel twine, forty to the carton. Sized for a counter rather than a loading bay — light enough to sit in a dispenser beside a till and be replaced by whoever is on shift. The same polypropylene as the heavier rolls, so a shop and its warehouse can standardise on one material and one knot.',
    tr: '500 g’lık paket ipi rulosu, kolide kırk adet. Yükleme rampası için değil tezgâh için ölçülendirilmiş — kasanın yanındaki bir ip kutusuna sığacak ve o vardiyada kim varsa değiştirebilecek kadar hafif. Ağır rulolarla aynı polipropilen; böylece mağaza ile deposu tek malzeme ve tek düğüm üzerinde standartlaşabilir.',
    ar: 'بكرة خيط طرود بوزن 500 جم، أربعون بكرة في الكرتون. مقاسها للمنضدة لا لرصيف التحميل — خفيفة بما يكفي لتوضع في موزّع بجوار الصندوق ويستبدلها من يكون في الوردية. البولي بروبيلين نفسه المستخدم في البكرات الأثقل، فيتمكّن المتجر ومستودعه من التوحّد على خامة واحدة وعقدة واحدة.',
  },
  'TM-204': {
    en: 'Sack closing twine on a 1 kg roll, twenty to the carton. Spun for the job it is named after: strong enough to stitch or hand-tie a filled sack mouth without cutting into the operator’s hand, and consistent enough in diameter to feed a bag-closing machine. Bought by grain, feed and produce packers who get through it by the pallet.',
    tr: 'Çuval ağzı dikiş ipi, 1 kg’lık rulo, kolide yirmi adet. Adını taşıdığı iş için bükülmüş: dolu bir çuvalın ağzını elle bağlarken ya da dikerken operatörün eline batmayacak kadar sağlam, çuval ağzı dikiş makinesini besleyecek kadar da düzgün çaplı. Tahıl, yem ve sebze-meyve paketleyicileri bunu paletle tüketir.',
    ar: 'خيط خياطة أفواه الأكياس على بكرة 1 كجم، عشرون بكرة في الكرتون. مبروم للعمل الذي يحمل اسمه: متين بما يكفي لخياطة فم كيس ممتلئ أو ربطه يدوياً دون أن يجرح يد العامل، ومنتظم القُطر بما يكفي لتغذية ماكينة إغلاق الأكياس. يشتريه معبّئو الحبوب والأعلاف والخضار بالطبليّة.',
  },

  // ── Hoses ──────────────────────────────────────────────────────────────────
  'TM-420': {
    en: 'A reinforced 20 metre garden hose, five to the carton. The reinforcement layer is what keeps it round under pressure — an unreinforced hose kinks at the first bend and the flow stops until someone walks back to straighten it. Twenty metres covers a standard garden or forecourt run from a single tap, and the coil ships flat enough that five fit a carton without crushing.',
    tr: 'Takviyeli 20 metrelik bahçe hortumu, kolide beş adet. Takviye katmanı basınç altında hortumu yuvarlak tutan şeydir — takviyesiz hortum ilk kıvrımda katlanır ve biri gidip düzeltene kadar su kesilir. Yirmi metre, standart bir bahçeyi ya da istasyon önünü tek musluktan karşılar; sargı da beş adedi ezmeden koliye sığacak kadar yassı gider.',
    ar: 'خرطوم حديقة مقوّى بطول 20 متراً، خمسة في الكرتون. طبقة التقوية هي ما يبقيه مستديراً تحت الضغط — فالخرطوم غير المقوّى ينثني عند أول التفافة فينقطع التدفّق حتى يعود أحدهم لفرده. عشرون متراً تغطّي حديقة معتادة أو ساحة أمامية من صنبور واحد، واللفّة تُشحن مسطّحة بما يكفي لدخول خمسة في كرتون دون انضغاط.',
  },

  // ── Jute twine ─────────────────────────────────────────────────────────────
  'TM-135': {
    en: 'Ten metre hanks of natural jute twine, twelve to a pack and ten packs per carton. Jute is bought where the tie has to be seen as well as hold: plant supports, produce bundling, gift and craft packaging. It biodegrades, which increasingly matters to buyers packing food or garden goods, and the 10 m hank is short enough to sell as a single unit at retail.',
    tr: 'On metrelik doğal jüt ip çilesi, pakette on iki adet, kolide on paket. Jüt, bağın tutmasının yanı sıra görünmesi de gerektiği yerlerde alınır: fide desteği, sebze-meyve demetleme, hediye ve el işi ambalajı. Doğada çözünür — gıda ya da bahçe ürünü paketleyen alıcılar için giderek daha önemli — ve 10 m’lik çile perakendede tek başına satılacak kadar kısadır.',
    ar: 'شلل خيط جوت طبيعي بطول عشرة أمتار، اثنتا عشرة شلّة في العبوة وعشر عبوات في الكرتون. يُشترى الجوت حيث يجب أن تُرى الرابطة كما تمسك: دعائم النباتات، وتحزيم الخضار، وتغليف الهدايا والأشغال اليدوية. وهو قابل للتحلّل الحيوي، وهذا يزداد أهمية لدى من يعبّئ أغذية أو منتجات حدائق، وطول العشرة أمتار قصير بما يكفي ليُباع وحدةً واحدة بالتجزئة.',
  },
  'TM-131': {
    en: 'A wound ball of natural jute twine, ten balls to a pack and ten packs per carton. The ball format pays off at the counter — it feeds from the centre without tangling, so a shop assistant can cut a length one-handed. Same fibre as the hanks, in the presentation that suits a hardware shelf rather than a workbench.',
    tr: 'Yumak sarılmış doğal jüt ip, pakette on yumak, kolide on paket. Yumak formu tezgâhta işe yarar — ortasından beslendiği için dolaşmaz, tezgâhtar tek eliyle istediği boyu kesebilir. Çile ile aynı lif, ancak tezgâh yerine hırdavat rafına uygun sunumda.',
    ar: 'خيط جوت طبيعي ملفوف على شكل كرة، عشر كرات في العبوة وعشر عبوات في الكرتون. صيغة الكرة تفيد عند المنضدة — إذ تنسحب من المركز دون تشابك، فيقطع البائع الطول المطلوب بيد واحدة. اللِّيف نفسه المستخدم في الشلل، لكن بعرض يناسب رفّ محل الأدوات لا طاولة العمل.',
  },

  // ── Plaster sponges ────────────────────────────────────────────────────────
  'TM-515': {
    en: 'A fine white plaster sponge, twenty-four to a pack and ten packs per carton. The fine face is for the finishing pass — floating a wall smooth before the plaster sets, where a coarse sponge would drag and leave texture. Sold by builders’ merchants in quantity because a plasterer works through them across a job rather than reusing one.',
    tr: 'İnce beyaz sıva süngeri, pakette yirmi dört adet, kolide on paket. İnce yüz perdah pasosu içindir — sıva prizini almadan duvarı düzleştirmek için; kaba sünger burada sürtünür ve doku bırakır. Yapı marketleri bunu miktarla alır, çünkü sıvacı bir işte tek sünger döndürmez, sünger tüketir.',
    ar: 'إسفنجة تلييس بيضاء ناعمة، أربع وعشرون في العبوة وعشر عبوات في الكرتون. الوجه الناعم لمرحلة التشطيب — لتنعيم الجدار قبل شكّ المونة، حيث تجرّ الإسفنجة الخشنة وتترك أثراً. تبيعها محال مواد البناء بالكميات لأن المليّس يستهلكها على امتداد الورشة بدل أن يعيد استعمال واحدة.',
  },
  'TM-520': {
    en: 'A two-density plaster sponge with a coarse face for grout and a fine face for finishing, twenty-four to a pack and ten packs per carton. One sponge covering both passes means a tiler is not putting one down to pick another up, and stock is a single line rather than two. The denser side also survives cement longer than a single-density block.',
    tr: 'Çift yoğunluklu sıva süngeri; bir yüzü derz için kaba, diğer yüzü perdah için ince, pakette yirmi dört adet, kolide on paket. Tek süngerin iki pasoyu birden görmesi, fayansçının birini bırakıp diğerini almaması demektir; stok da iki kalem yerine tek kalem olur. Yoğun yüz ayrıca çimentoya tek yoğunluklu bloktan daha uzun dayanır.',
    ar: 'إسفنجة تلييس بكثافتين: وجه خشن للمُلاط ووجه ناعم للتشطيب، أربع وعشرون في العبوة وعشر عبوات في الكرتون. إسفنجة واحدة تغطّي المرحلتين تعني ألّا يضع مركّب البلاط واحدة ليلتقط أخرى، وأن يصبح المخزون صنفاً واحداً لا صنفين. كما يصمد الوجه الأكثف أمام الإسمنت أطول من قالب أحادي الكثافة.',
  },
  'TM-185': {
    en: 'Open-cell cleaning sponge in assorted colours, twelve to a pack and twenty-five packs per carton — three hundred sponges per shipment. The open cell structure holds water for wiping down walls, tiles and site surfaces rather than scouring them, and the colour mix lets a site colour-code by area or trade. A consumable bought by the carton, not the piece.',
    tr: 'Açık gözenekli temizlik süngeri, karışık renk, pakette on iki adet, kolide yirmi beş paket — sevkiyat başına üç yüz sünger. Açık gözenek yapısı ovmaktan çok duvar, fayans ve şantiye yüzeylerini silmek için su tutar; renk karışımı da sahanın alana veya işe göre renk kodlaması yapmasını sağlar. Adetle değil koliyle alınan bir sarf malzemesi.',
    ar: 'إسفنجة تنظيف مفتوحة المسام بألوان متنوعة، اثنتا عشرة في العبوة وخمس وعشرون عبوة في الكرتون — ثلاثمائة إسفنجة في الشحنة. بنية المسام المفتوحة تحتفظ بالماء لمسح الجدران والبلاط وأسطح الموقع أكثر من الجلي، وتنوّع الألوان يتيح ترميز المناطق أو المِهَن لونياً. مادة استهلاكية تُشترى بالكرتون لا بالقطعة.',
  },

  // ── Kite string ────────────────────────────────────────────────────────────
  'TM-130': {
    en: 'Wound kite string on a hand spool, twenty to a pack and ten packs per carton. Seasonal stock in most markets and a steady line in Türkiye, where kite flying runs through spring. The spool is sized for a child’s hand and the winding is even, so the line pays out without the snags that end an afternoon.',
    tr: 'El makarasına sarılı uçurtma ipi, pakette yirmi adet, kolide on paket. Çoğu pazarda mevsimlik, uçurtmanın bahar boyunca sürdüğü Türkiye’de ise istikrarlı bir kalem. Makara çocuk eline göre ölçülü, sarım da düzgün; ip bir öğleden sonrayı bitiren düğümlenmeler olmadan salınır.',
    ar: 'خيط طائرات ورقية ملفوف على بكرة يدوية، عشرون في العبوة وعشر عبوات في الكرتون. موسميّ في معظم الأسواق وصنف ثابت في تركيا حيث يمتدّ موسم الطائرات الورقية طوال الربيع. البكرة بمقاس يد الطفل واللَّف منتظم، فينسحب الخيط دون العُقد التي تُنهي فترة بعد الظهر.',
  },

  // ── Clotheslines ───────────────────────────────────────────────────────────
  'TM-012': {
    en: 'Braided nylon clothesline in 6, 8 and 20 metre lengths, twenty-four to a pack and ten packs per carton. Nylon holds tension outdoors without the stretch that leaves a cotton line sagging by mid-season, and it wipes clean rather than marking washing. The three lengths cover balcony, courtyard and rooftop runs, and each carries its own barcode — order one length or all three on a single quote.',
    tr: 'Örgü naylon çamaşır ipi; 6, 8 ve 20 metrelik boylarda, pakette yirmi dört adet, kolide on paket. Naylon dış mekânda gerginliğini korur — pamuk ipi sezon ortasında sarkıtan uzama burada yoktur — ve çamaşıra iz bırakmak yerine silinerek temizlenir. Üç boy balkon, avlu ve teras mesafelerini karşılar; her boyun kendi barkodu vardır, tek teklifte tek boy da alabilirsiniz üçünü de.',
    ar: 'حبل غسيل نايلون مجدول بأطوال 6 و8 و20 متراً، أربعة وعشرون في العبوة وعشر عبوات في الكرتون. يحافظ النايلون على شدّه في الخارج دون التمدّد الذي يترك حبل القطن متهدّلاً في منتصف الموسم، ويُمسح بدل أن يترك أثراً على الغسيل. الأطوال الثلاثة تغطّي الشرفة والفناء والسطح، ولكل طول باركود خاص — اطلب طولاً واحداً أو الثلاثة في عرض سعر واحد.',
  },
  'TM-412': {
    en: 'Polyester clothesline in a PVC jacket, 10 and 20 metre lengths, twelve to a pack and ten packs per carton. The jacket is what makes it worth stocking over bare line: it wipes clean in a second and will never transfer a mark onto white washing, which is the complaint that drives returns. Lighter than the steel-cored version and easier to coil for retail.',
    tr: 'PVC kaplı polyester çamaşır ipi; 10 ve 20 metrelik boylarda, pakette on iki adet, kolide on paket. Kaplama, çıplak ipe göre stoklanmaya değer kılan şeydir: bir saniyede silinir ve beyaz çamaşıra asla iz geçirmez — iade sebebi olan şikâyet tam da budur. Çelik özlü versiyondan hafif, perakende için sarması daha kolay.',
    ar: 'حبل غسيل بوليستر بغلاف PVC، بطولي 10 و20 متراً، اثنا عشر في العبوة وعشر عبوات في الكرتون. الغلاف هو ما يجعله جديراً بالتخزين مقارنة بالحبل العاري: يُمسح في لحظة ولا ينقل أثراً إلى الغسيل الأبيض، وتلك هي الشكوى التي تقود إلى المرتجعات. أخفّ من النسخة ذات القلب الفولاذي وأسهل لفّاً للعرض بالتجزئة.',
  },
  'TM-010': {
    en: 'PVC-coated steel clothesline, 10 and 20 metre lengths, twelve to a pack and ten packs per carton. The steel core is for spans that must not sag — a long courtyard or a run between two buildings, where a polymer line droops under a full load of wet washing. The PVC jacket keeps the steel off the laundry and off the hands.',
    tr: 'PVC kaplı çelik çamaşır ipi; 10 ve 20 metrelik boylarda, pakette on iki adet, kolide on paket. Çelik öz, sarkmaması gereken açıklıklar içindir — uzun bir avlu ya da iki bina arası, polimer ipin ıslak çamaşır yükü altında düştüğü yer. PVC kaplama çeliği hem çamaşırdan hem elden uzak tutar.',
    ar: 'حبل غسيل من الفولاذ المغلّف بالـPVC، بطولي 10 و20 متراً، اثنا عشر في العبوة وعشر عبوات في الكرتون. القلب الفولاذي لمسافات لا يُقبل فيها التهدّل — فناء طويل أو امتداد بين مبنيين، حيث يهبط الحبل البوليمري تحت حمولة غسيل مبلّل. وغلاف الـPVC يُبعد الفولاذ عن الغسيل وعن اليد.',
  },

  // ── Multi-purpose rope ─────────────────────────────────────────────────────
  'TM-134': {
    en: 'Flat woven multi-purpose rope, 10 metres, twelve to a pack and ten packs per carton. Flat rope lies against a load instead of biting into it, which matters when the load is something you would rather not mark, and the woven construction grips a knot more securely than a smooth round line. The heaviest of the utility ropes here at 30 kg to the carton.',
    tr: 'Yassı dokuma çok amaçlı ip, 10 metre, pakette on iki adet, kolide on paket. Yassı ip yüke gömülmek yerine üzerine yatar — iz bırakmasını istemediğiniz bir yük söz konusuysa bu fark eder — ve dokuma yapısı düğümü düz yuvarlak ipten daha sıkı kavrar. Buradaki hizmet iplerinin en ağırı: koli başına 30 kg.',
    ar: 'حبل متعدّد الاستعمالات منسوج مسطّح بطول 10 أمتار، اثنا عشر في العبوة وعشر عبوات في الكرتون. الحبل المسطّح يستلقي على الحمولة بدل أن يغرز فيها، وهذا مهم حين تكون الحمولة مما لا تريد أن يترك عليه أثر، كما يمسك النسيج العقدة أشدّ من حبل دائري أملس. وهو أثقل حبال الخدمة هنا بوزن 30 كجم للكرتون.',
  },
  'TM-132': {
    en: 'Round multi-purpose rope, 10 metres, twelve to a pack and ten packs per carton. The general-duty line of the range: tying down, hanging, bundling, temporary fencing. Ten metres is the length most buyers reach for first, which is why it moves fastest — stocked alongside the 20 m as a short-and-long pair rather than on its own.',
    tr: 'Yuvarlak çok amaçlı ip, 10 metre, pakette on iki adet, kolide on paket. Serinin genel iş ipi: bağlama, asma, demetleme, geçici çit. On metre çoğu alıcının ilk uzandığı boydur, en hızlı dönen kalem olmasının sebebi de budur — tek başına değil, 20 m ile kısa-uzun çifti olarak stoklanır.',
    ar: 'حبل متعدّد الاستعمالات دائري بطول 10 أمتار، اثنا عشر في العبوة وعشر عبوات في الكرتون. هو حبل الخدمة العامة في التشكيلة: للربط والتعليق والتحزيم والتسييج المؤقت. وعشرة أمتار هو الطول الذي يقصده معظم المشترين أولاً، ولهذا يدور أسرع من غيره — ويُخزَّن مع طول العشرين متراً كزوج قصير وطويل لا وحده.',
  },
  'TM-133': {
    en: 'Round multi-purpose rope, 20 metres, twelve to a pack and ten packs per carton. The same construction as the 10 m in the length that covers a full vehicle tie-down or a longer site run without knotting two together — every joint in a rope is where it fails. At 25.2 kg the carton is a two-hand lift, so plan shelf placement accordingly.',
    tr: 'Yuvarlak çok amaçlı ip, 20 metre, pakette on iki adet, kolide on paket. 10 m ile aynı yapı, ancak bir aracın tam bağlanmasını ya da daha uzun bir saha mesafesini iki ipi düğümlemeden karşılayan boyda — bir ipteki her ek, kopacağı yerdir. 25,2 kg’lık koli iki elle kaldırılır; raf yerleşimini buna göre planlayın.',
    ar: 'حبل متعدّد الاستعمالات دائري بطول 20 متراً، اثنا عشر في العبوة وعشر عبوات في الكرتون. البنية نفسها المستخدمة في طول العشرة أمتار، لكن بطول يكفي لتثبيت مركبة كاملة أو لمسافة موقع أطول دون عقد حبلين معاً — فكل وصلة في حبل هي موضع انقطاعه. ووزن الكرتون 25.2 كجم يتطلّب حملاً بكلتا اليدين، فخطّط لموضعه على الرفّ تبعاً لذلك.',
  },

  // ── Steel wire rope ────────────────────────────────────────────────────────
  'TM-211': {
    en: 'Galvanised steel wire rope in a PVC jacket, on 200 metre reels from 2 mm to 10 mm. The jacket is what makes it usable indoors and around washing: it will not rust-mark a wall or fray into the hand, and it can be cut to length without the end unravelling. Six diameters on one carton spec — the 2 mm reel weighs 1.7 kg, so a mixed pallet stays inside a light freight bracket.',
    tr: 'PVC kaplı galvanizli çelik halat, 200 metrelik makaralarda, 2 mm’den 10 mm’ye. Kaplama onu iç mekânda ve çamaşırın yanında kullanılabilir kılan şeydir: duvara pas lekesi bırakmaz, ele batacak şekilde açılmaz ve ucu dağılmadan istenen boyda kesilebilir. Tek koli tanımında altı çap — 2 mm’lik makara 1,7 kg olduğundan karışık palet hafif navlun bandında kalır.',
    ar: 'حبل فولاذي مجلفن بغلاف PVC على بكرات 200 متر، بأقطار من 2 مم إلى 10 مم. الغلاف هو ما يجعله صالحاً للاستعمال الداخلي وبجوار الغسيل: لا يترك أثر صدأ على الجدار ولا يتنسّل في اليد، ويمكن قصّه بالطول المطلوب دون أن ينحلّ طرفه. ستة أقطار بمواصفة كرتون واحدة — وبكرة الـ2 مم تزن 1.7 كجم، فتبقى الطبليّة المختلطة ضمن شريحة شحن خفيفة.',
  },

  // ── Bath ───────────────────────────────────────────────────────────────────
  'TM-772': {
    en: 'Mesh bath puff in assorted colours, 150 to the carton in a counter display box. The display box is the reason this sells — it ships as its own point of sale, so a shop opens the carton and puts it on the counter rather than finding shelf space and a price rail. Mesh lathers more from less soap than a flannel, which is what keeps it a repeat purchase.',
    tr: 'File banyo lifi, karışık renk, tezgâh teşhir kutusunda kolide 150 adet. Teşhir kutusu bunun satılma sebebidir — kendi satış noktası olarak gelir; mağaza koliyi açar ve tezgâha koyar, raf yeri ve fiyat rayı aramaz. File, bez life göre daha az sabunla daha çok köpürür; tekrar satın alınmasını sağlayan da budur.',
    ar: 'ليفة استحمام شبكية بألوان متنوعة، 150 قطعة في الكرتون داخل صندوق عرض للمنضدة. صندوق العرض هو سبب رواجها — إذ يصل بوصفه نقطة بيع قائمة بذاتها، فيفتح المتجر الكرتون ويضعه على المنضدة بدل البحث عن مساحة رفّ وشريط أسعار. والشبكة ترغي بصابون أقلّ مما تحتاجه ليفة قماشية، وهذا ما يجعلها شراءً متكرراً.',
  },
  'TM-773': {
    en: 'A larger, denser bath puff, 100 to the carton. More mesh per puff means more lather and a longer life before it collapses — the difference a customer notices in the second week, not the first. Stocked as the step-up line above the standard puff, usually side by side so the size difference does the selling.',
    tr: 'Daha büyük ve daha yoğun banyo lifi, kolide 100 adet. Lif başına daha çok file, daha çok köpük ve çökmeden önce daha uzun ömür demektir — müşterinin ilk hafta değil ikinci hafta fark ettiği fark. Standart lifin bir üst basamağı olarak, genellikle yan yana stoklanır; boy farkı satışı kendisi yapar.',
    ar: 'ليفة استحمام أكبر وأكثف، 100 قطعة في الكرتون. شبكة أكثر لكل ليفة تعني رغوة أوفر وعمراً أطول قبل أن تنكمش — وهو فارق يلاحظه الزبون في الأسبوع الثاني لا الأول. تُعرض بوصفها الصنف الأعلى فوق الليفة القياسية، وغالباً جنباً إلى جنب لأن فارق الحجم يتولّى البيع.',
  },
  'RM-775': {
    en: 'A small soft bath sponge, 504 to the carton. The quantity tells you the market: hotel and guesthouse amenity supply, where sponges are placed fresh per guest and counted by the hundred. Plain, soft and unbranded, which is what a property wants when it puts its own label on the bathroom.',
    tr: 'Küçük yumuşak banyo süngeri, kolide 504 adet. Adet size pazarı söylüyor: otel ve pansiyon amenity tedariki — süngerlerin misafir başına yeni konduğu, yüzle sayıldığı yer. Sade, yumuşak ve markasız; bir tesis banyoya kendi etiketini koyarken tam da bunu ister.',
    ar: 'إسفنجة استحمام صغيرة ناعمة، 504 قطع في الكرتون. الكمية تحدّد السوق: تجهيز مستلزمات الفنادق وبيوت الضيافة، حيث تُوضع إسفنجة جديدة لكل نزيل وتُحسب بالمئات. سادة وناعمة وبلا علامة تجارية، وهو تماماً ما يطلبه المنشأة حين تضع ملصقها الخاص في الحمّام.',
  },

  // ── Dishwashing ────────────────────────────────────────────────────────────
  'RM-753': {
    en: 'A two-layer foam dish sponge with a scouring face, ten to a pack and 180 packs to the carton — 1,800 sponges per shipment. The sizing suits both retail shelf and catering resupply, where sponges are replaced on a schedule rather than when they wear out. Denser foam than a promotional-grade sponge, so it holds its shape through a shift instead of tearing at the scour line.',
    tr: 'Ovma yüzlü çift katmanlı bulaşık süngeri, pakette on adet, kolide 180 paket — sevkiyat başına 1.800 sünger. Ölçü hem perakende rafına hem de süngerlerin yıprandıkça değil takvime göre değiştirildiği toplu yemek ikmaline uyar. Promosyon sınıfı süngerden daha yoğun köpük; vardiya boyunca ovma hattından yırtılmak yerine formunu korur.',
    ar: 'إسفنجة جلي من طبقتين بوجه كاشط، عشر قطع في العبوة و180 عبوة في الكرتون — 1800 إسفنجة في الشحنة. المقاس يناسب رفّ التجزئة وإعادة تموين المطابخ المؤسسية معاً، حيث تُستبدل الإسفنج وفق جدول لا عند تلفها. رغوتها أكثف من إسفنج الدرجة الترويجية، فتحافظ على شكلها طوال الوردية بدل أن تتمزّق عند خطّ الكشط.',
  },
  'TM-750': {
    en: 'A four-pack of industrial dish sponges, fifteen packs to the carton. Thicker foam and a harder scour face than a domestic sponge, because a catering kitchen puts one through burnt pans rather than plates. Bought by canteens and restaurant supply, where the four-pack matches a weekly changeover across four stations.',
    tr: 'Dört adetlik endüstriyel bulaşık süngeri paketi, kolide on beş paket. Ev tipine göre daha kalın köpük ve daha sert ovma yüzü, çünkü toplu yemek mutfağı bunu tabakla değil yanmış tencereyle sınar. Yemekhaneler ve restoran tedarikçileri alır; dörtlü paket dört istasyonluk haftalık değişime denk gelir.',
    ar: 'عبوة من أربع إسفنجات جلي صناعية، خمس عشرة عبوة في الكرتون. رغوة أسمك ووجه كشط أقسى من الإسفنجة المنزلية، لأن مطبخ التموين يواجه بها قدوراً محترقة لا أطباقاً. تشتريها المقاصف وموردو المطاعم، وعبوة الأربع تطابق دورة تبديل أسبوعية عبر أربع محطات.',
  },
  'RM-755': {
    en: 'A large-format classic dish sponge, five to a pack and 240 packs per carton. The extra size is for pans and gastronorm trays — a standard sponge makes a cook work twice across the same surface. Same two-layer construction as the ten-pack, in the size and count a busy kitchen actually consumes.',
    tr: 'Büyük boy klasik bulaşık süngeri, pakette beş adet, kolide 240 paket. Fazladan boy tencere ve gastronorm tepsiler içindir — standart sünger aşçıyı aynı yüzeyde iki kez çalıştırır. Onlu paketle aynı çift katmanlı yapı, yoğun bir mutfağın gerçekte tükettiği boy ve adette.',
    ar: 'إسفنجة جلي كلاسيكية بحجم كبير، خمس في العبوة و240 عبوة في الكرتون. الحجم الإضافي للقدور وصواني الغسترونورم — فالإسفنجة القياسية تجعل الطاهي يمرّ مرتين على السطح نفسه. البناء نفسه المكوّن من طبقتين المستخدم في عبوة العشر، لكن بالحجم والعدد اللذين يستهلكهما مطبخ مزدحم فعلاً.',
  },
  'TM-751': {
    en: 'A grooved dish sponge, five to a pack and 216 packs per carton. The grooves are functional rather than decorative: they give a wet hand somewhere to grip, and they let the sponge reach into a corner or along a pan rim that a flat face skates over. A small design difference that shows up in reorder rates.',
    tr: 'Oluklu bulaşık süngeri, pakette beş adet, kolide 216 paket. Oluklar dekoratif değil işlevseldir: ıslak ele kavrayacak bir yer verir ve düz yüzün kayıp geçtiği köşeye ya da tencere kenarına süngerin girmesini sağlar. Yeniden sipariş oranlarında görünen küçük bir tasarım farkı.',
    ar: 'إسفنجة جلي مخدّدة، خمس في العبوة و216 عبوة في الكرتون. التخديد وظيفي لا زخرفي: يمنح اليد المبلّلة موضعاً للإمساك، ويتيح للإسفنجة الوصول إلى زاوية أو إلى حافة قدر ينزلق عنها الوجه المستوي. فارق تصميمي صغير يظهر أثره في معدّلات إعادة الطلب.',
  },
  'TM-620': {
    en: 'An absorbent microfibre dish drying mat, 120 to the carton. It takes the water off washed dishes and holds it rather than letting it run onto a worktop, then rolls up to dry or goes through a machine wash. Sold where dish racks are not — small kitchens, rentals and catering vans — and it stores flat, which is why a carton of 120 is not a pallet.',
    tr: 'Emici mikrofiber bulaşık kurutma matı, kolide 120 adet. Yıkanmış bulaşığın suyunu alır ve tezgâha akıtmak yerine içinde tutar; sonra kuruması için rulo yapılır ya da makinede yıkanır. Bulaşıklığın olmadığı yerlerde satılır — küçük mutfaklar, kiralıklar, ikram araçları — ve yassı durur; 120 adetlik kolinin palet olmamasının sebebi budur.',
    ar: 'حصيرة تجفيف أطباق ماصّة من الميكروفايبر، 120 في الكرتون. تسحب الماء عن الأطباق المغسولة وتحتفظ به بدل أن تدعه يسيل على سطح العمل، ثم تُلَفّ لتجفّ أو تُغسل بالغسالة. تُباع حيث لا توجد مصفاة أطباق — المطابخ الصغيرة والشقق المؤجّرة وعربات التموين — وتُخزَّن مسطّحة، ولهذا لا يشكّل كرتون الـ120 طبليّة كاملة.',
  },
  'TM-740': {
    en: 'A thicker, higher-pile drying mat, 100 to the carton. More pile holds more water without spreading it, which is the failure of a thin mat: it soaks through and the worktop is wet anyway. The step-up line above the standard mat, and at 12.5 kg the carton is the heaviest in this category — a signal of how much material is in it.',
    tr: 'Daha kalın, yüksek havlı kurutma matı, kolide 100 adet. Daha çok hav, suyu yaymadan daha çok tutar; ince matın başarısızlığı tam da budur — içinden geçirir ve tezgâh yine ıslanır. Standart matın bir üst basamağı; 12,5 kg ile bu kategorinin en ağır kolisi — içindeki malzeme miktarının işareti.',
    ar: 'حصيرة تجفيف أسمك بوبر أعلى، 100 في الكرتون. الوبر الأكثر يحتجز ماءً أكثر دون أن ينشره، وهذا بالضبط ما تفشل فيه الحصيرة الرقيقة: يتسرّب الماء عبرها فيبتلّ سطح العمل رغم ذلك. هي الصنف الأعلى فوق الحصيرة القياسية، وبوزن 12.5 كجم فهي أثقل كرتون في هذه الفئة — مؤشّر على كمية الخامة فيها.',
  },
  'TM-785': {
    en: 'Woven stainless steel scourers, two to a pack in a counter display box, forty-eight to the carton. For burnt-on residue on pans, grills and hobs where a foam sponge gives up. Woven mesh rather than loose wool, so it does not shed strands into the sink, and the display box means it merchandises itself at the till.',
    tr: 'Örgü paslanmaz çelik ovma teli, tezgâh teşhir kutusunda pakette iki adet, kolide kırk sekiz paket. Köpük süngerin pes ettiği yerde — tencere, ızgara ve ocak üstündeki yanmış kalıntı için. Gevşek yün değil örgü file olduğundan lavaboya tel dökmez, teşhir kutusu da kasada kendini pazarlar.',
    ar: 'سلك جلي منسوج من الستانلس ستيل، قطعتان في العبوة داخل صندوق عرض للمنضدة، ثمان وأربعون عبوة في الكرتون. لبقايا الاحتراق على القدور والشوايات ومواقد الطهي حيث تعجز إسفنجة الرغوة. منسوج شبكياً لا صوفاً سائباً، فلا ينثر خيوطاً في الحوض، وصندوق العرض يتولّى تسويقه عند الصندوق.',
  },
  'TM-624': {
    en: 'A mesh-wrapped dish sponge, three to a pack and 120 packs per carton. The mesh lifts residue without scratching, which is what makes it safe on non-stick and glazed surfaces where a metal scourer is not. The economy line of the mesh range — same construction, lighter foam, priced for volume retail.',
    tr: 'File kaplı bulaşık süngeri, pakette üç adet, kolide 120 paket. File çizmeden kalıntıyı kaldırır; yapışmaz ve sırlı yüzeylerde — metal telin uygun olmadığı yerlerde — güvenli olmasının sebebi budur. File serisinin ekonomik hattı: aynı yapı, daha hafif köpük, hacimli perakende için fiyatlanmış.',
    ar: 'إسفنجة جلي مغلّفة بشبكة، ثلاث في العبوة و120 عبوة في الكرتون. ترفع الشبكة البقايا دون خدش، وهذا ما يجعلها آمنة على الأسطح غير اللاصقة والمطليّة حيث لا يصلح السلك المعدني. وهي الخط الاقتصادي من تشكيلة الشبكة — البناء نفسه برغوة أخفّ وبسعر موجّه للبيع بالكميات.',
  },
  'TM-460': {
    en: 'The three-pack mesh sponge in a retail-ready counter display, 120 to the carton. Identical sponge to the economy line with more foam behind the mesh, supplied in a display box so a shop can put the carton straight on the counter. The format most independent retailers reorder, because it needs no shelf plan.',
    tr: 'Üçlü file sünger, perakendeye hazır tezgâh teşhirinde, kolide 120 adet. Ekonomik hatla birebir aynı sünger, filenin arkasında daha çok köpükle; teşhir kutusuyla geldiği için mağaza koliyi doğrudan tezgâha koyabilir. Bağımsız perakendecilerin en çok yeniden sipariş ettiği format, çünkü raf planı gerektirmez.',
    ar: 'إسفنجة شبكية بعبوة ثلاثية داخل عرض منضدة جاهز للبيع، 120 في الكرتون. الإسفنجة ذاتها المستخدمة في الخط الاقتصادي لكن برغوة أوفر خلف الشبكة، وتُورَّد في صندوق عرض يتيح للمتجر وضع الكرتون على المنضدة مباشرة. وهي الصيغة الأكثر إعادةً للطلب لدى تجار التجزئة المستقلين لأنها لا تحتاج خطة رفوف.',
  },
  'TM-782': {
    en: 'Black-coated stainless scourers, two to a pack in a display box, forty-eight to the carton. The coating is why it exists: bare stainless leaves grey marks on stainless-steel surfaces, and a kitchen that has just fitted a steel splashback notices immediately. Same cutting power, no transfer.',
    tr: 'Siyah kaplamalı paslanmaz ovma teli, teşhir kutusunda pakette iki adet, kolide kırk sekiz paket. Kaplama varlık sebebidir: çıplak paslanmaz, paslanmaz çelik yüzeylerde gri iz bırakır ve az önce çelik tezgâh arkalığı taktırmış bir mutfak bunu anında fark eder. Aynı kesme gücü, iz yok.',
    ar: 'سلك جلي ستانلس بطلاء أسود، قطعتان في العبوة داخل صندوق عرض، ثمان وأربعون عبوة في الكرتون. الطلاء هو سبب وجوده: الستانلس العاري يترك أثراً رمادياً على أسطح الستانلس ستيل، ويلاحظ ذلك فوراً مطبخ ركّب للتوّ لوح ظهر فولاذياً. القوة نفسها في الكشط، دون أن ينقل أثراً.',
  },

  // ── Glass cleaning ─────────────────────────────────────────────────────────
  'TM-612': {
    en: 'Four diamond-weave glass cloths, 30 × 40 cm, on a header card, 120 to the carton. Diamond weave clears glass dry — no chemical, no second pass with a dry cloth — which is what stops the streaking a flat-weave cloth leaves behind. The header card hangs on a peg rail, so it sells from the same fixture as squeegees rather than needing shelf space.',
    tr: 'Dört adet baklava desenli cam bezi, 30 × 40 cm, kartelalı, kolide 120 adet. Baklava doku camı kuru siler — kimyasal yok, kuru bezle ikinci paso yok — düz dokuma bezin bıraktığı iz de böylece ortadan kalkar. Kartela askı çıtasına asılır; raf yeri istemek yerine cam çekpasların bulunduğu aynı standdan satılır.',
    ar: 'أربع مناشف زجاج بنقشة معيّنية بمقاس 30 × 40 سم على بطاقة تعليق، 120 في الكرتون. النقشة المعيّنية تنظّف الزجاج جافّاً — بلا مواد كيميائية وبلا مسحة ثانية بقطعة جافّة — وهذا ما يمنع التخطيط الذي تتركه المناشف ذات النسيج المستوي. وبطاقة التعليق تُعلَّق على قضيب، فتُباع من الحامل نفسه الذي تُعرض عليه المساحات بدل أن تحتاج مساحة رفّ.',
  },
  'TM-611': {
    en: 'Diamond-weave glass cloths in 30 × 40 cm and 40 × 40 cm, twenty to a pack and 400 to the carton. The two sizes are not interchangeable in practice: 30 × 40 suits domestic windows and mirrors, 40 × 40 folds into a usable pad for shopfronts and vehicle glass. Sold loose in packs rather than carded, for buyers who refill rather than merchandise.',
    tr: 'Baklava desenli cam bezi, 30 × 40 cm ve 40 × 40 cm, pakette yirmi adet, kolide 400 adet. İki ölçü pratikte birbirinin yerine geçmez: 30 × 40 ev camı ve aynaya, 40 × 40 katlandığında vitrin ve araç camı için kullanışlı bir ped olur. Kartelasız, paket hâlinde dökme satılır — teşhir eden değil ikmal eden alıcılar için.',
    ar: 'مناشف زجاج بنقشة معيّنية بمقاسي 30 × 40 سم و40 × 40 سم، عشرون في العبوة و400 في الكرتون. المقاسان غير متبادلين عملياً: 30 × 40 يناسب نوافذ المنازل والمرايا، و40 × 40 يُطوى ليعطي وسادة صالحة لواجهات المحال وزجاج المركبات. تُباع سائبة في عبوات لا على بطاقات، لمن يعيد التموين لا لمن يعرض.',
  },
  'TM-712': {
    en: 'A piqué-weave cloth, 40 × 50 cm, individually wrapped, 250 to the carton. Piqué is the weave that leaves no lint, which is why it is used on mirrors, display cases and spectacle counters where a fibre left behind is the whole problem. Individual wrapping keeps each cloth clean until use — the reason opticians and jewellers buy this format.',
    tr: 'Lacost dokuma bez, 40 × 50 cm, tek tek ambalajlı, kolide 250 adet. Lacost, tüy bırakmayan dokumadır; ayna, teşhir vitrini ve gözlük tezgâhı gibi geride kalan tek bir lifin bütün sorun olduğu yerlerde kullanılmasının sebebi budur. Tekil ambalaj her bezi kullanıma kadar temiz tutar — gözlükçülerin ve kuyumcuların bu formatı almasının nedeni.',
    ar: 'قطعة بنسيج البيكيه بمقاس 40 × 50 سم، مغلّفة فردياً، 250 في الكرتون. البيكيه هو النسيج الذي لا يترك وبراً، ولهذا يُستخدم على المرايا وواجهات العرض ومناضد النظارات حيث تكون الشعرة المتروكة هي المشكلة كلها. والتغليف الفردي يبقي كل قطعة نظيفة حتى لحظة الاستعمال، وهو سبب اقتناء محال البصريات والمجوهرات لهذه الصيغة.',
  },
  'TM-713': {
    en: 'The same 40 × 50 cm piqué cloth supplied loose in bulk, 500 to the carton. Dropping the wrapper takes the cost per cloth down substantially, which is the right trade for contract cleaning where cloths go into a laundry cycle rather than a customer’s hand. Twice the count per carton and less packaging to dispose of on site.',
    tr: 'Aynı 40 × 50 cm lacost bez, dökme olarak, kolide 500 adet. Ambalajın kalkması bez başına maliyeti belirgin biçimde düşürür; bezlerin müşterinin eline değil çamaşır döngüsüne gittiği sözleşmeli temizlik için doğru tercih budur. Koli başına iki katı adet ve sahada bertaraf edilecek daha az ambalaj.',
    ar: 'القطعة ذاتها بنسيج البيكيه بمقاس 40 × 50 سم لكن سائبة، 500 في الكرتون. إسقاط الغلاف يخفض تكلفة القطعة الواحدة بوضوح، وهي المفاضلة الصحيحة لعقود النظافة حيث تدخل القطع دورة غسيل بدل أن تصل إلى يد الزبون. ضعف العدد في الكرتون ونفايات تغليف أقلّ في الموقع.',
  },

  // ── General cleaning ───────────────────────────────────────────────────────
  'TM-475': {
    en: 'Four microfibre cloths, 25 × 35 cm, ultrasonically cut, 100 packs per carton. Ultrasonic cutting seals the edge instead of stitching it, so there is no seam to trap dirt and nothing to fray — the cloth stays flat through repeated washing. The smallest of the microfibre sizes here, sized for detail work rather than covering a worktop.',
    tr: 'Dört adet mikrofiber bez, 25 × 35 cm, ultrasonik kesim, kolide 100 paket. Ultrasonik kesim kenarı dikmek yerine mühürler; kir tutacak dikiş yoktur ve saçaklanacak bir şey de kalmaz — bez tekrarlanan yıkamalarda düz kalır. Buradaki mikrofiber ölçülerinin en küçüğü: tezgâh silmek için değil, ince iş için ölçülendirilmiş.',
    ar: 'أربع مناشف ميكروفايبر بمقاس 25 × 35 سم بقصّ فوق صوتي، 100 عبوة في الكرتون. القصّ فوق الصوتي يلحم الحافة بدل خياطتها، فلا درزة تحتجز الأوساخ ولا شيء يتنسّل — تبقى القطعة مستوية عبر غسلات متكرّرة. وهي أصغر مقاسات الميكروفايبر هنا، مُعدّة للأعمال الدقيقة لا لتغطية سطح عمل.',
  },
  'TM-600': {
    en: 'Four microfibre cleaning cloths, 30 × 40 cm, on a header card, 120 to the carton. Colour-coded so tasks stay separated — the standard practice in food premises and healthcare, where a cloth crossing from washroom to prep is an audit failure. The card carries the colour system visibly, which is half the reason a facilities buyer picks a carded pack.',
    tr: 'Dört adet mikrofiber temizlik bezi, 30 × 40 cm, kartelalı, kolide 120 adet. Renk kodlu — görevlerin ayrı kalması için; gıda işletmelerinde ve sağlık kuruluşlarında standart uygulama budur, bir bezin lavabodan hazırlık alanına geçmesi denetimde başarısızlıktır. Kartela renk sistemini görünür biçimde taşır; bir tesis alıcısının kartelalı paketi seçmesinin yarısı bu yüzdendir.',
    ar: 'أربع مناشف تنظيف ميكروفايبر بمقاس 30 × 40 سم على بطاقة تعليق، 120 في الكرتون. مرمّزة بالألوان لفصل المهام — وهي الممارسة المعتمدة في منشآت الأغذية والرعاية الصحية، حيث انتقال قطعة من دورة المياه إلى منطقة التحضير مخالفة تُرصد في التدقيق. والبطاقة تُظهر نظام الألوان بوضوح، وهذا نصف سبب اختيار مسؤول المرافق لعبوة مبطّقة.',
  },
  'TM-720': {
    en: 'A nine-pack of general-purpose cleaning cloths, ninety packs per carton. The count is aimed squarely at high-turnover cleaning: nine cloths covers a shift across a small site without anyone rationing them. Plain, absorbent, machine washable and priced to be replaced rather than nursed.',
    tr: 'Dokuz adetlik genel amaçlı temizlik bezi paketi, kolide doksan paket. Adet doğrudan yüksek devirli temizliği hedefler: dokuz bez, küçük bir sahada kimse kısıtlamaya gitmeden bir vardiyayı karşılar. Sade, emici, makinede yıkanabilir ve idare edilmek yerine değiştirilmek üzere fiyatlanmış.',
    ar: 'عبوة من تسع مناشف تنظيف للأغراض العامة، تسعون عبوة في الكرتون. العدد موجّه مباشرة إلى النظافة عالية الدوران: تسع قطع تغطّي وردية في موقع صغير دون أن يقتّر أحد في استعمالها. سادة وماصّة وقابلة للغسل بالغسالة، ومسعّرة لتُستبدل لا لتُداوى.',
  },
  'TM-163': {
    en: 'A three-piece micro plush cloth set, 120 sets per carton. High-pile plush lifts dust dry and polishes without a chemical, which is what puts it on dashboards, screens and painted surfaces where a spray would be the wrong answer. Sold as a set because the three are used in sequence — dust, damp, buff.',
    tr: 'Üç parçalı mikro peluş bez seti, kolide 120 set. Yüksek hav tozu kuru kaldırır ve kimyasalsız parlatır; gösterge paneli, ekran ve boyalı yüzeyler gibi spreyin yanlış cevap olacağı yerlerde kullanılmasının sebebi budur. Set olarak satılır, çünkü üçü sırayla kullanılır — toz al, nemli sil, parlat.',
    ar: 'طقم من ثلاث مناشف مايكرو بلاش، 120 طقماً في الكرتون. الوبر العالي يرفع الغبار جافّاً ويلمّع دون مواد كيميائية، وهذا ما يضعه على لوحات القيادة والشاشات والأسطح المطليّة حيث يكون البخّاخ إجابة خاطئة. ويُباع طقماً لأن القطع الثلاث تُستخدم بالتتابع: إزالة الغبار، ثم المسح الرطب، ثم التلميع.',
  },
  'TM-164': {
    en: 'A four-piece micro plush set in assorted colours, 120 sets per carton. The fourth cloth and the colour range make this the room-by-room version of the three-piece: one colour per zone, which stops the kitchen cloth ending up in the bathroom. At 13.9 kg the carton carries noticeably more material than the three-piece.',
    tr: 'Karışık renkli dört parçalı mikro peluş set, kolide 120 set. Dördüncü bez ve renk yelpazesi bunu üçlünün oda-oda versiyonu yapar: bölge başına bir renk, böylece mutfak bezi banyoda son bulmaz. 13,9 kg ile koli, üçlüye göre gözle görülür biçimde daha fazla malzeme taşır.',
    ar: 'طقم من أربع مناشف مايكرو بلاش بألوان متنوعة، 120 طقماً في الكرتون. القطعة الرابعة وتنوّع الألوان يجعلان هذا الطقم النسخة الموزّعة على الغرف من الطقم الثلاثي: لون لكل منطقة، فلا تنتهي منشفة المطبخ في الحمّام. وبوزن 13.9 كجم يحمل الكرتون خامة أوفر بوضوح من الطقم الثلاثي.',
  },
  'TM-618': {
    en: 'A large micro plush cleaning cloth, 40 × 40 cm, twelve to a pack and 144 packs per carton. The size is what distinguishes it — 40 cm covers a dashboard or a worktop in one pass where a 30 cm cloth needs three. Plush pile rather than flat microfibre, so it is a polishing cloth first and a wiping cloth second.',
    tr: 'Büyük mikro peluş temizlik bezi, 40 × 40 cm, pakette on iki adet, kolide 144 paket. Onu ayıran şey ölçüdür — 40 cm, 30 cm’lik bezin üç pasoda yaptığını tek pasoda gösterge paneli ya da tezgâh boyunca yapar. Düz mikrofiber değil peluş hav; yani önce parlatma bezi, sonra silme bezi.',
    ar: 'منشفة تنظيف مايكرو بلاش كبيرة بمقاس 40 × 40 سم، اثنتا عشرة في العبوة و144 عبوة في الكرتون. المقاس هو ما يميّزها — إذ يغطّي عرض الـ40 سم لوحة قيادة أو سطح عمل بمسحة واحدة حيث تحتاج منشفة 30 سم إلى ثلاث. وبوبرها المرتفع بدل الميكروفايبر المستوي، فهي منشفة تلميع أولاً ومنشفة مسح ثانياً.',
  },
  'TM-715': {
    en: 'Four overlocked microfibre cloths, twelve packs to a sleeve and 240 packs per carton. Overlocking is the stitched border that holds the weave together through commercial laundering, where an unfinished edge unravels after a dozen cycles. The economy weight of the overlocked range — the same construction with less fibre, for buyers replacing cloths often.',
    tr: 'Dört adet overloklu mikrofiber bez, kolide on iki paketlik sleeve ve 240 paket. Overlok, endüstriyel yıkamada dokuyu bir arada tutan dikişli kenardır; işlenmemiş kenar bir düzine döngüde açılır. Overloklu serinin ekonomik gramajı — aynı yapı, daha az lif, bezini sık değiştiren alıcılar için.',
    ar: 'أربع مناشف ميكروفايبر بحواف مخيطة، اثنتا عشرة عبوة في الغلاف و240 عبوة في الكرتون. الحياكة المحيطة هي الحافة المخيطة التي تُبقي النسيج متماسكاً في الغسيل الصناعي، حيث تنحلّ الحافة غير المشغولة بعد اثنتي عشرة دورة. وهو الوزن الاقتصادي من التشكيلة المخيطة — البناء نفسه بألياف أقلّ، لمن يستبدل المناشف كثيراً.',
  },
  'TM-465': {
    en: 'A 30 × 30 cm microfibre cloth with overlocked edges, four to a sleeve and 240 to the carton. The stitched border is what separates a wholesale line from a consumable — it survives commercial laundering where a cut edge frays within a dozen washes. At this size the cloth folds into quarters, giving eight clean faces before it needs changing, which is why contract cleaners and hotel housekeeping buy it over a larger towel.',
    tr: '30 × 30 cm mikrofiber bez, overloklu kenarlı, sleeve içinde dört adet, kolide 240 adet. Dikişli kenar, toptan bir kalemi sarf malzemesinden ayıran şeydir — kesik kenarın bir düzine yıkamada saçaklandığı yerde endüstriyel yıkamaya dayanır. Bu ölçüde bez dörde katlanır ve değişmeden önce sekiz temiz yüz verir; sözleşmeli temizlikçilerin ve otel kat hizmetlerinin daha büyük bir havlu yerine bunu almasının sebebi budur.',
    ar: 'منشفة ميكروفايبر بمقاس 30 × 30 سم بحواف مخيطة، أربع في الغلاف و240 في الكرتون. الحافة المخيطة هي ما يفصل صنفاً للجملة عن مادة استهلاكية — إذ تصمد أمام الغسيل الصناعي حيث تتنسّل الحافة المقصوصة خلال اثنتي عشرة غسلة. وبهذا المقاس تُطوى المنشفة إلى أربعة، فتعطي ثمانية أوجه نظيفة قبل تبديلها، ولهذا تفضّلها شركات النظافة التعاقدية وأقسام التدبير الفندقي على منشفة أكبر.',
  },
  'TM-468': {
    en: 'The same 30 × 30 cm four-pack with ultrasonically sealed edges rather than stitched, 240 packs per carton. Sealing leaves no seam at all, so the cloth lies perfectly flat and has nowhere to harbour soil — preferred in cleanroom and food-contact work for exactly that reason. Choose it over the overlocked version where hygiene audit matters more than laundry life.',
    tr: 'Aynı 30 × 30 cm dörtlü paket, dikişli değil ultrasonik mühürlü kenarlı, kolide 240 paket. Mühürleme hiç dikiş bırakmaz; bez tam düz yatar ve kirin tutunacağı bir yer kalmaz — temiz oda ve gıdayla temas eden işlerde tam da bu yüzden tercih edilir. Hijyen denetiminin yıkama ömründen daha önemli olduğu yerde overloklu versiyon yerine bunu seçin.',
    ar: 'العبوة الرباعية ذاتها بمقاس 30 × 30 سم لكن بحواف ملحومة فوق صوتياً بدل المخيطة، 240 عبوة في الكرتون. اللحام لا يترك درزة إطلاقاً، فتستلقي المنشفة مستوية تماماً ولا يبقى موضع تعلق فيه الأوساخ — ولهذا السبب بالذات تُفضَّل في الغرف النظيفة والأعمال الملامسة للأغذية. اخترها بدل النسخة المخيطة حيث يكون التدقيق الصحي أهمّ من عمر الغسيل.',
  },
  'TM-605': {
    en: 'The everyday microfibre cloth, 30 × 40 cm, twenty to a pack and 400 to the carton. This is the volume line: no card, no colour system, no finishing beyond the cut — just the cloth, in the count a facilities buyer orders when the store cupboard is empty. The largest carton count in the general cleaning range.',
    tr: 'Günlük mikrofiber bez, 30 × 40 cm, pakette yirmi adet, kolide 400 adet. Hacim kalemi budur: kartela yok, renk sistemi yok, kesimin ötesinde işleme yok — sadece bez, tesis alıcısının depo dolabı boşaldığında sipariş ettiği adette. Genel temizlik serisinin koli başına en yüksek adedi.',
    ar: 'منشفة الميكروفايبر اليومية بمقاس 30 × 40 سم، عشرون في العبوة و400 في الكرتون. هذا هو صنف الكميات: بلا بطاقة، وبلا نظام ألوان، وبلا تشطيب يتجاوز القصّ — مجرّد منشفة، بالعدد الذي يطلبه مسؤول المرافق حين تفرغ خزانة المستودع. وهو أعلى عدد في الكرتون ضمن تشكيلة التنظيف العام.',
  },
  'TM-058': {
    en: 'A three-pack of premium cleaning cloths, sixty packs per carton. Heavier weave and denser pile than the standard line, which shows in how many washes it survives rather than in how it looks on day one. Positioned above the volume cloths for buyers who have worked out that a cheaper cloth replaced three times is not cheaper.',
    tr: 'Üç adetlik premium temizlik bezi paketi, kolide altmış paket. Standart hatta göre daha ağır dokuma ve daha yoğun hav; bu, ilk gün nasıl göründüğünde değil kaç yıkama dayandığında kendini gösterir. Daha ucuz bir bezi üç kez değiştirmenin daha ucuz olmadığını hesaplamış alıcılar için hacim bezlerinin üzerinde konumlanır.',
    ar: 'عبوة من ثلاث مناشف تنظيف فاخرة، ستون عبوة في الكرتون. نسيج أثقل ووبر أكثف من الخط القياسي، وهو ما يظهر في عدد الغسلات التي تصمد لها لا في مظهرها في اليوم الأول. تُوضع فوق مناشف الكميات لمن استنتج أن منشفة أرخص تُستبدل ثلاث مرات ليست أرخص.',
  },
  'TM-721': {
    en: 'A perforated cleaning cloth roll, fifteen sheets, fifteen rolls per carton. Tear off a sheet, use it, then rinse it or bin it — the decision is made per sheet rather than per cloth, which is why it suits kitchens handling raw and cooked in the same space. The roll stands in a holder, so it dispenses one-handed.',
    tr: 'Perforeli temizlik bezi rulosu, on beş yaprak, kolide on beş rulo. Bir yaprak kopar, kullan, sonra durula ya da at — karar bez başına değil yaprak başına verilir; çiğ ve pişmişi aynı alanda işleyen mutfaklara uygun olmasının sebebi budur. Rulo bir aparata takılır, tek elle verir.',
    ar: 'لفّة مناشف تنظيف مثقّبة بخمس عشرة ورقة، خمس عشرة لفّة في الكرتون. اقطع ورقة، استعملها، ثم اشطفها أو ارمها — القرار يُتّخذ لكل ورقة لا لكل منشفة، ولهذا تناسب المطابخ التي تتعامل مع النيّئ والمطبوخ في المساحة نفسها. وتُثبَّت اللفّة في حامل فتُسحب بيد واحدة.',
  },
  'TM-051': {
    en: 'The twenty-sheet version of the perforated roll, fifteen rolls per carton. Five more sheets per roll for kitchens that get through cloths quickly enough that changing the roll becomes the annoyance. Same perforation and same holder fit — stock one or the other, not usually both.',
    tr: 'Perforeli rulonun yirmi yapraklı versiyonu, kolide on beş rulo. Bezleri rulo değiştirmeyi zahmete dönüştürecek kadar hızlı tüketen mutfaklar için rulo başına beş yaprak fazla. Aynı perforasyon, aynı aparat uyumu — genellikle ikisinden biri stoklanır, ikisi birden değil.',
    ar: 'النسخة ذات العشرين ورقة من اللفّة المثقّبة، خمس عشرة لفّة في الكرتون. خمس أوراق إضافية في اللفّة للمطابخ التي تستهلك المناشف بسرعة تجعل تبديل اللفّة نفسه مصدر إزعاج. التثقيب نفسه والحامل نفسه — وعادةً يُخزَّن أحد الصنفين لا كلاهما.',
  },
  'TM-050': {
    en: 'A three-pack of basic cleaning cloths, 200 packs per carton. Absorbent, washable and priced for volume — the line that fills a shelf underneath the microfibre rather than competing with it. Six hundred cloths per carton at 7.8 kg, which is as much cleaning cloth as a small retailer sells in a season.',
    tr: 'Üç adetlik temel temizlik bezi paketi, kolide 200 paket. Emici, yıkanabilir ve hacim için fiyatlanmış — mikrofiberle yarışmak yerine altındaki rafı dolduran hat. Koli başına altı yüz bez, 7,8 kg; küçük bir perakendecinin bir sezonda sattığı temizlik bezi kadar.',
    ar: 'عبوة من ثلاث مناشف تنظيف أساسية، 200 عبوة في الكرتون. ماصّة وقابلة للغسل ومسعّرة للكميات — الخط الذي يملأ الرفّ أسفل الميكروفايبر بدل أن ينافسه. ستمائة منشفة في الكرتون بوزن 7.8 كجم، أي ما يبيعه تاجر تجزئة صغير في موسم كامل.',
  },
  'TM-790': {
    en: 'A woven cloth made specifically for stainless steel, 800 to the carton. Steel shows every smear, and a general cloth leaves them; this weave polishes to a shine and lifts fingerprints without a chemical. The highest carton count in the range, because commercial kitchens and appliance retailers buy it as a consumable.',
    tr: 'Özellikle paslanmaz çelik için dokunmuş bez, kolide 800 adet. Çelik her lekeyi gösterir ve genel bir bez onları bırakır; bu dokuma parlaklığa kadar cilalar ve parmak izlerini kimyasalsız kaldırır. Serinin koli başına en yüksek adedi, çünkü ticari mutfaklar ve beyaz eşya perakendecileri bunu sarf malzemesi olarak alır.',
    ar: 'قطعة منسوجة خصيصاً للستانلس ستيل، 800 في الكرتون. الفولاذ يُظهر كل لطخة، والقطعة العامة تتركها؛ أما هذا النسيج فيلمّع حتى اللمعان ويرفع بصمات الأصابع دون مواد كيميائية. وهو أعلى عدد في الكرتون ضمن التشكيلة، لأن المطابخ التجارية ومحال الأجهزة تشتريه بوصفه مادة استهلاكية.',
  },

  // ── Car care ───────────────────────────────────────────────────────────────
  'TM-710': {
    en: 'A diamond-weave glass cloth, 50 × 70 cm, on a header card, 120 to the carton. Windscreen-sized, so a driver clears the glass in one pass rather than working across it, and diamond weave means no streak in low sun. The header card is built for forecourt display, which is where this is bought on impulse rather than planned.',
    tr: 'Baklava desenli cam bezi, 50 × 70 cm, kartelalı, kolide 120 adet. Ön cam ölçüsünde; sürücü camı üzerinde gezinmek yerine tek pasoda temizler ve baklava doku alçak güneşte iz bırakmaz. Kartela istasyon önü teşhiri için tasarlanmıştır — burası planlı değil anlık alındığı yerdir.',
    ar: 'منشفة زجاج بنقشة معيّنية بمقاس 50 × 70 سم على بطاقة تعليق، 120 في الكرتون. بمقاس الزجاج الأمامي، فينظّفه السائق بمسحة واحدة بدل التنقّل عبره، والنقشة المعيّنية لا تترك تخطيطاً تحت شمس منخفضة. وبطاقة التعليق مصمّمة لعرض محطات الوقود، وهناك يُشترى هذا الصنف باندفاع لا بتخطيط.',
  },
  'TM-709': {
    en: 'The 50 × 70 cm diamond-weave cloth supplied twenty to a pack, 200 to the carton. Same cloth as the carded version without the card — the format for valeting bays and fleet workshops that get through them, where merchandising is irrelevant and cost per cloth is not. At 17.5 kg this is the heaviest carton in car care.',
    tr: '50 × 70 cm baklava desenli bez, pakette yirmi adet, kolide 200 adet. Kartelalı versiyonla aynı bez, kartelasız — bunları tüketen oto yıkama bölmeleri ve filo atölyeleri için; orada teşhir önemsiz, bez başına maliyet değil. 17,5 kg ile oto bakımın en ağır kolisi.',
    ar: 'منشفة بنقشة معيّنية بمقاس 50 × 70 سم تُورَّد بعشرين في العبوة، 200 في الكرتون. المنشفة ذاتها الموجودة في النسخة المبطّقة لكن دون بطاقة — وهي الصيغة المخصّصة لمغاسل السيارات وورش الأساطيل التي تستهلكها، حيث لا يهمّ العرض بل تكلفة القطعة. وبوزن 17.5 كجم فهي أثقل كرتون في فئة العناية بالسيارات.',
  },
  'TM-706': {
    en: 'A deep-pile microfibre body cloth, 50 × 70 cm, twenty to a pack and 120 packs per carton. Deep pile holds water and, more importantly, lifts grit away from the paint instead of dragging it along — which is what causes the fine swirl marks a customer notices in sunlight. The cloth a valeter uses on bodywork, not glass.',
    tr: 'Uzun havlı mikrofiber gövde bezi, 50 × 70 cm, pakette yirmi adet, kolide 120 paket. Uzun hav suyu tutar ve daha önemlisi kumu boya üzerinde sürüklemek yerine ondan uzaklaştırır — güneşte müşterinin fark ettiği ince girdap izlerinin sebebi tam da budur. Oto bakımcının cama değil kaportaya kullandığı bez.',
    ar: 'منشفة ميكروفايبر عميقة الوبر لهيكل السيارة بمقاس 50 × 70 سم، عشرون في العبوة و120 عبوة في الكرتون. الوبر العميق يحتجز الماء، والأهم أنه يرفع الحبيبات بعيداً عن الطلاء بدل جرّها عليه — وهذا هو سبب خطوط الدوامات الدقيقة التي يلاحظها الزبون تحت الشمس. وهي المنشفة التي يستخدمها فنّي التلميع على الهيكل لا على الزجاج.',
  },
  'TM-700': {
    en: 'A car drying cloth, 50 × 70 cm, carded, 120 to the carton. Absorbent enough to take a full car down without wringing, which is the difference between drying a vehicle and chasing water around it. Carded for retail display alongside the glass cloths, and the same 50 × 70 size so a forecourt can run one fixture for both.',
    tr: 'Araç kurulama bezi, 50 × 70 cm, kartelalı, kolide 120 adet. Sıkmadan bütün bir aracı alacak kadar emici; bir aracı kurulamakla suyu peşinde kovalamak arasındaki fark budur. Cam bezlerinin yanında perakende teşhiri için kartelalı ve aynı 50 × 70 ölçüde — bir istasyon her ikisi için tek stand çalıştırabilir.',
    ar: 'منشفة تجفيف سيارات بمقاس 50 × 70 سم على بطاقة تعليق، 120 في الكرتون. ماصّة بما يكفي لتجفيف سيارة كاملة دون عصرها، وهو الفارق بين تجفيف مركبة وملاحقة الماء عليها. مبطّقة للعرض بالتجزئة إلى جانب مناشف الزجاج، وبالمقاس نفسه 50 × 70، فتُدير المحطة حاملاً واحداً للصنفين.',
  },
  'TM-701': {
    en: 'The same drying cloth rolled in a tube, ninety-six to the carton. Rolling rather than folding means it stores damp without setting a crease, and the tube keeps it clean between jobs in a van where a folded cloth ends up on the floor. Noticeably lighter per unit than the carded version at 1.95 kg per carton.',
    tr: 'Aynı kurulama bezi, tüp içinde rulo hâlinde, kolide doksan altı adet. Katlamak yerine sarmak, nemli saklandığında kırık izi bırakmaması demektir; tüp de katlanmış bezin yere düştüğü bir araçta bezi işler arasında temiz tutar. Kartelalı versiyondan birim başına belirgin biçimde hafif — koli 1,95 kg.',
    ar: 'منشفة التجفيف ذاتها ملفوفة داخل أنبوب، ست وتسعون في الكرتون. اللفّ بدل الطيّ يعني تخزينها رطبة دون أن تترك ثنية ثابتة، والأنبوب يبقيها نظيفة بين مهمّة وأخرى داخل مركبة تنتهي فيها المنشفة المطويّة على الأرضية. وهي أخفّ بوضوح للوحدة من النسخة المبطّقة، إذ يزن الكرتون 1.95 كجم.',
  },
  'TM-653': {
    en: 'A plush car drying mitt, 100 to the carton. A mitt keeps the hand behind the cloth, which is what lets a valeter follow a contour, a door shut or a trim edge without losing grip on a wet panel. Bought where drying is done by hand rather than blown — detailing bays and forecourt services.',
    tr: 'Peluş araç kurulama eldiveni, kolide 100 adet. Eldiven eli bezin arkasında tutar; oto bakımcının ıslak bir panelde tutuşunu kaybetmeden bir kıvrımı, kapı kenarını ya da bir kaplama hattını takip etmesini sağlayan şey budur. Kurulamanın üflemeyle değil elle yapıldığı yerlerde alınır — detaylı bakım bölmeleri ve istasyon hizmetleri.',
    ar: 'قفّاز تجفيف سيارات وبريّ، 100 في الكرتون. القفّاز يُبقي اليد خلف القماش، وهو ما يتيح لفنّي التلميع تتبّع انحناءة أو حافة باب أو خطّ زينة دون أن يفقد إمساكه بلوح مبلّل. يُشترى حيث يجري التجفيف يدوياً لا بالهواء المضغوط — في صالات التلميع وخدمات المحطات.',
  },
  'TM-752': {
    en: 'A large open-cell car wash sponge, 216 to the carton. Open cell carries a lot of foam and, more usefully, releases grit when rinsed rather than holding it against the next panel. Cheap enough to replace when it has been dropped, which is exactly what should happen to a wash sponge that has touched the ground.',
    tr: 'Büyük açık gözenekli oto yıkama süngeri, kolide 216 adet. Açık gözenek çok köpük taşır ve daha yararlısı, durulandığında kumu bir sonraki panele karşı tutmak yerine bırakır. Düşürüldüğünde değiştirilecek kadar ucuz — yere değmiş bir yıkama süngerine olması gereken tam olarak budur.',
    ar: 'إسفنجة غسيل سيارات كبيرة مفتوحة المسام، 216 في الكرتون. المسام المفتوحة تحمل رغوة وفيرة، والأنفع أنها تُطلق الحبيبات عند الشطف بدل أن تحتفظ بها لتحكّ اللوح التالي. ورخيصة بما يكفي لاستبدالها إذا سقطت، وهو تماماً ما ينبغي أن يحدث لإسفنجة غسيل لامست الأرض.',
  },

  // ── Floor cleaning ─────────────────────────────────────────────────────────
  'TM-087': {
    en: 'A 40 cm damp flat mop supplied with its frame, fifty to the carton. The entry-level of the flat-mop range: everything needed except the handle, so a buyer already stocking handles can add flat mopping to the range in one line. Flat mops cover more floor per pass than a string mop and use far less water, which is why contract cleaning moved to them.',
    tr: '40 cm mikro nemli düz mop, aparatıyla birlikte, kolide elli adet. Düz mop serisinin giriş seviyesi: sap dışında gereken her şey; sapı zaten stoklayan bir alıcı tek kalemle düz moplamayı seriye ekleyebilir. Düz moplar paso başına daha çok zemin kapar ve çok daha az su kullanır — sözleşmeli temizliğin bunlara geçmesinin sebebi budur.',
    ar: 'ممسحة مسطّحة رطبة بعرض 40 سم مع إطارها، خمسون في الكرتون. المستوى الأساسي من تشكيلة الممسحات المسطّحة: كل ما يلزم عدا العصا، فيستطيع مشترٍ يخزّن العصيّ أصلاً أن يضيف المسح المسطّح إلى تشكيلته بصنف واحد. والممسحات المسطّحة تغطّي مساحة أكبر لكل مسحة وتستهلك ماءً أقلّ بكثير، ولهذا انتقلت إليها شركات النظافة التعاقدية.',
  },
  'TM-170': {
    en: 'An almond-shaped mop head, fifty to the carton. The shape is the whole idea — a round mop leaves the corner of every room untouched and someone comes back with a cloth, while the almond point reaches into it on the same pass. Sold to housekeeping teams whose work is inspected at the edges.',
    tr: 'Badem formlu mop başlığı, kolide elli adet. Bütün fikir formdadır — yuvarlak mop her odanın köşesine dokunmadan geçer ve biri bezle geri döner; badem ucu ise aynı pasoda oraya uzanır. İşi kenarlardan denetlenen kat hizmetleri ekiplerine satılır.',
    ar: 'رأس ممسحة بشكل لوزي، خمسون في الكرتون. الشكل هو الفكرة كلها — فالممسحة المستديرة تترك زاوية كل غرفة دون لمس فيعود أحدهم إليها بقطعة قماش، أما الطرف اللوزي فيصل إليها في المسحة نفسها. تُباع لفرق التدبير الفندقي التي يُفتَّش عملها عند الحواف.',
  },
  'TM-078': {
    en: 'A towel-pile mop head on a spin joint, sixty to the carton. The joint lets the head lie flat at any angle, so it goes under furniture without the operator crouching to reposition it. Towel pile picks up more grit than a cord mop and washes clean afterwards, which suits floors that are swept and mopped in one action.',
    tr: 'Döner mafsallı havlu havlı mop başlığı, kolide altmış adet. Mafsal başlığın her açıda düz yatmasını sağlar; operatör yeniden konumlandırmak için eğilmeden mobilyanın altına girer. Havlu hav, ipli moptan daha çok kum toplar ve sonrasında temiz yıkanır — süpürme ve silmenin tek hareketle yapıldığı zeminlere uygundur.',
    ar: 'رأس ممسحة بوبر المناشف على مفصل دوّار، ستون في الكرتون. المفصل يتيح للرأس أن يستلقي مستوياً بأي زاوية، فيدخل تحت الأثاث دون أن ينحني العامل لإعادة توجيهه. ووبر المناشف يلتقط حبيبات أكثر مما تلتقطه الممسحة الخيطية ويُغسل نظيفاً بعدها، وهو ما يناسب الأرضيات التي تُكنس وتُمسح في حركة واحدة.',
  },
  'TM-175': {
    en: 'A deluxe corded spin-head mop, sixty to the carton. More yarn than the standard corded head, so it carries more water for larger floors and wetter work — and the spin joint still lets it lie flat. Positioned above the standard spin mop for buyers covering halls and corridors rather than rooms.',
    tr: 'Lüks ipli döner başlıklı mop, kolide altmış adet. Standart ipli başlıktan daha çok iplik; böylece daha büyük zeminler ve daha ıslak işler için daha çok su taşır — döner mafsal yine düz yatmasını sağlar. Oda değil hol ve koridor kapatan alıcılar için standart döner mopun üzerinde konumlanır.',
    ar: 'ممسحة فاخرة بخيوط ورأس دوّار، ستون في الكرتون. خيوط أكثر من الرأس الخيطي القياسي، فتحمل ماءً أوفر للأرضيات الأوسع والأعمال الأكثر بلَلاً — ويظلّ المفصل الدوّار يتيح لها الاستلقاء مستوية. تُوضع فوق الممسحة الدوّارة القياسية لمن يغطّي صالات وممرات لا غرفاً.',
  },
  'TM-764': {
    en: 'A standard corded mop head on a rotating joint, sixty to the carton, sold without the handle. The head-only format is what a facilities buyer wants: handles last for years and heads do not, so the reorder is one line and not two. Fits the same fitting as the rest of the spin range.',
    tr: 'Döner mafsallı standart ipli mop başlığı, kolide altmış adet, sapsız satılır. Yalnız başlık formatı bir tesis alıcısının istediği şeydir: saplar yıllarca dayanır, başlıklar dayanmaz; yeniden sipariş iki kalem değil tek kalem olur. Serinin geri kalanıyla aynı bağlantıya uyar.',
    ar: 'رأس ممسحة خيطي قياسي على مفصل دوّار، ستون في الكرتون، يُباع دون عصا. صيغة الرأس وحده هي ما يريده مسؤول المرافق: العصيّ تدوم سنوات والرؤوس لا تدوم، فتصبح إعادة الطلب صنفاً واحداً لا صنفين. ويناسب التركيب نفسه المستخدم في بقية التشكيلة الدوّارة.',
  },
  'TM-664': {
    en: 'An economy microfibre mop head, 100 to the carton. Microfibre picks up fine dust that a cord mop pushes around, and at this price it is replaced rather than laundered — which is often the right call for sites where mop hygiene is audited. Fits the standard bottle-thread handle used across this range.',
    tr: 'Ekonomik mikrofiber mop başlığı, kolide 100 adet. Mikrofiber, ipli mopun önünde ittiği ince tozu toplar; bu fiyatta ise yıkanmak yerine değiştirilir — mop hijyeninin denetlendiği sahalar için çoğu zaman doğru karar budur. Bu seride kullanılan standart şişe dişli sapa uyar.',
    ar: 'رأس ممسحة ميكروفايبر اقتصادي، 100 في الكرتون. الميكروفايبر يلتقط الغبار الناعم الذي تدفعه الممسحة الخيطية أمامها، وبهذا السعر يُستبدل بدل أن يُغسل — وهو غالباً القرار الصحيح في المواقع التي تخضع فيها نظافة الممسحات للتدقيق. ويناسب العصا القياسية ذات السنّ اللولبي المستخدمة في هذه التشكيلة.',
  },
  'TM-432': {
    en: 'A coloured welsoft mop head on a header card, 100 to the carton. The economy weight of the welsoft range, priced for high-street retail where the card does the selling. Welsoft takes up more water than cotton yarn and wrings out close to dry, so a floor is walkable sooner.',
    tr: 'Kartelalı renkli welsoft mop başlığı, kolide 100 adet. Welsoft serisinin ekonomik gramajı; kartelanın satışı yaptığı cadde perakendesi için fiyatlanmış. Welsoft pamuk ipliğinden daha çok su alır ve neredeyse kuruya kadar sıkılır, böylece zemin daha erken yürünebilir olur.',
    ar: 'رأس ممسحة ولسوفت ملوّن على بطاقة تعليق، 100 في الكرتون. الوزن الاقتصادي من تشكيلة الولسوفت، مسعّر لتجارة الشارع حيث تتولّى البطاقة البيع. والولسوفت يمتصّ ماءً أكثر من خيوط القطن ويُعصر حتى شبه الجفاف، فتصبح الأرضية صالحة للمشي أبكر.',
  },
  'TM-662': {
    en: 'A striped welsoft mop head, 100 to the carton, supplied without a card. The stripe is woven from two pile densities, which gives the head both a scrubbing and an absorbing face — useful on tiled floors where grout holds what a flat pile skates over. The bagged economy line of the welsoft range.',
    tr: 'Çizgili welsoft mop başlığı, kolide 100 adet, kartelasız. Çizgi iki farklı hav yoğunluğundan dokunur; bu da başlığa hem ovan hem emen bir yüz kazandırır — derzin, düz havın kayıp geçtiği şeyi tuttuğu fayans zeminlerde işe yarar. Welsoft serisinin poşetli ekonomik hattı.',
    ar: 'رأس ممسحة ولسوفت مخطّط، 100 في الكرتون، يُورَّد دون بطاقة. الخطوط منسوجة من كثافتَي وبر، ما يمنح الرأس وجهاً يفرك وآخر يمتصّ — وهو مفيد على الأرضيات المبلّطة حيث يحتجز المُلاط ما ينزلق عنه الوبر المستوي. وهو الخط الاقتصادي المعبّأ في أكياس من تشكيلة الولسوفت.',
  },
  'TM-155': {
    en: 'A wide-frame mop, forty to the carton. The extra width covers more floor per pass, which is the entire economics of cleaning a hall, corridor or showroom — fewer passes, less time, same result. The heaviest per unit of the mop range at 11.1 kg for forty, because the frame is doing real work.',
    tr: 'Geniş aparatlı mop, kolide kırk adet. Fazladan genişlik paso başına daha çok zemin kapar; bir holü, koridoru ya da showroom’u temizlemenin bütün ekonomisi budur — daha az paso, daha az zaman, aynı sonuç. Mop serisinin birim başına en ağırı: kırk adet için 11,1 kg, çünkü aparat gerçek iş yapıyor.',
    ar: 'ممسحة بإطار عريض، أربعون في الكرتون. العرض الإضافي يغطّي مساحة أكبر لكل مسحة، وهذا هو اقتصاد تنظيف صالة أو ممرّ أو صالة عرض بأكمله — مسحات أقل، ووقت أقل، والنتيجة نفسها. وهي الأثقل للوحدة في تشكيلة الممسحات بوزن 11.1 كجم لأربعين قطعة، لأن الإطار يؤدّي عملاً حقيقياً.',
  },
  'TM-145': {
    en: 'A twisted cotton-blend cord mop, sixty to the carton. The traditional wet mop, and still the right tool for a rough or uneven hard floor where a flat pad bridges the dips and misses them. Cotton blend holds a lot of water, so it is a mop for washing a floor rather than damp-wiping it.',
    tr: 'Bükümlü pamuk karışımı ipli mop, kolide altmış adet. Geleneksel ıslak mop ve düz pedin çukurları köprüleyip atladığı pürüzlü veya düzgün olmayan sert zeminlerde hâlâ doğru alet. Pamuk karışımı çok su tutar; yani nemli silmek için değil, zemin yıkamak için bir mop.',
    ar: 'ممسحة خيطية مبرومة من خليط قطني، ستون في الكرتون. الممسحة المبلّلة التقليدية، ولا تزال الأداة الصحيحة للأرضيات الصلبة الخشنة أو غير المستوية حيث يعبر اللوح المسطّح فوق المنخفضات فيتجاوزها. والخليط القطني يحتجز ماءً كثيراً، فهي ممسحة لغسل الأرضية لا لمسحها مسحاً رطباً.',
  },
  'TM-148': {
    en: 'A jumbo cord mop, fifty to the carton. More yarn again than the standard cord head — bought for warehouses, workshops and wet areas where the job is moving water rather than polishing a surface. At 12.24 kg per carton of fifty, the weight is all in the head.',
    tr: 'Jumbo ipli mop, kolide elli adet. Standart ipli başlıktan yine daha çok iplik — işin bir yüzeyi parlatmak değil su taşımak olduğu depolar, atölyeler ve ıslak alanlar için alınır. Elli adetlik koli 12,24 kg; ağırlığın tamamı başlıkta.',
    ar: 'ممسحة خيطية جامبو، خمسون في الكرتون. خيوط أكثر مجدّداً من الرأس الخيطي القياسي — تُشترى للمستودعات والورش والمناطق الرطبة حيث تكون المهمة تحريك الماء لا تلميع سطح. وكرتون الخمسين يزن 12.24 كجم، والوزن كله في الرأس.',
  },
  'TM-482': {
    en: 'A looped strip mop in 40, 50 and 60 cm widths, 150 to the carton. Looped strips rather than cut yarn means nothing sheds onto the floor being cleaned, which is why this is the head used in food premises and hospitals. The three widths match standard frame sizes, so a site can run one head type across every trolley.',
    tr: '40, 50 ve 60 cm genişliklerde makarna mop, kolide 150 adet. Kesik iplik yerine ilmekli şerit, temizlenen zemine hiçbir şey dökülmemesi demektir; bu başlığın gıda işletmelerinde ve hastanelerde kullanılmasının sebebi budur. Üç genişlik standart aparat ölçülerine denk gelir, böylece bir saha her arabada tek başlık tipi çalıştırabilir.',
    ar: 'ممسحة بشرائح حلقية بعروض 40 و50 و60 سم، 150 في الكرتون. الشرائح الحلقية بدل الخيوط المقصوصة تعني ألّا يتساقط شيء على الأرضية التي تُنظَّف، ولهذا يُستخدم هذا الرأس في منشآت الأغذية والمستشفيات. والعروض الثلاثة تطابق مقاسات الإطارات القياسية، فيُشغّل الموقع نوع رأس واحداً على كل عربة.',
  },
  'TM-680': {
    en: 'A clamp mop set without a handle, fifty to the carton. The plate and refill together — squeeze the lever and the pad releases, so a soiled pad goes into the wash without being touched. Sold handle-less because the buyer usually has handles and needs the mechanism.',
    tr: 'Sapsız mandallı mop seti, kolide elli adet. Plaka ve yedeği birlikte — kola bastırınca ped serbest kalır, böylece kirli ped ele değmeden yıkamaya gider. Sapsız satılır, çünkü alıcının genelde sapı vardır, ihtiyacı olan mekanizmadır.',
    ar: 'طقم ممسحة بمشبك دون عصا، خمسون في الكرتون. القاعدة مع اللوح معاً — تضغط الذراع فيتحرّر اللوح، فتذهب القطعة المتّسخة إلى الغسيل دون أن تُلمس باليد. ويُباع دون عصا لأن المشتري يملك العصيّ عادةً وما يحتاجه هو الآلية.',
  },
  'TM-250': {
    en: 'Replacement pads for the clamp mop, two to a pack and 120 packs per carton. Machine washable and colour-fast, which matters when pads are laundered daily and a faded pad looks like a dirty one. The consumable half of the clamp system — most buyers order these several times per plate.',
    tr: 'Mandallı mop için yedek pedler, pakette iki adet, kolide 120 paket. Makinede yıkanabilir ve rengi solmaz; pedlerin her gün yıkandığı ve solmuş bir pedin kirli göründüğü yerde bu önemlidir. Mandal sisteminin sarf yarısı — çoğu alıcı plaka başına bunlardan defalarca sipariş eder.',
    ar: 'ألواح بديلة لممسحة المشبك، لوحان في العبوة و120 عبوة في الكرتون. قابلة للغسل بالغسالة وثابتة اللون، وهذا مهم حيث تُغسل الألواح يومياً ويبدو اللوح الباهت وكأنه متّسخ. وهي النصف الاستهلاكي من نظام المشبك — ويطلبها معظم المشترين عدّة مرات لكل قاعدة.',
  },
  'TM-088': {
    en: 'A damp flat mop with its frame in 40, 50 and 60 cm, fifty to the carton. The complete unit rather than a refill: frame, pad and fitting, ready for a handle. Three widths so a cleaning contractor can match frame size to the site instead of carrying one compromise size everywhere.',
    tr: '40, 50 ve 60 cm’de aparatıyla mikro nemli düz mop, kolide elli adet. Yedek değil komple ünite: aparat, ped ve bağlantı, sapa hazır. Üç genişlik, böylece temizlik müteahhidi her yere tek bir uzlaşma ölçüsü taşımak yerine aparat boyunu sahaya göre seçer.',
    ar: 'ممسحة مسطّحة رطبة مع إطارها بعروض 40 و50 و60 سم، خمسون في الكرتون. الوحدة الكاملة لا اللوح البديل: إطار ولوح وتركيب، جاهزة للعصا. ثلاثة عروض تتيح لمقاول النظافة مطابقة مقاس الإطار مع الموقع بدل حمل مقاس وسط واحد إلى كل مكان.',
  },
  'TM-084': {
    en: 'Damp mop pads from 25 cm to 80 cm, twenty-five to a pack and 300 per carton. The refill line for the flat-mop system, in five widths — 25 cm for washrooms and stairwells, 80 cm for open floor. Twenty-five to a pack matches how contract cleaners stock a trolley: one pack per site visit, one pad per room.',
    tr: '25 cm’den 80 cm’ye mikro nemli mop pedleri, pakette yirmi beş adet, kolide 300 adet. Düz mop sisteminin yedek hattı, beş genişlikte — lavabo ve merdiven boşlukları için 25 cm, açık zemin için 80 cm. Pakette yirmi beş adet, sözleşmeli temizlikçilerin arabayı nasıl stokladığına denk gelir: saha ziyareti başına bir paket, oda başına bir ped.',
    ar: 'ألواح ممسحة رطبة من 25 سم إلى 80 سم، خمسة وعشرون في العبوة و300 في الكرتون. خط الألواح البديلة لنظام الممسحة المسطّحة بخمسة عروض — 25 سم لدورات المياه وبيوت الدرج، و80 سم للأرضيات المفتوحة. وخمسة وعشرون في العبوة تطابق طريقة تجهيز شركات النظافة لعرباتها: عبوة لكل زيارة موقع، ولوح لكل غرفة.',
  },
  'TM-778': {
    en: 'A three-piece microfibre spin mop set, twenty-five to the carton. Telescopic handle, spin head and microfibre pad in one box — the complete mop, which is what a retailer needs when the customer has nothing already. The only set here that ships with a handle, which is why the carton holds twenty-five rather than a hundred.',
    tr: 'Üç parçalı mikrofiber döner mop seti, kolide yirmi beş adet. Teleskopik sap, döner başlık ve mikrofiber ped tek kutuda — yani komple mop; müşterinin elinde hiçbir şey yokken perakendecinin ihtiyacı olan şey. Buradaki sapla gelen tek set; kolinin yüz değil yirmi beş almasının sebebi de budur.',
    ar: 'طقم ممسحة دوّارة ميكروفايبر من ثلاث قطع، خمسة وعشرون في الكرتون. عصا تلسكوبية ورأس دوّار ولوح ميكروفايبر في علبة واحدة — أي الممسحة كاملة، وهو ما يحتاجه تاجر التجزئة حين لا يملك الزبون شيئاً أصلاً. وهو الطقم الوحيد هنا الذي يُشحن مع عصا، ولهذا يسع الكرتون خمسة وعشرين لا مائة.',
  },
  'TM-665': {
    en: 'A deluxe microfibre mop head, sixty to the carton. Long-pile microfibre traps fine dust as effectively dry as it mops wet, so one head does the sweep and the wash. The step-up from the economy microfibre head, with noticeably more fibre — 10.65 kg per sixty against 10.5 kg per hundred.',
    tr: 'Lüks mikrofiber mop başlığı, kolide altmış adet. Uzun havlı mikrofiber ince tozu kuruyken ıslakken sildiği kadar etkili tutar; tek başlık hem süpürmeyi hem yıkamayı yapar. Ekonomik mikrofiber başlığın bir üst basamağı, gözle görülür biçimde daha fazla lifle — altmış adet için 10,65 kg’a karşılık yüz adet için 10,5 kg.',
    ar: 'رأس ممسحة ميكروفايبر فاخر، ستون في الكرتون. الميكروفايبر طويل الوبر يحتجز الغبار الناعم جافّاً بفعالية مسحه رطباً، فيؤدّي رأس واحد الكنس والغسل معاً. وهو الدرجة الأعلى من الرأس الاقتصادي بألياف أوفر بوضوح: 10.65 كجم لستين قطعة مقابل 10.5 كجم لمائة.',
  },
  'TM-435': {
    en: 'A standard microfibre mop head in assorted colours, 100 to the carton. The middle of the microfibre range: more fibre than the economy head, no premium price, and the colour mix lets a site colour-code by floor or department. Bottle-thread fitting, like the rest of the range.',
    tr: 'Karışık renkli standart mikrofiber mop başlığı, kolide 100 adet. Mikrofiber serisinin ortası: ekonomik başlıktan daha çok lif, premium fiyat yok ve renk karışımı sahanın kata ya da departmana göre renk kodlaması yapmasını sağlıyor. Serinin geri kalanı gibi şişe dişli bağlantı.',
    ar: 'رأس ممسحة ميكروفايبر قياسي بألوان متنوعة، 100 في الكرتون. وسط تشكيلة الميكروفايبر: ألياف أكثر من الرأس الاقتصادي، دون سعر الفئة الفاخرة، وتنوّع الألوان يتيح للموقع ترميز الطوابق أو الأقسام لونياً. وتركيبه لولبي كبقية التشكيلة.',
  },
  'TM-550': {
    en: 'A plastic flat mop frame from 25 cm to 80 cm, fifty to the carton. Velcro face and a jointed handle socket, so the frame swivels flat under furniture instead of stopping at the skirting board. Sold separately from pads because frames outlast pads many times over — five widths, one fitting.',
    tr: '25 cm’den 80 cm’ye plastik düz mop aparatı, kolide elli adet. Cırt cırtlı yüz ve mafsallı sap yuvası; aparat süpürgelikte durmak yerine mobilyanın altında düz dönüyor. Pedlerden ayrı satılır, çünkü aparatlar pedlerden kat kat uzun ömürlüdür — beş genişlik, tek bağlantı.',
    ar: 'إطار ممسحة مسطّحة بلاستيكي من 25 سم إلى 80 سم، خمسون في الكرتون. وجه لاصق ومقبس عصا مفصلي، فيدور الإطار مستوياً تحت الأثاث بدل أن يتوقّف عند وزرة الجدار. ويُباع منفصلاً عن الألواح لأن الإطارات تعمّر أضعاف عمر الألواح — خمسة عروض وتركيب واحد.',
  },
  'TM-471': {
    en: 'A replacement microfibre pad for spray mops, 300 to the carton. Washable and reusable rather than disposable, which is the argument for a spray mop over a wipe system in the first place. The highest carton count in floor cleaning, because a pad is changed per room.',
    tr: 'Sprey moplar için yedek mikrofiber ped, kolide 300 adet. Tek kullanımlık değil yıkanabilir ve tekrar kullanılabilir; sprey mopu bir silme sistemine tercih etmenin asıl gerekçesi zaten budur. Zemin temizliğinin koli başına en yüksek adedi, çünkü ped oda başına değiştirilir.',
    ar: 'لوح ميكروفايبر بديل لممسحات الرشّ، 300 في الكرتون. قابل للغسل وإعادة الاستعمال بدل أن يكون للاستعمال مرة واحدة، وهذه أصلاً هي حجّة تفضيل ممسحة الرشّ على نظام المناديل. وهو أعلى عدد في الكرتون ضمن فئة تنظيف الأرضيات، لأن اللوح يُبدَّل لكل غرفة.',
  },
  'TM-470': {
    en: 'A single replacement pad for tablet-style flat mops, 300 to the carton. Sold as singles rather than packs so a buyer orders exactly what a site consumes, which for a busy floor is more pads than anyone estimates. Fits the standard tablet plate used across the flat-mop range.',
    tr: 'Tablet tipi düz moplar için tekli yedek ped, kolide 300 adet. Paket yerine tek tek satılır, böylece alıcı sahanın tükettiği kadarını sipariş eder — yoğun bir zemin için bu, herkesin tahmininden fazla peddir. Düz mop serisinde kullanılan standart tablet plakasına uyar.',
    ar: 'لوح بديل مفرد لممسحات التابلت المسطّحة، 300 في الكرتون. يُباع مفرداً لا في عبوات، فيطلب المشتري ما يستهلكه الموقع بالضبط — وهو للأرضيات المزدحمة عدد ألواح أكبر مما يقدّره أحد. ويناسب قاعدة التابلت القياسية المستخدمة في تشكيلة الممسحات المسطّحة.',
  },
  'TM-165': {
    en: 'A large floor cloth, 50 × 70 cm, 144 to the carton. For spills, stairs and the edges a mop cannot reach — the cloth that gets used on hands and knees when something has gone wrong. Big enough to contain a spill rather than spread it, and cheap enough that nobody hesitates to use one.',
    tr: 'Büyük yer bezi, 50 × 70 cm, kolide 144 adet. Dökülmeler, merdivenler ve mopun ulaşamadığı kenarlar için — bir şeyler ters gittiğinde diz çökülerek kullanılan bez. Bir dökülmeyi yaymak yerine içine alacak kadar büyük ve kimsenin kullanmaya çekinmeyeceği kadar ucuz.',
    ar: 'قطعة أرضية كبيرة بمقاس 50 × 70 سم، 144 في الكرتون. للانسكابات والسلالم والحواف التي لا تصلها الممسحة — القطعة التي تُستعمل على الركبتين حين يقع خطب ما. كبيرة بما يكفي لاحتواء انسكاب بدل نشره، ورخيصة بما يكفي ألّا يتردّد أحد في استعمال واحدة.',
  },
  'TM-076': {
    en: 'A welsoft mop head on a header card, sixty to the carton in five shelf colours. Welsoft pile takes up more water than cotton yarn and wrings out close to dry, so floors are walkable sooner — the reason it has largely replaced string mops in Turkish retail. The card is sized for peg display without repacking, and it fits any standard bottle-thread handle, so heads and handles can be stocked independently.',
    tr: 'Kartelalı welsoft mop başlığı, kolide altmış adet, beş raf renginde. Welsoft hav pamuk ipliğinden daha çok su alır ve neredeyse kuruya kadar sıkılır; zeminler daha erken yürünebilir olur — Türk perakendesinde ip mopların yerini büyük ölçüde almasının sebebi budur. Kartela, yeniden paketlemeden askı teşhirine göre ölçülendirilmiştir ve her standart şişe dişli sapa uyar, böylece başlıklarla saplar birbirinden bağımsız stoklanabilir.',
    ar: 'رأس ممسحة ولسوفت على بطاقة تعليق، ستون في الكرتون بخمسة ألوان للرفّ. وبر الولسوفت يمتصّ ماءً أكثر من خيوط القطن ويُعصر حتى شبه الجفاف، فتصبح الأرضيات صالحة للمشي أبكر — وهذا سبب إحلاله محلّ الممسحات الخيطية إلى حدّ بعيد في تجارة التجزئة التركية. والبطاقة بمقاس العرض المعلّق دون إعادة تعبئة، ويناسب الرأس أي عصا قياسية بسنّ لولبي، فتُخزَّن الرؤوس والعصيّ كلٌّ على حدة.',
  },
  'TM-075': {
    en: 'The same coloured welsoft head supplied bagged rather than carded, sixty to the carton. Dropping the card takes cost and packaging out for buyers who sell from a bin or refill a bulk display, and it ships in the same carton weight. Identical head, cheaper presentation.',
    tr: 'Aynı renkli welsoft başlık, kartelalı değil poşetli, kolide altmış adet. Kartelanın kalkması, bir sepetten satan ya da dökme teşhir dolduran alıcılar için maliyet ve ambalaj çıkarır; koli ağırlığı da aynı kalır. Birebir aynı başlık, daha ucuz sunum.',
    ar: 'رأس الولسوفت الملوّن ذاته لكن معبّأ في كيس بدل البطاقة، ستون في الكرتون. إسقاط البطاقة يزيل تكلفة وتغليفاً لمن يبيع من صندوق مكشوف أو يعيد ملء عرض سائب، ويبقى وزن الكرتون كما هو. الرأس نفسه بعرضٍ أرخص.',
  },
  'TM-430': {
    en: 'A striped welsoft mop head on a header card, sixty to the carton. The stripe is two pile densities woven together, giving one face that scrubs and one that absorbs — the carded, retail version of the striped welsoft head. Holds water without dripping across a shop floor between bucket and mop.',
    tr: 'Kartelalı çizgili welsoft mop başlığı, kolide altmış adet. Çizgi, birlikte dokunmuş iki hav yoğunluğudur; bir yüz ovar, diğeri emer — çizgili welsoft başlığın kartelalı perakende versiyonu. Kova ile mop arasında dükkân zeminine damlatmadan su tutar.',
    ar: 'رأس ممسحة ولسوفت مخطّط على بطاقة تعليق، ستون في الكرتون. الخطوط كثافتا وبر منسوجتان معاً، فوجه يفرك ووجه يمتصّ — وهي نسخة التجزئة المبطّقة من رأس الولسوفت المخطّط. ويحتجز الماء دون أن يقطر على أرضية المحل بين الدلو والممسحة.',
  },
};
