// รูป pet/egg ที่ดึงจากในเกม (Steal An Egg `Assets.Directory`) เก็บเป็นไฟล์ local ใน `public/pets/`
// key = Roblox asset id (ตัวเลขจาก `rbxassetid://...`) -> path รูป local
// วิธี regen: ดู asset id ใหม่จากในเกม แล้วโหลดผ่าน
//   https://thumbnails.roblox.com/v1/assets?assetIds=<id>&size=420x420&format=Png&isCircular=false
// เซฟเป็น public/pets/<slug>.png แล้วเพิ่ม entry ตรงนี้ (ถ้า state != Completed แปลว่ายังไม่มีรูปจริง — ข้ามไป)
export const PET_IMAGE_MAP: Record<string, string> = {
  "118067990008425": "/pets/ascendedvermilionphoenix.png", // Ascended Vermilion Phoenix
  "72012424724645": "/pets/ashgecko.png", // Ash Gecko
  "99962600313926": "/pets/bananitadolphinita.png", // Bananita Dolphinita
  "99309954423391": "/pets/bear.png", // Bear
  "131612050648072": "/pets/belulabeluga.png", // Belula Beluga
  "72029341536310": "/pets/bladehead.png", // Blade Head
  "81767576698008": "/pets/bomboclatcrocolat.png", // Bomboclat Crocolat
  "111877395304221": "/pets/brrbrrpatapim.png", // Brr Brr Patapim
  "123516361239872": "/pets/burrowingowl.png", // Burrowing Owl
  "108762713931799": "/pets/camel.png", // Camel
  "137813424891388": "/pets/catfish.png", // Catfish
  "71959618623573": "/pets/cerberus.png", // Cerberus
  "87733160598688": "/pets/chicken.png", // Chicken
  "72909501825643": "/pets/chillinchilli.png", // Chillin Chilli
  "74635759656969": "/pets/chimpanzee.png", // Chimpanzee
  "76352927219607": "/pets/crab.png", // Crab
  "122868974506056": "/pets/crocodile.png", // Crocodile
  "95410883489917": "/pets/deathstalkerscorpion.png", // DeathstalkerScorpion
  "107145283169125": "/pets/desertlark.png", // DesertLark
  "106242839438595": "/pets/dodo.png", // Dodo
  "84193700181481": "/pets/dreamaxolotl.png", // Dream Axolotl
  "81116137079823": "/pets/duckling.png", // Duckling
  "130204625520606": "/pets/fennecfox.png", // FennecFox
  "125497863961128": "/pets/finnedthresher.png", // Finned Thresher
  "77430751529509": "/pets/flamingbull.png", // Flaming Bull
  "72292680831922": "/pets/frog.png", // Frog
  "115834854015858": "/pets/galaxygecko.png", // Galaxy Gecko
  "102979882140882": "/pets/godzilla.png", // Godzilla
  "139650837807677": "/pets/jerboa.png", // Jerboa
  "139501051458007": "/pets/kaijuspider.png", // Kaiju Spider
  "135650224014044": "/pets/kingkong.png", // King Kong
  "86595261029491": "/pets/lavaccasaturnosaturnita.png", // La Vacca Saturno Saturnita
  "94900383358369": "/pets/lavaiguana.png", // Lava Iguana
  "114459378608051": "/pets/lavafrog.png", // Lava frog
  "72054098131730": "/pets/mammoth.png", // Mammoth
  "109852386744531": "/pets/mangoliniparrochini.png", // Mangolini Parrochini
  "119413872068696": "/pets/mantis.png", // Mantis
  "106995702842298": "/pets/orangutiniananassini.png", // Orangutini Ananassini
  "90382263788089": "/pets/orca.png", // Orca
  "135424380374502": "/pets/parrotfish.png", // Parrotfish
  "87887271393121": "/pets/penguin.png", // Penguin
  "81532861297291": "/pets/polarbear.png", // Polar Bear
  "92643140066500": "/pets/pterodactyl.png", // Pterodactyl
  "108876887480947": "/pets/raccoon.png", // Raccoon
  "119006769959865": "/pets/rattlesnake.png", // Rattlesnake
  "137684641039927": "/pets/rhino.png", // Rhino
  "70412724408814": "/pets/sandspider.png", // Sand Spider
  "121348685003966": "/pets/shark.png", // Shark
  "132010793204072": "/pets/spider.png", // Spider
  "138871903615614": "/pets/strawberryelephant.png", // Strawberry Elephant
  "125076114591417": "/pets/swan.png", // Swan
  "103426699196063": "/pets/swordfish.png", // Swordfish
  "105792176792591": "/pets/tiger.png", // Tiger
  "127993958977152": "/pets/tobtobitobtob.png", // Tob Tobi Tob Tob
  "125683101618417": "/pets/toucan.png", // Toucan
  "83759742597862": "/pets/tralaledon.png", // Tralaledon
  "81618825460267": "/pets/trulimerotrulicina.png", // Trulimero Trulicina
  "133341038169489": "/pets/tungtungsahur.png", // Tung Tung Sahur
  "90736612624734": "/pets/turtle.png", // Turtle
  "123124934383954": "/pets/tyrannosaurusrex.png", // TyrannosaurusRex
  "70463817382627": "/pets/unicorn.png", // Unicorn
  "129141571024477": "/pets/walrus.png", // Walrus
  "82294183801565": "/pets/warden.png", // Warden
  "109336297710127": "/pets/Abyss_Overlord_OP.png", // Abyss Overlord OP
  "78949830377013": "/pets/Alien_Skeleton_Boss.png", // Alien Skeleton Boss
  "107923370723949": "/pets/Cave_Dragon.png", // Cave Dragon
  "85663322244323": "/pets/Cyclops_Gorilla.png", // Cyclops Gorilla
  "77518688092604": "/pets/El_Maja.png", // El Maja
  "78935088838538": "/pets/Dragon.png", // Dragon
  "85987118042621": "/pets/Drill_Monster.png", // Drill Monster
  "100658524019292": "/pets/egg_tobtobitobtob.png", // egg of Tob Tobi Tob Tob
  "102158231449811": "/pets/egg_irihorus.png", // egg of Irihorus
  "102395451894667": "/pets/egg_alienskeletonboss.png", // egg of Alien Skeleton Boss
  "102498197407436": "/pets/egg_bronto.png", // egg of Bronto
  "102762474708216": "/pets/egg_rattlesnake.png", // egg of Rattlesnake
  "103179713771844": "/pets/egg_ankylosaurus.png", // egg of Ankylosaurus
  "106778490216774": "/pets/egg_spider.png", // egg of Spider
  "106952885335586": "/pets/egg_frog.png", // egg of Frog
  "107132653319667": "/pets/egg_galaxygecko.png", // egg of Galaxy Gecko
  "108314641239947": "/pets/egg_swordfish.png", // egg of Swordfish
  "108447968078067": "/pets/egg_cavedragon.png", // egg of Cave Dragon
  "109714991972247": "/pets/egg_jerboa.png", // egg of Jerboa
  "110731551346220": "/pets/egg_mosasaurus.png", // egg of Mosasaurus
  "115243820830396": "/pets/egg_camel.png", // egg of Camel
  "116039419189340": "/pets/egg_cyclopsgorilla.png", // egg of Cyclops Gorilla
  "118897853908991": "/pets/egg_polarbear.png", // egg of Polar Bear
  "119179522600617": "/pets/egg_raccoon.png", // egg of Raccoon
  "119364076980389": "/pets/egg_icedragon.png", // egg of Ice Dragon
  "120297489068938": "/pets/egg_basilisk.png", // egg of Basilisk
  "120301498654307": "/pets/egg_toucan.png", // egg of Toucan
  "122421093207285": "/pets/egg_sandspider.png", // egg of Sand Spider
  "122894089279706": "/pets/egg_chillinchilli.png", // egg of Chillin Chilli
  "123510916905046": "/pets/egg_yeti.png", // egg of Yeti
  "124390268104324": "/pets/egg_tyrannosaurusrex.png", // egg of TyrannosaurusRex
  "124805981735905": "/pets/egg_deathstalkerscorpion.png", // egg of DeathstalkerScorpion
  "125019217025479": "/pets/egg_gorilla.png", // egg of Gorilla
  "125947630197409": "/pets/egg_dreamaxolotl.png", // egg of Dream Axolotl
  "126240842939586": "/pets/egg_unicorn.png", // egg of Unicorn
  "130480701116478": "/pets/egg_crocodile.png", // egg of Crocodile
  "131685653579153": "/pets/egg_centapede.png", // egg of Centapede
  "133004694392561": "/pets/egg_chicken.png", // egg of Chicken
  "133900489402684": "/pets/egg_ashgecko.png", // egg of Ash Gecko
  "134491333572507": "/pets/egg_ascendedvermilionphoenix.png", // egg of Ascended Vermilion Phoenix
  "134992089982715": "/pets/egg_chimpanzee.png", // egg of Chimpanzee
  "135566519246226": "/pets/egg_lavaccasaturnosaturnita.png", // egg of La Vacca Saturno Saturnita
  "137621122825975": "/pets/egg_dragon.png", // egg of Dragon
  "138198441332505": "/pets/egg_orangutiniananassini.png", // egg of Orangutini Ananassini
  "139700961680740": "/pets/egg_colossalmammoth.png", // egg of Colossal Mammoth
  "139937203160382": "/pets/egg_bananitadolphinita.png", // egg of Bananita Dolphinita
  "140493305582787": "/pets/egg_parrotfish.png", // egg of Parrotfish
  "70883699567304": "/pets/egg_flamingbull.png", // egg of Flaming Bull
  "71030998820335": "/pets/egg_bear.png", // egg of Bear
  "71615245424079": "/pets/egg_finnedthresher.png", // egg of Finned Thresher
  "71739449912371": "/pets/egg_warden.png", // egg of Warden
  "73329615832715": "/pets/egg_triceratops.png", // egg of Triceratops
  "73808584409925": "/pets/egg_fennecfox.png", // egg of FennecFox
  "73956313512014": "/pets/egg_tralaledon.png", // egg of Tralaledon
  "74154644445138": "/pets/egg_kraken.png", // egg of Kraken
  "74743575552986": "/pets/egg_desertlark.png", // egg of DesertLark
  "76046824892930": "/pets/egg_tiger.png", // egg of Tiger
  "76095389378180": "/pets/egg_eternallunardragon.png", // egg of Eternal Lunar Dragon
  "79651367855993": "/pets/egg_catfish.png", // egg of Catfish
  "81034642321828": "/pets/egg_walrus.png", // egg of Walrus
  "81099734295689": "/pets/egg_dodo.png", // egg of Dodo
  "81777724258949": "/pets/egg_duckling.png", // egg of Duckling
  "81784802036459": "/pets/egg_mirefox.png", // egg of Mire Fox
  "81989677951623": "/pets/egg_cerberus.png", // egg of Cerberus
  "84237066771646": "/pets/egg_swan.png", // egg of Swan
  "86275614169244": "/pets/egg_elmaja.png", // egg of El Maja
  "86499305011812": "/pets/egg_brrbrrpatapim.png", // egg of Brr Brr Patapim
  "87452659682783": "/pets/egg_trulimerotrulicina.png", // egg of Trulimero Trulicina
  "87685717325235": "/pets/egg_turtle.png", // egg of Turtle
  "88209726148785": "/pets/egg_pterodactyl.png", // egg of Pterodactyl
  "88448405951568": "/pets/egg_mammoth.png", // egg of Mammoth
  "91110146804468": "/pets/egg_lavafrog.png", // egg of Lava frog
  "91260564167870": "/pets/egg_dog.png", // egg of Dog
  "91985894703067": "/pets/egg_penguin.png", // egg of Penguin
  "93865460563487": "/pets/egg_sabertoothtiger.png", // egg of Sabertooth Tiger
  "94119365219057": "/pets/egg_lavaiguana.png", // egg of Lava Iguana
  "94470939106990": "/pets/egg_alabasterwhale.png", // egg of Alabaster Whale
  "95374412366370": "/pets/egg_whaleshark.png", // egg of Whale Shark
  "96603112916917": "/pets/egg_burrowingowl.png", // egg of Burrowing Owl
  "99932807273458": "/pets/egg_orca.png", // egg of Orca
  "140733363307193": "/pets/King_Kong.png", // egg of King Kong
  "103494726830799": "/pets/Oni_Tiger.png", // egg of Oni Tiger
};

// รูปจาก Steal An Egg wiki (https://stealanegg.fandom.com/wiki/Pets) เซฟเป็น PNG ใน `public/pets/`
// key = "pet:<ชื่อ normalize>" / "egg:<ชื่อ normalize>" (normalize = ตัวพิมพ์เล็ก + ตัดอักขระพิเศษออก)
// ใช้ lookup ตามชื่อเป็น fallback เวลา asset id ไม่อยู่ใน PET_IMAGE_MAP (สัตว์ใหม่/ชื่อใหม่จาก wiki)
export const PET_IMAGE_BY_NAME: Record<string, string> = {
  'pet:abyssoverlordop': '/pets/Abyss_Overlord_OP.png',
  'pet:alienskeletonboss': '/pets/Alien_Skeleton_Boss.png',
  'pet:ankylosaurus': '/pets/ankylosaurus.png',
  'pet:ascendedvermilionphoenix': '/pets/ascendedvermilionphoenix.png',
  'pet:ashgecko': '/pets/ashgecko.png',
  'pet:axolotl': '/pets/axolotl.png',
  'pet:bananitadolphinita': '/pets/bananitadolphinita.png',
  'pet:bear': '/pets/bear.png',
  'pet:belugawhale': '/pets/belugawhale.png',
  'pet:belulabeluga': '/pets/belulabeluga.png',
  'pet:bird': '/pets/bird.png',
  'pet:bladehead': '/pets/bladehead.png',
  'pet:bladehide': '/pets/bladehide.png',
  'pet:bomboclatcrocolat': '/pets/bomboclatcrocolat.png',
  'pet:bronto': '/pets/bronto.png',
  'pet:brrbrrpatapim': '/pets/brrbrrpatapim.png',
  'pet:burrowingowl': '/pets/burrowingowl.png',
  'pet:camel': '/pets/camel.png',
  'pet:catfish': '/pets/catfish.png',
  'pet:cavedragon': '/pets/Cave_Dragon.png',
  'pet:centapede': '/pets/centapede.png',
  'pet:cerberus': '/pets/cerberus.png',
  'pet:chicken': '/pets/chicken.png',
  'pet:chillinchilli': '/pets/chillinchilli.png',
  'pet:chimpanzee': '/pets/chimpanzee.png',
  'pet:cosmicdragon': '/pets/cosmicdragon.png',
  'pet:cosmicgecko': '/pets/cosmicgecko.png',
  'pet:cosmicgorilla': '/pets/cosmicgorilla.png',
  'pet:cosmicskeletonboss': '/pets/cosmicskeletonboss.png',
  'pet:crab': '/pets/crab.png',
  'pet:crane': '/pets/crane.png',
  'pet:crawler': '/pets/crawler.png',
  'pet:crocodile': '/pets/crocodile.png',
  'pet:crocodon': '/pets/crocodon.png',
  'pet:crustacia': '/pets/crustacia.png',
  'pet:cyclopsgorilla': '/pets/Cyclops_Gorilla.png',
  'pet:deathstalkerscorpion': '/pets/deathstalkerscorpion.png',
  'pet:desertlark': '/pets/desertlark.png',
  'pet:dodo': '/pets/dodo.png',
  'pet:dog': '/pets/dog.png',
  'pet:dreadscale': '/pets/dreadscale.png',
  'pet:dragon': '/pets/Dragon.png',
  'pet:drillmonster': '/pets/Drill_Monster.png',
  'pet:elmaja': '/pets/El_Maja.png',
  'pet:dreamaxolotl': '/pets/dreamaxolotl.png',
  'pet:duckling': '/pets/duckling.png',
  'egg:alabasterwhale': '/pets/egg_alabasterwhale.png',
  'egg:alienskeletonboss': '/pets/egg_alienskeletonboss.png',
  'egg:ankylosaurus': '/pets/egg_ankylosaurus.png',
  'egg:ascendedvermilionphoenix': '/pets/egg_ascendedvermilionphoenix.png',
  'egg:ashgecko': '/pets/egg_ashgecko.png',
  'egg:axolotl': '/pets/egg_axolotl.png',
  'egg:bananitadolphinita': '/pets/egg_bananitadolphinita.png',
  'egg:basilisk': '/pets/egg_basilisk.png',
  'egg:bear': '/pets/egg_bear.png',
  'egg:belugawhale': '/pets/egg_belugawhale.png',
  'egg:bird': '/pets/egg_bird.png',
  'egg:bladehide': '/pets/egg_bladehide.png',
  'egg:bronto': '/pets/egg_bronto.png',
  'egg:brrbrrpatapim': '/pets/egg_brrbrrpatapim.png',
  'egg:burrowingowl': '/pets/egg_burrowingowl.png',
  'egg:camel': '/pets/egg_camel.png',
  'egg:catfish': '/pets/egg_catfish.png',
  'egg:cavedragon': '/pets/egg_cavedragon.png',
  'egg:centapede': '/pets/egg_centapede.png',
  'egg:cerberus': '/pets/egg_cerberus.png',
  'egg:chicken': '/pets/egg_chicken.png',
  'egg:chillinchilli': '/pets/egg_chillinchilli.png',
  'egg:chimpanzee': '/pets/egg_chimpanzee.png',
  'egg:colossalmammoth': '/pets/egg_colossalmammoth.png',
  'egg:cosmicdragon': '/pets/egg_cosmicdragon.png',
  'egg:cosmicgecko': '/pets/egg_cosmicgecko.png',
  'egg:cosmicgorilla': '/pets/egg_cosmicgorilla.png',
  'egg:cosmicskeletonboss': '/pets/egg_cosmicskeletonboss.png',
  'egg:crane': '/pets/egg_crane.png',
  'egg:crocodile': '/pets/egg_crocodile.png',
  'egg:crustacia': '/pets/egg_crustacia.png',
  'egg:cyclopsgorilla': '/pets/egg_cyclopsgorilla.png',
  'egg:deathstalkerscorpion': '/pets/egg_deathstalkerscorpion.png',
  'egg:desertlark': '/pets/egg_desertlark.png',
  'egg:dodo': '/pets/egg_dodo.png',
  'egg:dog': '/pets/egg_dog.png',
  'egg:dragon': '/pets/egg_dragon.png',
  'egg:dreamaxolotl': '/pets/egg_dreamaxolotl.png',
  'egg:duckling': '/pets/egg_duckling.png',
  'egg:elmaja': '/pets/egg_elmaja.png',
  'egg:eternallunardragon': '/pets/egg_eternallunardragon.png',
  'egg:fennec': '/pets/egg_fennec.png',
  'egg:fennecfox': '/pets/egg_fennecfox.png',
  'egg:finnedthresher': '/pets/egg_finnedthresher.png',
  'egg:flamingbull': '/pets/egg_flamingbull.png',
  'egg:fox': '/pets/egg_fox.png',
  'egg:frog': '/pets/egg_frog.png',
  'egg:galaxygecko': '/pets/egg_galaxygecko.png',
  'egg:gorilla': '/pets/egg_gorilla.png',
  'egg:gorillaking': '/pets/egg_gorillaking.png',
  'egg:icedragon': '/pets/egg_icedragon.png',
  'egg:irihorus': '/pets/egg_irihorus.png',
  'egg:jerboa': '/pets/egg_jerboa.png',
  'egg:kingmammoth': '/pets/egg_kingmammoth.png',
  'egg:kingsnake': '/pets/egg_kingsnake.png',
  'egg:kingkong': '/pets/King_Kong.png',
  'egg:koi': '/pets/egg_koi.png',
  'egg:kraken': '/pets/egg_kraken.png',
  'egg:lavaccasaturnosaturnita': '/pets/egg_lavaccasaturnosaturnita.png',
  'egg:lavadragon': '/pets/egg_lavadragon.png',
  'egg:lavafrog': '/pets/egg_lavafrog.png',
  'egg:lavagecko': '/pets/egg_lavagecko.png',
  'egg:lavaiguana': '/pets/egg_lavaiguana.png',
  'egg:leviathan': '/pets/egg_leviathan.png',
  'egg:mammoth': '/pets/egg_mammoth.png',
  'egg:mantaris': '/pets/egg_mantaris.png',
  'egg:mirefox': '/pets/egg_mirefox.png',
  'egg:mosasaurus': '/pets/egg_mosasaurus.png',
  'egg:nightflame': '/pets/egg_nightflame.png',
  'egg:orangutiniananassini': '/pets/egg_orangutiniananassini.png',
  'egg:onitiger': '/pets/Oni_Tiger.png',
  'egg:orca': '/pets/egg_orca.png',
  'egg:parrotfish': '/pets/egg_parrotfish.png',
  'egg:penguin': '/pets/egg_penguin.png',
  'egg:phoenix': '/pets/egg_phoenix.png',
  'egg:polarbear': '/pets/egg_polarbear.png',
  'egg:pterodactyl': '/pets/egg_pterodactyl.png',
  'egg:raccoon': '/pets/egg_raccoon.png',
  'egg:rattlesnake': '/pets/egg_rattlesnake.png',
  'egg:redpanda': '/pets/egg_redpanda.png',
  'egg:rhinotaur': '/pets/egg_rhinotaur.png',
  'egg:royalsphinx': '/pets/egg_royalsphinx.png',
  'egg:sabertoothtiger': '/pets/egg_sabertoothtiger.png',
  'egg:salamander': '/pets/egg_salamander.png',
  'egg:sandspider': '/pets/egg_sandspider.png',
  'egg:scorpion': '/pets/egg_scorpion.png',
  'egg:shark': '/pets/egg_shark.png',
  'egg:snake': '/pets/egg_snake.png',
  'egg:snowyowl': '/pets/egg_snowyowl.png',
  'egg:spider': '/pets/egg_spider.png',
  'egg:stag': '/pets/egg_stag.png',
  'egg:swan': '/pets/egg_swan.png',
  'egg:swordfish': '/pets/egg_swordfish.png',
  'egg:tiger': '/pets/egg_tiger.png',
  'egg:tobtobitobtob': '/pets/egg_tobtobitobtob.png',
  'egg:toucan': '/pets/egg_toucan.png',
  'egg:tralaledon': '/pets/egg_tralaledon.png',
  'egg:trex': '/pets/egg_trex.png',
  'egg:triceratops': '/pets/egg_triceratops.png',
  'egg:trulimerotrulicina': '/pets/egg_trulimerotrulicina.png',
  'egg:turtle': '/pets/egg_turtle.png',
  'egg:tyrannosaurusrex': '/pets/egg_tyrannosaurusrex.png',
  'egg:unicorn': '/pets/egg_unicorn.png',
  'egg:walrus': '/pets/egg_walrus.png',
  'egg:warden': '/pets/egg_warden.png',
  'egg:whaleshark': '/pets/egg_whaleshark.png',
  'egg:yeti': '/pets/egg_yeti.png',
  'pet:eternallunardragon': '/pets/eternallunardragon.png',
  'pet:fennec': '/pets/fennec.png',
  'pet:fennecfox': '/pets/fennecfox.png',
  'pet:finnedthresher': '/pets/finnedthresher.png',
  'pet:flamingbull': '/pets/flamingbull.png',
  'pet:fox': '/pets/fox.png',
  'pet:frog': '/pets/frog.png',
  'pet:froggo': '/pets/froggo.png',
  'pet:galaxygecko': '/pets/galaxygecko.png',
  'pet:godzilla': '/pets/godzilla.png',
  'pet:gorilla': '/pets/gorilla.png',
  'pet:gorillaking': '/pets/gorillaking.png',
  'pet:icedragon': '/pets/icedragon.png',
  'pet:jerboa': '/pets/jerboa.png',
  'pet:kaijuspider': '/pets/kaijuspider.png',
  'pet:kingkong': '/pets/kingkong.png',
  'pet:kingmammoth': '/pets/kingmammoth.png',
  'pet:kingsnake': '/pets/kingsnake.png',
  'pet:kitsune': '/pets/kitsune.png',
  'pet:koi': '/pets/koi.png',
  'pet:kraken': '/pets/kraken.png',
  'pet:krakenoid': '/pets/krakenoid.png',
  'pet:lavaccasaturnosaturnita': '/pets/lavaccasaturnosaturnita.png',
  'pet:lavadragon': '/pets/lavadragon.png',
  'pet:lavafrog': '/pets/lavafrog.png',
  'pet:lavagecko': '/pets/lavagecko.png',
  'pet:lavaiguana': '/pets/lavaiguana.png',
  'pet:leviathan': '/pets/leviathan.png',
  'pet:mammoth': '/pets/mammoth.png',
  'pet:mangoliniparrochini': '/pets/mangoliniparrochini.png',
  'pet:mantaris': '/pets/mantaris.png',
  'pet:mantis': '/pets/mantis.png',
  'pet:mechacrawler': '/pets/mechacrawler.png',
  'pet:mechacrocodon': '/pets/mechacrocodon.png',
  'pet:mechadreadscale': '/pets/mechadreadscale.png',
  'pet:mechafroggo': '/pets/mechafroggo.png',
  'pet:mechakrakenoid': '/pets/mechakrakenoid.png',
  'pet:mechascorpio': '/pets/mechascorpio.png',
  'pet:mosasaurus': '/pets/mosasaurus.png',
  'pet:mutantshark': '/pets/mutantshark.png',
  'pet:nightflame': '/pets/nightflame.png',
  'pet:onitiger': '/pets/onitiger.png',
  'pet:orangutiniananassini': '/pets/orangutiniananassini.png',
  'pet:orca': '/pets/orca.png',
  'pet:parrotfish': '/pets/parrotfish.png',
  'pet:penguin': '/pets/penguin.png',
  'pet:phoenix': '/pets/phoenix.png',
  'pet:polarbear': '/pets/polarbear.png',
  'pet:pterodactyl': '/pets/pterodactyl.png',
  'pet:raccoon': '/pets/raccoon.png',
  'pet:rattlesnake': '/pets/rattlesnake.png',
  'pet:redpanda': '/pets/redpanda.png',
  'pet:rhino': '/pets/rhino.png',
  'pet:rhinotaur': '/pets/rhinotaur.png',
  'pet:royalsphinx': '/pets/royalsphinx.png',
  'pet:sabertoothtiger': '/pets/sabertoothtiger.png',
  'pet:salamander': '/pets/salamander.png',
  'pet:sandspider': '/pets/sandspider.png',
  'pet:scorpio': '/pets/scorpio.png',
  'pet:scorpion': '/pets/scorpion.png',
  'pet:shark': '/pets/shark.png',
  'pet:snake': '/pets/snake.png',
  'pet:snowyowl': '/pets/snowyowl.png',
  'pet:spider': '/pets/spider.png',
  'pet:spideron': '/pets/spideron.png',
  'pet:stag': '/pets/stag.png',
  'pet:strawberryelephant': '/pets/strawberryelephant.png',
  'pet:swan': '/pets/swan.png',
  'pet:swordfish': '/pets/swordfish.png',
  'pet:tiger': '/pets/tiger.png',
  'pet:tobtobitobtob': '/pets/tobtobitobtob.png',
  'pet:toucan': '/pets/toucan.png',
  'pet:tralaledon': '/pets/tralaledon.png',
  'pet:trex': '/pets/trex.png',
  'pet:triceratops': '/pets/triceratops.png',
  'pet:trulimerotrulicina': '/pets/trulimerotrulicina.png',
  'pet:tungtungsahur': '/pets/tungtungsahur.png',
  'pet:turtle': '/pets/turtle.png',
  'pet:tyrannosaurusrex': '/pets/tyrannosaurusrex.png',
  'pet:unicorn': '/pets/unicorn.png',
  'pet:walrus': '/pets/walrus.png',
  'pet:warden': '/pets/warden.png',
  'pet:whaleshark': '/pets/whaleshark.png',
  'pet:yeti': '/pets/yeti.png',
  // [2026-09-06] เติมจากในเกม (Assets.Directory = 135 ตัว) — ตัวที่ยังไม่มีไฟล์ PNG จะ fallback เป็นตัวอักษรจนกว่าจะโหลดรูปมาใส่ public/pets/
  'pet:abyssoverlord': '/pets/Abyss_Overlord_OP.png', // ใช้รูปเดียวกับ OP (game asset id เดียวกัน 109336297710127)
  'pet:alabasterwhale': '/pets/alabasterwhale.png',
  'pet:archdemondragon': '/pets/archdemondragon.png',
  'pet:babyauroradragon': '/pets/babyauroradragon.png',
  'pet:balrog': '/pets/balrog.png',
  'pet:basilisk': '/pets/basilisk.png',
  'pet:colossalmammoth': '/pets/colossalmammoth.png',
  'pet:demonimp': '/pets/demonimp.png',
  'pet:dreadclaw': '/pets/dreadclaw.png',
  'pet:emberdragon': '/pets/emberdragon.png',
  'pet:gargoyle': '/pets/gargoyle.png',
  'pet:hellhound': '/pets/hellhound.png',
  'pet:irihorus': '/pets/irihorus.png',
  'pet:mawbreaker': '/pets/mawbreaker.png',
  'pet:minotaur': '/pets/minotaur.png',
  'pet:mirefox': '/pets/mirefox.png',
  'pet:rifteye': '/pets/rifteye.png',
  'pet:riftwing': '/pets/riftwing.png',
  'pet:scorcheddragon': '/pets/scorcheddragon.png',
  'pet:shadowdragon': '/pets/shadowdragon.png',
  'pet:shardling': '/pets/shardling.png',
  'pet:shardwing': '/pets/shardwing.png',
  'pet:shatteredcolossus': '/pets/shatteredcolossus.png',
  'pet:shattereddrake': '/pets/shattereddrake.png',
  'pet:shatteredram': '/pets/shatteredram.png',
  'pet:ventinal': '/pets/ventinal.png',
  'pet:voidangler': '/pets/voidangler.png',
  'pet:voiddragon': '/pets/voiddragon.png',
  'pet:voidserpent': '/pets/voidserpent.png',
  'pet:voidmaw': '/pets/voidmaw.png',
  'pet:wendigo': '/pets/wendigo.png',
  'pet:worldeater': '/pets/worldeater.png',
  // [2026-09-06] egg entries ที่ขาด (53 ตัว)
  'egg:abyssoverlord': '/pets/egg_abyssoverlord.png',
  'egg:abyssoverlordop': '/pets/egg_abyssoverlordop.png',
  'egg:archdemondragon': '/pets/egg_archdemondragon.png',
  'egg:babyauroradragon': '/pets/egg_babyauroradragon.png',
  'egg:balrog': '/pets/egg_balrog.png',
  'egg:belulabeluga': '/pets/egg_belulabeluga.png',
  'egg:bladehead': '/pets/egg_bladehead.png',
  'egg:bomboclatcrocolat': '/pets/egg_bomboclatcrocolat.png',
  'egg:crab': '/pets/egg_crab.png',
  'egg:crawler': '/pets/egg_crawler.png',
  'egg:crocodon': '/pets/egg_crocodon.png',
  'egg:demonimp': '/pets/egg_demonimp.png',
  'egg:dreadclaw': '/pets/egg_dreadclaw.png',
  'egg:dreadscale': '/pets/egg_dreadscale.png',
  'egg:drillmonster': '/pets/egg_drillmonster.png',
  'egg:emberdragon': '/pets/egg_emberdragon.png',
  'egg:froggo': '/pets/egg_froggo.png',
  'egg:gargoyle': '/pets/egg_gargoyle.png',
  'egg:godzilla': '/pets/egg_godzilla.png',
  'egg:hellhound': '/pets/egg_hellhound.png',
  'egg:kaijuspider': '/pets/egg_kaijuspider.png',
  'egg:kitsune': '/pets/egg_kitsune.png',
  'egg:krakenoid': '/pets/egg_krakenoid.png',
  'egg:mangoliniparrochini': '/pets/egg_mangoliniparrochini.png',
  'egg:mantis': '/pets/egg_mantis.png',
  'egg:mawbreaker': '/pets/egg_mawbreaker.png',
  'egg:mechacrawler': '/pets/egg_mechacrawler.png',
  'egg:mechacrocodon': '/pets/egg_mechacrocodon.png',
  'egg:mechadreadscale': '/pets/egg_mechadreadscale.png',
  'egg:mechafroggo': '/pets/egg_mechafroggo.png',
  'egg:mechakrakenoid': '/pets/egg_mechakrakenoid.png',
  'egg:mechascorpio': '/pets/egg_mechascorpio.png',
  'egg:minotaur': '/pets/egg_minotaur.png',
  'egg:rhino': '/pets/egg_rhino.png',
  'egg:rifteye': '/pets/egg_rift_eye.png',
  'egg:riftwing': '/pets/egg_riftwing.png',
  'egg:scorcheddragon': '/pets/egg_scorcheddragon.png',
  'egg:scorpio': '/pets/egg_scorpio.png',
  'egg:shadowdragon': '/pets/egg_shadowdragon.png',
  'egg:shardling': '/pets/egg_shardling.png',
  'egg:shardwing': '/pets/egg_shardwing.png',
  'egg:shatteredcolossus': '/pets/egg_shatteredcolossus.png',
  'egg:shattereddrake': '/pets/egg_shattereddrake.png',
  'egg:shatteredram': '/pets/egg_shatteredram.png',
  'egg:strawberryelephant': '/pets/egg_strawberryelephant.png',
  'egg:tungtungsahur': '/pets/egg_tungtungsahur.png',
  'egg:ventinal': '/pets/egg_ventinal.png',
  'egg:voidangler': '/pets/egg_voidangler.png',
  'egg:voiddragon': '/pets/egg_voiddragon.png',
  'egg:voidserpent': '/pets/egg_voidserpent.png',
  'egg:voidmaw': '/pets/egg_voidmaw.png',
  'egg:wendigo': '/pets/egg_wendigo.png',
  'egg:worldeater': '/pets/egg_worldeater.png',
};

export function normPetName(name?: string | null): string | null {
  if (!name) return null;
  const s = name.trim().toLowerCase().replace(/\s+egg$/, "").replace(/[^a-z0-9]/g, "");
  return s || null;
}

export function localImageForName(name?: string | null, isEgg?: boolean): string | null {
  const n = normPetName(name);
  if (!n) return null;
  return PET_IMAGE_BY_NAME[`${isEgg ? "egg" : "pet"}:${n}`] ?? null;
}
