/*
 * wordlist.js — bundled attack data (no network calls, all offline).
 *
 * COMMON_PASSWORDS: ordered roughly by real-world frequency (rockyou/HIBP-flavoured, SFW).
 *   Used by the "dictionary sweep" stage — a straight-up guess of the whole password.
 * BASE_WORDS: names + words used to detect the "root" of a password (e.g. the "hunter" in
 *   "hunter22"). Deliberately international to reflect Roehampton's intake — heaviest on
 *   UK / US / India, then Pakistan, Bangladesh, Nigeria, Nepal, China and beyond. The list is
 *   assembled from the commented category arrays below, then normalised + de-duplicated at load.
 * COMMON_SUFFIXES: what people bolt onto a base word. Ordered by how often crackers try them.
 *
 * Everything is attached to window.CrackData so it works from a plain <script> tag
 * (no ES modules => no file:// CORS headaches; double-clicking index.html just works).
 */
(function (global) {
	"use strict";

	// Lowercase, trim, drop blanks / too-short entries, de-duplicate (order preserved).
	function normalise(arr, minLen) {
		var seen = Object.create(null),
			out = [];
		for (var i = 0; i < arr.length; i++) {
			var w = String(arr[i]).toLowerCase().trim();
			if (!w) continue;
			if (minLen && w.length < minLen) continue;
			if (seen[w]) continue;
			seen[w] = 1;
			out.push(w);
		}
		return out;
	}

	// ---- COMMON_PASSWORDS — the genuinely most-leaked passwords, kept family-friendly ----
	// prettier-ignore
	var RAW_PASSWORDS = [
    "123456", "password", "123456789", "12345678", "12345", "qwerty", "1234567",
    "111111", "1234567890", "123123", "abc123", "1234", "password1", "iloveyou",
    "000000", "qwerty123", "1q2w3e4r", "admin", "letmein", "welcome", "monkey",
    "dragon", "football", "sunshine", "princess", "654321", "superman", "qazwsx",
    "master", "hello", "freedom", "whatever", "trustno1", "batman", "passw0rd",
    "zaq12wsx", "michael", "shadow", "ninja", "mustang", "password123", "baseball",
    "starwars", "computer", "michelle", "jessica", "pepper", "daniel", "access",
    "hunter", "hunter2", "hottie", "loveme", "flower", "hello123", "charlie",
    "matrix", "secret", "summer", "internet", "service", "canada", "hockey",
    "ranger", "buster", "thomas", "robert", "soccer", "killer", "george", "andrew",
    "tigger", "joshua", "cookie", "amanda", "maggie", "ashley", "chelsea",
    "matthew", "banana", "jordan23", "harley", "jennifer", "hannah", "purple",
    "orange", "chicken", "monster", "liverpool", "arsenal", "chelsea1", "changeme",
    "qwertyuiop", "asdfghjkl", "zxcvbnm", "iloveyou1", "abcd1234", "aa123456",
    "test", "guest", "root", "admin123", "welcome1", "login", "121212", "112233",
    "123321", "666666", "888888", "777777", "555555", "222222", "333333", "444444",
    "999999", "101010", "142536", "159753", "147258369", "789456123", "987654321",
    "123456a", "123abc", "a123456", "1qaz2wsx", "qwe123", "asd123", "zxc123",
    "1q2w3e", "1q2w3e4r5t", "q1w2e3r4", "password12", "password1234", "p@ssword",
    "p@ssw0rd", "passw0rd1", "iloveyou2", "loveyou", "lovely", "sweety", "sweetie",
    "angel", "angel1", "angels", "babygirl", "babyboy", "iloveu", "myspace1",
    "blink182", "metallica", "slipknot", "nirvana", "greenday", "pokemon", "naruto",
    "minecraft", "fortnite", "roblox", "gamer", "gaming", "xbox", "playstation",
    "fifa", "call0fduty", "sonic", "mario", "zelda", "pikachu", "charizard",
    "superman1", "batman1", "spiderman", "ironman", "captain", "avengers", "thor",
    "hulk", "joker", "gotham", "krypton", "wolverine", "deadpool", "loki",
    "manchester", "chelseafc", "gunners", "cityzens", "united1", "barcelona",
    "realmadrid", "juventus", "ronaldo", "messi", "neymar", "cr7", "kohli", "dhoni",
    "sachin", "cricket", "cricket1", "india123", "jaimatadi", "jaishreeram",
    "krishna", "krishna1", "radhe", "ganesh", "ganpati", "shivshankar", "omnamah",
    "hanuman", "sairam", "saibaba", "swaminarayan", "waheguru", "satnam", "allah",
    "allah123", "mashallah", "bismillah", "muhammad", "muhammad1", "ahmed", "ali123",
    "khan", "khan123", "pakistan", "pakistan1", "imran", "bangladesh", "dhaka",
    "naija", "nigeria", "lagos", "chinedu", "blessing", "goodluck", "emmanuel",
    "chelsea123", "abcdef", "abcdefg", "abcabc", "123qwe", "qweasd", "asdfgh",
    "asdf1234", "1234abcd", "michael1", "jordan", "michael123", "jordan1",
    "buster1", "snoopy", "garfield", "maverick", "iceman", "goose", "phoenix",
    "phoenix1", "diamond", "diamond1", "platinum", "gold123", "silver", "ruby",
    "emerald", "jasmine", "jasmine1", "lily", "rose", "daisy", "poppy", "violet",
    "sophie", "sophia", "olivia", "emma", "ava", "mia", "isla", "amelia", "aria",
    "chloe", "grace", "lucy", "ella", "freya", "willow", "ivy", "florence",
    "liam", "noah", "oliver", "elijah", "james", "william", "benjamin", "lucas",
    "henry", "alexander", "mason", "ethan", "logan", "jackson", "leo", "harry",
    "jack", "charlie1", "oscar", "george1", "arthur", "archie", "theo", "freddie",
    "welcome123", "welcome12", "admin1", "administrator", "system", "manager",
    "office", "company", "business", "student", "school", "college", "teacher",
    "nurse", "doctor", "police", "army", "soldier", "captain1", "sergeant",
    "summer1", "winter", "spring", "autumn", "sunny", "rainbow", "snowball",
    "chocolate", "vanilla", "cupcake", "muffin", "biscuit", "coffee", "cookie1",
    "peanut", "butterfly", "ladybug", "dolphin", "penguin", "panda", "koala",
    "tiger1", "lion", "leo1", "bear", "teddy", "puppy", "kitty", "bunny", "hamster",
    "gizmo", "simba", "nala", "bella", "bella1", "max", "maxx", "rocky", "buddy",
    "charlie123", "cooper", "milo", "toby", "oscar1", "lucky", "shadow1", "smokey",
    "midnight", "starlight", "moonlight", "sunshine1", "daydream", "sweetpea",
    "honey", "sugar", "candy", "cherry", "berry", "apple", "apple123", "mango",
    "banana1", "orange1", "grape", "melon", "lemon", "peach", "kiwi", "coconut",
    "pineapple", "strawberry", "blueberry", "raspberry", "watermelon", "avocado",
    "pizza", "burger", "hotdog", "pasta", "noodles", "sushi", "tacos", "nachos",
    "chips", "fries", "donut", "waffle", "pancake", "bacon", "cheese", "nutella",
    "biryani", "samosa", "curry", "masala", "paneer", "chai", "jollof", "suya",
    "egusi", "fufu", "plantain", "ramen", "dumpling", "kimchi", "bubbletea",
    "london", "london1", "england", "britain", "manchester1", "liverpool1",
    "birmingham", "leeds", "glasgow", "cardiff", "bristol", "newyork", "california",
    "texas", "florida", "chicago", "boston", "vegas", "hollywood", "america",
    "mumbai", "delhi", "kolkata", "chennai", "bangalore", "hyderabad", "punjab",
    "gujarat", "kerala", "karachi", "lahore", "islamabad", "kathmandu", "nepal",
    "everest", "beijing", "shanghai", "tokyo", "seoul", "dubai", "paris", "berlin",
    "madrid", "rome", "amsterdam", "sydney", "toronto", "lagos1", "abuja",
    "superstar", "rockstar", "champion", "champion1", "winner", "legend", "legend1",
    "boss", "boss123", "king", "kingkong", "queen", "prince", "princess1",
    "warrior", "warrior1", "hunter123", "predator", "assassin", "ninja1", "samurai",
    "dragon1", "dragon123", "dragonball", "goku", "vegeta", "onepiece", "luffy",
    "anime", "otaku", "senpai", "kawaii", "sakura", "hinata", "itachi", "sasuke",
    "harrypotter", "hogwarts", "gryffindor", "dumbledore", "voldemort", "hermione",
    "gandalf", "frodo", "aragorn", "legolas", "starlord", "groot", "yoda", "vader",
    "skywalker", "jedi", "sith", "r2d2", "chewbacca", "obiwan", "kenobi",
    "letmein1", "opensesame", "trustme", "believe", "dream", "dreamer", "hope",
    "faith", "grace1", "blessed", "blessing1", "miracle", "destiny", "angelica",
    "forever", "forever1", "always", "loveislove", "bestfriend", "friends",
    "family", "family1", "mother", "father", "brother", "sister", "grandma",
    "monkey1", "monkey123", "donkey", "elephant", "giraffe", "cheetah", "leopard",
    "jaguar", "cougar", "falcon", "eagle", "hawk", "raven", "sparrow", "robin",
    "phoenix123", "unicorn", "pegasus", "griffin", "hydra", "kraken", "medusa",
    "zeus", "apollo", "athena", "hercules", "poseidon", "hades", "odin", "loki1",
    "thorhammer", "valhalla", "viking", "spartan", "gladiator", "trojan", "titan",
    "galaxy", "cosmos", "nebula", "comet", "meteor", "saturn", "jupiter", "mars",
    "venus", "mercury", "neptune", "pluto", "orbit", "rocket", "astronaut",
    "chelsea2", "arsenal1", "spurs", "tottenham", "everton", "newcastle", "villa",
    "leeds1", "rangers", "celtic", "barca", "psg", "bayern", "dortmund", "milan",
    "inter", "napoli", "roma", "ajax", "porto", "benfica", "atletico"
  ];

	// ---- BASE_WORDS — assembled from category arrays, then normalised + de-duped ----

	// prettier-ignore
	var NAMES_UK_US = [
    // UK / US given names (both), commonest first
    "james","john","robert","michael","william","david","richard","joseph","thomas",
    "charles","daniel","matthew","anthony","mark","donald","steven","andrew","paul",
    "joshua","kenneth","kevin","brian","george","edward","ronald","timothy","jason",
    "jeffrey","ryan","jacob","gary","nicholas","eric","stephen","jonathan","larry",
    "justin","scott","brandon","frank","benjamin","gregory","samuel","raymond",
    "patrick","alexander","jack","dennis","jerry","tyler","aaron","henry","harry",
    "oliver","charlie","noah","jacob","leo","freddie","archie","theo","oscar",
    "alfie","arthur","logan","hugo","max","mason","harrison","ethan","lucas",
    "mary","patricia","jennifer","linda","elizabeth","barbara","susan","jessica",
    "sarah","karen","nancy","lisa","betty","margaret","sandra","ashley","kimberly",
    "emily","donna","michelle","carol","amanda","dorothy","melissa","deborah",
    "stephanie","rebecca","laura","sharon","cynthia","kathleen","amy","olivia",
    "amelia","isla","ava","mia","sophia","grace","lily","freya","emma","charlotte",
    "sophie","chloe","ella","poppy","isabella","evie","scarlett","ruby","alice",
    "florence","daisy","rose","phoebe","holly","lucy","hannah","katie","megan",
    "abigail","molly","jasmine","zoe","bella","willow","ivy","maya",
    // common surnames
    "smith","johnson","williams","brown","jones","garcia","miller","davis","wilson",
    "taylor","anderson","thomas","jackson","white","harris","martin","thompson",
    "walker","robinson","clark","lewis","hall","young","king","wright","scott",
    "green","baker","adams","murphy","cooper","richardson","cox","ward","turner",
    "morgan","cook","rogers","evans","edwards","collins","stewart","morris","murray"
  ];

	// prettier-ignore
	var NAMES_INDIA = [
    "aarav","vivaan","aditya","arjun","reyansh","krishna","ishaan","shaurya","kabir",
    "ayaan","rudra","rohan","aryan","vihaan","atharv","advait","dhruv","kartik",
    "raj","ravi","rahul","rohit","amit","anil","sunil","vijay","vikram","sanjay",
    "manish","deepak","ashok","suresh","ramesh","mahesh","naresh","dinesh","rakesh",
    "prakash","gaurav","nikhil","varun","siddharth","aakash","abhishek","ankit",
    "ram","shyam","hari","gopal","govind","shiva","ganesh","hanuman","balaji","sai",
    "ananya","aadhya","diya","saanvi","aarohi","ishita","priya","riya","neha","pooja",
    "anjali","divya","shreya","sneha","kavya","ishaani","meera","radha","sita","gita",
    "lakshmi","saraswati","parvati","durga","kali","anaya","myra","kiara","navya",
    "sharma","verma","gupta","singh","kumar","patel","reddy","rao","nair","menon",
    "iyer","chopra","kapoor","khanna","malhotra","joshi","desai","mehta","shah",
    "agarwal","bansal","mishra","tiwari","yadav","chauhan","pandey","bhatt","das",
    "bollywood","shahrukh","salman","aamir","amitabh","ranveer","deepika","alia",
    "namaste","namaskar","jaihind","vandemataram","incredibleindia"
  ];

	// prettier-ignore
	var NAMES_MUSLIM = [
    // widely used across Pakistan, Bangladesh, the Middle East and diaspora
    "muhammad","mohammed","ahmed","ahmad","ali","hassan","hussain","hamza","bilal",
    "usman","umar","omar","ibrahim","ismail","yusuf","yousuf","zaid","zayn","tariq",
    "farhan","imran","kamran","salman","adnan","rizwan","faisal","asif","nasir",
    "shahid","waqar","junaid","saad","abdullah","abdul","rahman","rehman","khalid",
    "fatima","ayesha","aisha","zainab","maryam","khadija","amina","hafsa","sana",
    "sadia","nadia","mahnoor","laiba","hira","iqra","noor","sara","zara","alina",
    "khan","malik","chaudhry","sheikh","siddiqui","ansari","qureshi","butt","raja",
    "islam","muslim","masjid","quran","ramadan","ramzan","eid","eidmubarak","salaam",
    "inshallah","mashallah","alhamdulillah","bismillah","subhanallah","jannah"
  ];

	// prettier-ignore
	var NAMES_AFRICA = [
    // Nigeria (Yoruba/Igbo/Hausa) + broader West/East Africa
    "chidi","chioma","chinedu","chukwu","emeka","ngozi","nneka","adaeze","obinna",
    "ifeoma","uche","kelechi","chinonso","ebube","somto","tobi","tunde","femi",
    "bola","bisi","segun","kunle","yemi","seun","ade","adewale","adeola","ayodele",
    "oluwaseun","oluwatobi","temitope","damilola","folake","funke","kemi","sade",
    "emmanuel","blessing","goodluck","precious","favour","gift","peace","promise",
    "kwame","kofi","ama","abena","amara","zola","thabo","naledi","kagiso","lerato",
    "naija","lagos","abuja","nollywood","afrobeats","jollof","suya","wakanda"
  ];

	// prettier-ignore
	var NAMES_NEPAL = [
    "bibek","prakash","suresh","anish","sagar","bishal","nabin","sujan","rajesh",
    "deepak","sunita","sarita","gita","puja","anjali","sabina","asmita","rojina",
    "sunita","namaste","himalaya","everest","sagarmatha","kathmandu","pokhara",
    "gurung","tamang","shrestha","thapa","rai","limbu","magar","adhikari","poudel"
  ];

	// prettier-ignore
	var NAMES_CHINA = [
    // common given names + pinyin words + surnames
    "wei","jun","ming","hui","jing","lei","yang","tao","fang","min","na","xin",
    "yan","ling","hong","feng","juan","ping","gang","bin","chao","peng","yu","qi",
    "xiaoming","xiaohong","jiahao","zihan","yuhan","haoran","yiran","zixuan",
    "wang","li","zhang","liu","chen","yang","huang","zhao","wu","zhou","xu","sun",
    "beijing","shanghai","dragon","panda","kungfu","mandarin","nihao","gongxi"
  ];

	// prettier-ignore
	var NAMES_INTL = [
    // Hispanic / European / SE Asian / Arab world — broad international spread
    "jose","juan","carlos","luis","miguel","antonio","francisco","javier","diego",
    "manuel","pedro","pablo","alejandro","fernando","ricardo","sofia","maria","lucia",
    "valentina","camila","isabella","gabriela","carmen","elena","paula","andrea",
    "mateo","santiago","sebastian","nicolas","thiago","hyun","jin","min","seo","kim",
    "lee","park","nguyen","tran","minh","linh","anh","huong","ahmad","yara","layla",
    "omar","rami","karim","hana","lena","anna","sofia","natalia","katarzyna","piotr",
    "ivan","dmitri","olga","luca","marco","giulia","sofia","matteo","hans","greta"
  ];

	// prettier-ignore
	var POP_CULTURE = [
    // gaming, film, music, tv the crowd will recognise
    "pokemon","pikachu","charizard","minecraft","fortnite","roblox","mario","luigi",
    "sonic","zelda","link","kirby","metroid","fifa","gta","callofduty","valorant",
    "leagueoflegends","overwatch","fallguys","amongus","terraria","skyrim","witcher",
    "naruto","sasuke","itachi","goku","vegeta","luffy","zoro","ichigo","tanjiro",
    "eren","levi","gojo","anime","manga","otaku","senpai","kawaii","sakura","hinata",
    "marvel","avengers","ironman","spiderman","batman","superman","hulk","thor",
    "loki","joker","venom","deadpool","wolverine","captain","wakanda","thanos",
    "starwars","jedi","sith","yoda","vader","skywalker","chewbacca","mandalorian",
    "harrypotter","hogwarts","gryffindor","hermione","dumbledore","voldemort",
    "gandalf","frodo","aragorn","legolas","hobbit","narnia","pixar","disney",
    "netflix","spotify","youtube","tiktok","instagram","snapchat","google","apple",
    "samsung","tesla","nike","adidas","gucci","supreme","taylorswift","beyonce",
    "drake","eminem","rihanna","adele","coldplay","queen","beatles","bts","blackpink"
  ];

	// prettier-ignore
	var SPORT = [
    // football (soccer) clubs, players + cricket, the two global giants at Roehampton
    "football","soccer","messi","ronaldo","neymar","mbappe","haaland","salah",
    "kane","debruyne","modric","benzema","suarez","pele","maradona","zidane",
    "beckham","rooney","gerrard","lampard","henry","drogba","ramos","pique",
    "arsenal","chelsea","liverpool","tottenham","everton","newcastle","westham",
    "manunited","mancity","leeds","villa","rangers","celtic","barcelona","realmadrid",
    "atletico","sevilla","juventus","milan","inter","napoli","roma","bayern",
    "dortmund","psg","ajax","porto","benfica","gunners","reds","blues","spurs",
    // cricket — huge across South Asia
    "cricket","kohli","dhoni","sachin","tendulkar","rohit","bumrah","gambhir",
    "dravid","ganguly","sehwag","yuvraj","hardik","rishabh","jadeja","ashwin",
    "babar","afridi","imrankhan","wasim","shakib","tamim","warner","smith",
    "stokes","root","kane","gayle","pollard","ipl","worldcup","sixer","century",
    // other sport
    "basketball","lebron","jordan","kobe","curry","tennis","federer","nadal",
    "djokovic","serena","boxing","mma","ufc","mcgregor","formula1","hamilton",
    "verstappen","rugby","olympics","champion","legend"
  ];

	// prettier-ignore
	var ANIMALS = [
    "tiger","lion","leopard","cheetah","jaguar","panther","cougar","lynx","bobcat",
    "wolf","fox","bear","panda","koala","kangaroo","elephant","rhino","hippo",
    "giraffe","zebra","gorilla","monkey","chimp","baboon","lemur","sloth","otter",
    "beaver","badger","raccoon","squirrel","hedgehog","rabbit","hamster","gerbil",
    "eagle","hawk","falcon","owl","raven","crow","robin","sparrow","swan","flamingo",
    "peacock","parrot","penguin","ostrich","pigeon","seagull","dove","kingfisher",
    "shark","dolphin","whale","orca","octopus","jellyfish","seahorse","stingray",
    "turtle","tortoise","crocodile","alligator","lizard","gecko","iguana","chameleon",
    "cobra","python","viper","anaconda","rattlesnake","scorpion","spider","tarantula",
    "butterfly","dragonfly","ladybug","beetle","mantis","cricket","grasshopper",
    "horse","stallion","pony","donkey","camel","llama","alpaca","goat","sheep",
    "cow","buffalo","bull","pig","chicken","rooster","duck","goose","turkey",
    "dog","puppy","cat","kitten","dragon","phoenix","unicorn","griffin","pegasus"
  ];

	// prettier-ignore
	var NATURE_SPACE = [
    "sun","moon","star","stars","sky","cloud","rain","storm","thunder","lightning",
    "snow","frost","ice","wind","breeze","rainbow","sunrise","sunset","dawn","dusk",
    "ocean","sea","wave","river","lake","waterfall","stream","beach","island","reef",
    "mountain","hill","valley","canyon","cliff","cave","desert","forest","jungle",
    "meadow","garden","flower","rose","lily","daisy","tulip","orchid","lotus","jasmine",
    "sunflower","blossom","petal","leaf","tree","oak","willow","maple","pine","bamboo",
    "galaxy","cosmos","nebula","comet","meteor","asteroid","orbit","planet","earth",
    "mars","venus","jupiter","saturn","mercury","neptune","pluto","sun1","eclipse",
    "aurora","gravity","rocket","astronaut","spaceship","satellite","telescope",
    "fire","flame","ember","spark","ash","stone","rock","crystal","diamond","emerald",
    "ruby","sapphire","amber","pearl","jade","gold","silver","bronze","copper","iron"
  ];

	// prettier-ignore
	var MYTH_FANTASY = [
    "zeus","apollo","athena","hercules","poseidon","hades","ares","hermes","artemis",
    "odin","thor","loki","freya","valhalla","ragnarok","viking","valkyrie","spartan",
    "gladiator","titan","atlas","olympus","phoenix","dragon","hydra","kraken","medusa",
    "cyclops","minotaur","centaur","pegasus","griffin","chimera","sphinx","banshee",
    "wizard","witch","warlock","sorcerer","mage","paladin","knight","warrior","archer",
    "assassin","ranger","druid","goblin","orc","troll","elf","dwarf","fairy","pixie",
    "vampire","werewolf","zombie","ghost","phantom","specter","demon","angel","seraph",
    "krishna","shiva","vishnu","brahma","ganesh","hanuman","rama","durga","lakshmi",
    "anubis","horus","osiris","isis","ra","thoth","amun"
  ];

	// prettier-ignore
	var FOOD = [
    "pizza","burger","hotdog","sandwich","taco","burrito","nachos","fries","chips",
    "pasta","spaghetti","lasagna","noodles","ramen","sushi","dumpling","springroll",
    "curry","biryani","masala","tikka","paneer","samosa","naan","roti","dal","chai",
    "jollof","suya","egusi","fufu","plantain","kimchi","bibimbap","pho","padthai",
    "chocolate","vanilla","caramel","cupcake","muffin","brownie","cookie","donut",
    "waffle","pancake","icecream","gelato","pudding","custard","cheesecake","pie",
    "apple","banana","orange","mango","grape","melon","lemon","lime","peach","pear",
    "cherry","berry","strawberry","blueberry","raspberry","pineapple","coconut","kiwi",
    "avocado","tomato","potato","carrot","onion","garlic","pepper","chilli","ginger",
    "coffee","latte","mocha","espresso","tea","milkshake","smoothie","lemonade","cola",
    "honey","sugar","candy","toffee","fudge","marshmallow","popcorn","pretzel","bacon"
  ];

	// prettier-ignore
	var PLACES = [
    "london","england","britain","scotland","wales","ireland","manchester","liverpool",
    "birmingham","leeds","sheffield","bristol","glasgow","edinburgh","cardiff","belfast",
    "newcastle","nottingham","leicester","brighton","oxford","cambridge","richmond",
    "putney","wimbledon","kingston","croydon","greenwich","camden","soho","chelsea",
    "newyork","losangeles","chicago","houston","miami","boston","seattle","vegas",
    "california","texas","florida","hawaii","brooklyn","manhattan","america","canada",
    "toronto","vancouver","mumbai","delhi","bangalore","chennai","kolkata","hyderabad",
    "pune","jaipur","punjab","gujarat","kerala","goa","india","karachi","lahore",
    "islamabad","pakistan","dhaka","bangladesh","kathmandu","pokhara","nepal","everest",
    "beijing","shanghai","hongkong","tokyo","kyoto","seoul","bangkok","singapore",
    "dubai","abudhabi","doha","riyadh","cairo","lagos","abuja","nairobi","accra",
    "johannesburg","capetown","paris","berlin","madrid","barcelona","rome","milan",
    "amsterdam","lisbon","athens","vienna","prague","moscow","sydney","melbourne"
  ];

	// prettier-ignore
	var TIME_WORDS = [
    "summer","winter","spring","autumn","monday","tuesday","wednesday","thursday",
    "friday","saturday","sunday","january","february","march","april","june","july",
    "august","september","october","november","december","today","tomorrow","weekend",
    "birthday","christmas","halloween","easter","newyear","diwali","holi","eid",
    "ramadan","navratri","dussehra","rakhi","pongal","onam","vaisakhi","hanukkah",
    "thanksgiving","valentine","festival","holiday","forever","always","midnight"
  ];

	// prettier-ignore
	var COMMON_NOUNS = [
    "love","peace","hope","faith","dream","joy","smile","heart","soul","spirit",
    "angel","magic","miracle","destiny","fortune","freedom","victory","glory","honor",
    "power","energy","force","strength","courage","wisdom","truth","justice","liberty",
    "money","cash","gold","treasure","jackpot","fortune","diamond","crown","throne",
    "king","queen","prince","princess","royal","empire","kingdom","castle","palace",
    "hero","legend","champion","master","captain","commander","general","chief","boss",
    "hacker","cyber","matrix","ghost","shadow","phantom","ninja","samurai","warrior",
    "hunter","ranger","sniper","predator","reaper","viper","cobra","falcon","phoenix",
    "thunder","lightning","storm","blaze","inferno","frost","blizzard","avalanche",
    "rocket","turbo","nitro","boost","rider","racer","speed","flash","bolt","dash",
    "guitar","piano","drums","violin","music","melody","rhythm","song","dance","stage",
    "camera","phone","laptop","robot","laser","rocket","engine","circuit","pixel","byte",
    "coffee","cookie","pepper","sugar","candy","bubble","rainbow","glitter","sparkle",
    "student","teacher","doctor","nurse","engineer","lawyer","artist","writer","dreamer",
    "school","college","campus","library","science","maths","history","chemistry","physics",
    "welcome","password","letmein","secret","access","login","admin","system","network"
  ];

	// prettier-ignore
	var STALL_LOCAL = [
    // pop-culture / stall-friendly roots kept from the original
    "dragon","shadow","master","ninja","matrix","phoenix","wizard","legend","rocket",
    "thunder","falcon","eagle","tiger","wolf","viper","cobra","ghost","reaper","hero",
    // University of Roehampton specifics — keep!
    "roehampton","roe","roeh","richmond","wandsworth","putney","cebe","business","mba",
    "bsc","digby","stuart","froebel","whitelands","southlands","whiteland","southland",
    "uni","university","fresher","freshers","society","campus","student"
  ];

	// prettier-ignore
	var SUPPLEMENT = [
    // more South Asian names
    "aarush","ansh","ayush","dev","eshan","laksh","manan","neel","parth","samar",
    "tanish","ved","yash","aditi","bhavya","charvi","esha","gauri","jiya","khushi",
    "lavanya","mahi","nidhi","palak","sanya","tanya","tanvi","rhea","zoya","tara",
    "mira","nisha","ira","aayush","ashish","binod","keshav","niraj","pratik","suman",
    "ujjwal","samir",
    // more Muslim / Arab names
    "yasin","rayyan","arham","zohaib","shayan","taha","rehan","sami","anas","daniyal",
    "haris","mustafa","noman","amara","inaya","mariam","rida","sumaya","yara","layla",
    "zayd","hamza","musa","idris","bilqis",
    // more African names
    "oluwafemi","babatunde","adebayo","olamide","ifeanyi","nnamdi","chibuzo","amaka",
    "chidinma","ekene","halima","zuri","kwabena","abiola","ifeanyichukwu",
    // more East Asian names / kpop-jpop
    "haoyu","yichen","zihao","ruoxi","siyu","tianyu","xinyi","yuxuan","jimin","jungkook",
    "taehyung","suga","jhope","namjoon","minho","haruki","yuki","ren","sora","hana",
    // footballers (current)
    "haaland","lewandowski","vinicius","bellingham","foden","saka","rashford","grealish",
    "odegaard","rice","son","kane","sterling","martinez",
    // tech / gaming / internet
    "crypto","bitcoin","ethereum","neon","laser","vortex","quantum","plasma","fusion",
    "cosmic","stellar","lunar","solar","pulse","cipher","vector","binary","digital",
    "pixel","glitch","synth","retro","vapor","turbo","nitro","phantom","stealth",
    "gengar","eevee","snorlax","mewtwo","kakashi","gojo","tanjiro","deku","bakugo",
    // countries (extra)
    "qatar","kenya","ghana","egypt","morocco","turkey","brazil","mexico","spain",
    "italy","france","germany","japan","china","korea","vietnam","thailand","indonesia",
    "philippines","malaysia","srilanka","afghanistan","somalia","ethiopia","zimbabwe",
    // extra everyday nouns
    "sunflower","moonstone","stardust","firefly","waterfall","thunderbolt","snowflake",
    "wildfire","daydream","nightowl","skyline","horizon","paradise","serenity","harmony",
    "melody","echo","whisper","mystic","cosmos","zenith","phoenix","titanium","obsidian",
    "sapphire","onyx","topaz","opal","garnet","cobalt","crimson","scarlet","indigo",
    "turquoise","lavender","magenta","maroon"
  ];

	// prettier-ignore
	var PLACES_EXTRA = [
    // all 50 US states (multi-word ones joined, as people type them)
    "alabama","alaska","arizona","arkansas","california","colorado","connecticut",
    "delaware","florida","georgia","hawaii","idaho","illinois","indiana","iowa",
    "kansas","kentucky","louisiana","maine","maryland","massachusetts","michigan",
    "minnesota","mississippi","missouri","montana","nebraska","nevada","newhampshire",
    "newjersey","newmexico","newyork","northcarolina","northdakota","ohio","oklahoma",
    "oregon","pennsylvania","rhodeisland","southcarolina","southdakota","tennessee",
    "texas","utah","vermont","virginia","washington","westvirginia","wisconsin","wyoming",
    // major US cities
    "houston","philadelphia","sanantonio","sandiego","dallas","sanjose","austin",
    "jacksonville","columbus","charlotte","indianapolis","denver","nashville","detroit",
    "portland","memphis","louisville","milwaukee","tucson","sacramento","atlanta",
    "omaha","raleigh","minneapolis","tampa","orlando","cleveland","pittsburgh",
    "cincinnati","neworleans","baltimore","brooklyn","queens","bronx","harlem",
    "compton","oakland","longbeach","malibu","aspen","yosemite","yellowstone",
    // more UK towns / London areas
    "sheffield","coventry","bradford","hull","stoke","wolverhampton","plymouth",
    "southampton","portsmouth","derby","swansea","aberdeen","dundee","blackpool",
    "bolton","bournemouth","reading","luton","watford","romford","ilford","hackney",
    "brixton","peckham","tooting","ealing","hounslow","wembley","fulham","clapham",
    "balham","kingston","harrow","enfield","barnet","bexley","sutton","merton",
    // Europe
    "valencia","seville","munich","hamburg","frankfurt","cologne","naples","venice",
    "turin","marseille","lyon","nice","geneva","zurich","brussels","stockholm","oslo",
    "copenhagen","helsinki","warsaw","krakow","budapest","bucharest","kyiv","petersburg",
    "istanbul","ankara","dublin","porto","valletta","reykjavik","riga","tallinn",
    // Middle East / Africa
    "tehran","baghdad","jerusalem","mecca","medina","jeddah","kuwait","bahrain","muscat",
    "amman","beirut","damascus","casablanca","tunis","algiers","tripoli","khartoum",
    "kampala","kigali","harare","luanda","maputo","dakar","bamako","abidjan","kumasi",
    "ibadan","kano","benin","enugu","onitsha","mombasa","zanzibar","timbuktu",
    // Asia / Oceania
    "jakarta","surabaya","manila","cebu","hanoi","saigon","yangon","colombo","thimphu",
    "chengdu","guangzhou","shenzhen","wuhan","nanjing","hangzhou","macau","taipei",
    "busan","incheon","osaka","nagoya","sapporo","yokohama","auckland","wellington",
    "perth","adelaide","brisbane","canberra","fiji","samoa","tahiti",
    // more India
    "ahmedabad","surat","kanpur","nagpur","lucknow","indore","bhopal","patna","vadodara",
    "ludhiana","agra","nashik","ranchi","coimbatore","madurai","varanasi","amritsar",
    "jodhpur","udaipur","mysore","kochi","guwahati","shimla","darjeeling","rishikesh",
    // landmarks / regions
    "himalayas","sahara","amazon","alps","andes","rockies","kilimanjaro","fuji","nile",
    "ganges","thames","danube","niagara","bali","maldives","seychelles","ibiza",
    "mykonos","santorini","serengeti","patagonia","antarctica","greenland","atlantis"
  ];

	// prettier-ignore
	var CLEVER = [
    // keyboard walks people think are random
    "qwerty","qwertyuiop","qwertz","azerty","asdf","asdfgh","asdfghjkl","asdfjkl",
    "zxcvbn","zxcvbnm","qazwsx","wsxedc","qweasd","poiuyt","lkjhgf","mnbvcxz",
    "qwertyui","plokij","edcrfv","tgbyhn","hjkl","wasd",
    // self-referential / "meta" cleverness
    "password","passphrase","passcode","incorrect","wrongpassword","mypassword",
    "notapassword","thisisapassword","mysecret","mypass","secretpassword","supersecret",
    "topsecret","classified","confidential","private","personal","hidden","unknown",
    // "clever" defaults & placeholders
    "changeme","default","temporary","temppass","newpassword","resetme","forgotten",
    "iforgot","cantremember","idontknow","whatever","nothing","none","blank","empty",
    "nada","void","undefined","error","granted","denied","access","username","email",
    // words spelled backwards (they think nobody checks)
    "drowssap","terces","olleh","nimda","emanresu","dbenthere","tuoemit",
    // palindromes (feel sneaky, aren't)
    "racecar","kayak","level","civic","radar","madam","rotator","refer","deified",
    "reviver","noon","stats","tenet","redivider","rotavator","malayalam",
    // magic words & film/book "secret" passwords
    "opensesame","sesame","abracadabra","hocuspocus","alakazam","shazam","swordfish",
    "youshallnotpass","expelliarmus","wingardium","mischief","rosebud","overlook",
    "dontpanic","theanswer","meaningoflife","letmein","openup","knockknock",
    // programmer / techie inside jokes
    "helloworld","foobar","foo","bar","baz","qux","deadbeef","cafebabe","feedface",
    "localhost","kernel","segfault","nullptr","github","stackoverflow","commit","merge",
    // matrix / hacker mythos
    "redpill","bluepill","neo","trinity","morpheus","cypher","zion","oracle","agent",
    "thereisnospoon","freeyourmind","wakeup","matrixreloaded",
    // "you'll never guess this" bravado
    "leet","elite","haxor","encrypted","encryption","security","firewall","backdoor",
    "exploit","malware","phishing","keylogger","bruteforce","crackme","unbreakable",
    "uncrackable","impossible","unguessable","tryme","guessme","catchme","findme",
    "betyoucant","neverguess","toohardtoguess","gotcha","nicetry","trustno1isnt",
    // reversed / clever brand & culture nods
    "olympics","infinity","paradox","enigma","riddle","puzzle","secret1isnt","anonymous",
    "guyfawkes","illuminati","conspiracy","classified1","tinfoil","offthegrid"
  ];

	var BASE_WORDS = normalise(
		[].concat(
			NAMES_UK_US, NAMES_INDIA, NAMES_MUSLIM, NAMES_AFRICA, NAMES_NEPAL,
			NAMES_CHINA, NAMES_INTL, POP_CULTURE, SPORT, ANIMALS, NATURE_SPACE,
			MYTH_FANTASY, FOOD, PLACES, TIME_WORDS, COMMON_NOUNS, STALL_LOCAL,
			SUPPLEMENT, PLACES_EXTRA, CLEVER
		),
		3
	);

	// ---- what gets bolted onto a base word, ordered by how commonly attackers try them ----
	// prettier-ignore
	var COMMON_SUFFIXES = [
    "1", "123", "12", "2", "!", "3", "1234", "12345", "123456", "01", "007", "69",
    "42", "11", "22", "99", "00", "111", "000", "321", "786", "420", "666", "777",
    "1!", "123!", "12!", "!!", "!!!", "@", "#", ".", "?", "*", "$", "@123", "1234!",
    // years — the current era first, they matter most
    "2025", "2026", "2024", "2023", "2022", "2021", "2020", "2019", "2018", "2017",
    "2016", "2015", "2014", "2013", "2012", "2010", "2008", "2007", "2006", "2005",
    "2004", "2003", "2002", "2001", "2000", "1999", "1998", "1997", "1996", "1995",
    "1990", "1989", "1988", "1985", "1980", "2027"
  ];

	// ---- leet map used to "de-leet" a password back to a candidate dictionary word ----
	// prettier-ignore
	var LEET_MAP = {
    "@": "a", "4": "a", "8": "b", "(": "c", "3": "e", "6": "g", "1": "i",
    "!": "i", "0": "o", "9": "g", "5": "s", "$": "s", "7": "t", "+": "t", "2": "z"
  };

	global.CrackData = {
		COMMON_PASSWORDS: normalise(RAW_PASSWORDS, 1),
		BASE_WORDS: BASE_WORDS,
		COMMON_SUFFIXES: COMMON_SUFFIXES,
		LEET_MAP: LEET_MAP,
	};
})(window);
