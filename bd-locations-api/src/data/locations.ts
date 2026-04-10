/**
 * Bangladesh Administrative Locations Database
 * Hierarchy: Division → District → Upazila/Thana → Area
 *
 * Sources: Wikipedia, Bangladesh Police, Banglapedia, Government portals
 * Coverage: 8 Divisions, 64 Districts, 490+ Upazilas/Thanas, 2000+ Areas
 */

export interface Area {
  name: string;
  postCode?: string;
}

export interface Thana {
  name: string;
  areas: string[];
}

export interface District {
  name: string;
  thanas: Thana[];
  // Metropolitan police thanas (for city corporations)
  metroThanas?: Thana[];
}

export interface Division {
  name: string;
  nameBn: string;
  districts: District[];
}

export const divisions: Division[] = [
  // ═══════════════════════════════════════
  // 1. BARISHAL DIVISION
  // ═══════════════════════════════════════
  {
    name: "Barishal",
    nameBn: "বরিশাল",
    districts: [
      {
        name: "Barguna",
        thanas: [
          { name: "Barguna Sadar", areas: ["Barguna", "Bodorkhali", "Burirchor", "Dhalua", "Fuljhuri", "Gowrichanna", "Keorabunia", "Noltona"] },
          { name: "Amtali", areas: ["Amtali", "Arpangasia", "Atharogasia", "Chaora", "Gulishakhali", "Haldia", "Kukua"] },
          { name: "Bamna", areas: ["Bamna", "Bukabunia", "Dauatola", "Ramna"] },
          { name: "Betagi", areas: ["Betagi", "Bibichini", "Buramazumdar", "Hosnabad", "Mokamia", "Sarishamuri"] },
          { name: "Patharghata", areas: ["Patharghata", "Char Duani", "Kakchira", "Kalmegha", "Kathaltali", "Nachnapara", "Raihanpur"] },
          { name: "Taltali", areas: ["Taltali", "Barabagi", "Chhotabagi", "Kariibaria", "Nishanbaria", "Sonakata"] },
        ],
      },
      {
        name: "Barishal",
        thanas: [
          { name: "Agailjhara", areas: ["Agailjhara", "Bagdha", "Bakal", "Gaila", "Rajihar", "Ratnapur"] },
          { name: "Babuganj", areas: ["Babuganj", "Chandpasha", "Dehergati", "Kedarpur", "Madhabpasha", "Rahmatpur"] },
          { name: "Bakerganj", areas: ["Bakerganj", "Charadi", "Dudhal", "Durgapasha", "Faridpur", "Garuria", "Kalashkati", "Niamati", "Rangasree"] },
          { name: "Banaripara", areas: ["Banaripara", "Baisari", "Bisarkandi", "Chakhar", "Illuhar", "Saidkati", "Udaykati"] },
          { name: "Gournadi", areas: ["Gournadi", "Barthi", "Batajore", "Khanjapur", "Mahilara", "Nalchira", "Sarikal"] },
          { name: "Hizla", areas: ["Hizla", "Bara Jalia", "Dhulkhola", "Guabaria", "Harinathpur", "Memania"] },
          { name: "Mehendiganj", areas: ["Mehendiganj", "Alimabad", "Andharmanik", "Bidyanandapur", "Char Gopalpur", "Gobindapur", "Jangalia", "Sreepur"] },
          { name: "Muladi", areas: ["Muladi", "Batamara", "Char Kalekhan", "Gachhua", "Kazir Char", "Nazirpur", "Safipur"] },
          { name: "Wazirpur", areas: ["Wazirpur", "Bamrail", "Barakotha", "Guthia", "Harta", "Jalla", "Otra", "Satla", "Sholak"] },
        ],
        metroThanas: [
          { name: "Kotwali", areas: ["Sagordi", "Alekanda", "Amanatganj", "Bhatikhana", "Goriarpar", "Lakutia", "Hatkhola", "Beltola", "Bottola", "Chawkbazar", "Banglabazar", "Launch Ghat"] },
          { name: "Airport", areas: ["Rupatoli", "Airport Road", "BM College Area", "Bogura Road", "Nathullabad"] },
          { name: "Kawnia", areas: ["Kawnia", "Kashipur", "Chandmari", "Puranpara", "Notunbazar"] },
          { name: "Bandar", areas: ["Bandar", "Chohutpur", "Polashpur", "Rosulpur", "Shaheberhat", "Laharhat"] },
        ],
      },
      {
        name: "Bhola",
        thanas: [
          { name: "Bhola Sadar", areas: ["Bhola Sadar", "Alinagor", "Dhania", "Ilisha", "Razapur", "Shibpur", "Vhelumia"] },
          { name: "Burhanuddin", areas: ["Burhanuddin", "Deula", "Gongapur", "Hasannogor", "Kachia", "Kutuba", "Sachra"] },
          { name: "Char Fasson", areas: ["Char Fasson", "Char Kolmi", "Char Madras", "Char Manika", "Hazarigonj", "Kukri Mukri", "Osmanganj"] },
          { name: "Daulatkhan", areas: ["Daulatkhan", "Char Khalifa", "Charpata", "Hazipur", "Madanpur", "Sayedpur"] },
          { name: "Lalmohan", areas: ["Lalmohan", "Badarpur", "Charbhuta", "Farajgonj", "Kalma", "Lord Hardinge", "Ramagonj"] },
          { name: "Manpura", areas: ["Manpura", "Dakshin Sakuchia", "Hazirhat", "Uttar Sakuchia"] },
          { name: "Tazumuddin", areas: ["Tazumuddin", "Chanchra", "Shambupur", "Sonapur"] },
        ],
      },
      {
        name: "Jhalokati",
        thanas: [
          { name: "Jhalokati Sadar", areas: ["Jhalokati", "Basanda", "Gabkhandhansiri", "Keora", "Kirtipasha", "Nabagram", "Ponabalia", "Sekherhat"] },
          { name: "Kathalia", areas: ["Kathalia", "Amua", "Awrabunia", "Patikhalghata", "Shaulajalia"] },
          { name: "Nalchity", areas: ["Nalchity", "Bhairabpasha", "Dapdapia", "Kulkati", "Mollahat", "Ranapasha", "Subidpur"] },
          { name: "Rajapur", areas: ["Rajapur", "Baraia", "Galua", "Mathbari", "Saturia", "Suktagarh"] },
        ],
      },
      {
        name: "Patuakhali",
        thanas: [
          { name: "Patuakhali Sadar", areas: ["Patuakhali", "Auliapur", "Badarpur", "Jainkathi", "Kamalapur", "Laukathi", "Madarbunia"] },
          { name: "Bauphal", areas: ["Bauphal", "Kachipara", "Kalishuri", "Keshabpur", "Madanpura", "Najirpur", "Shurjamoni"] },
          { name: "Dashmina", areas: ["Dashmina", "Alipur", "Bahrampur", "Bashbaria", "Rangopaldi"] },
          { name: "Dumki", areas: ["Dumki", "Angaria", "Labukhali", "Muradia", "Pangasia", "Sreerampur"] },
          { name: "Galachipa", areas: ["Galachipa", "Char Biswas", "Char Kajol", "Chiknikandi", "Dakua", "Golkhali", "Panpatti"] },
          { name: "Kalapara", areas: ["Kalapara", "Kuakata", "Champapur", "Dhankhali", "Mahipur", "Nilgonj", "Tiakhali"] },
          { name: "Mirzaganj", areas: ["Mirzaganj", "Amragachia", "Kakrabunia", "Madhabkhali", "Majidbaria"] },
          { name: "Rangabali", areas: ["Rangabali", "Boro Baishadia", "Char Momtaz", "Chalitabunia", "Maudubi"] },
        ],
      },
      {
        name: "Pirojpur",
        thanas: [
          { name: "Pirojpur Sadar", areas: ["Pirojpur", "Durgapur", "Kadamtala", "Kalakhali", "Shankorpasha", "Tona"] },
          { name: "Bhandaria", areas: ["Bhandaria", "Bhitabaria", "Dhaoa", "Gouripur", "Ikri", "Telikhali"] },
          { name: "Indurkani", areas: ["Indurkani", "Chandipur", "Balipara", "Parerhat", "Pattashi"] },
          { name: "Kawkhali", areas: ["Kawkhali", "Amrajuri", "Chirapara", "Sayna Raghunathpur", "Shial Kati"] },
          { name: "Mathbaria", areas: ["Mathbaria", "Amragasia", "Boromasua", "Daudkhali", "Gulishakhali", "Mirukhali", "Tuskhali"] },
          { name: "Nazirpur", areas: ["Nazirpur", "Daulbari Dobra", "Kolardoania", "Malikhali", "Sriramkathi"] },
          { name: "Nesarabad", areas: ["Nesarabad", "Atghar Kuriana", "Daihari", "Guarekha", "Jalabari", "Sohagdal"] },
        ],
      },
    ],
  },

  // ═══════════════════════════════════════
  // 2. CHATTOGRAM DIVISION
  // ═══════════════════════════════════════
  {
    name: "Chattogram",
    nameBn: "চট্টগ্রাম",
    districts: [
      {
        name: "Chattogram",
        thanas: [
          { name: "Anwara", areas: ["Anwara", "Barakhain", "Burumchhara", "Chatari", "Haildhar", "Juidandi", "Raypur"] },
          { name: "Banshkhali", areas: ["Banshkhali", "Baharchhara", "Chambal", "Katharia", "Puichhari", "Sekherkhil"] },
          { name: "Boalkhali", areas: ["Boalkhali", "Charandwip", "Kandhurkhil", "Sakpura", "Shikalbaha"] },
          { name: "Chandanaish", areas: ["Chandanaish", "Bailtali", "Dhopachari", "Hashimpur", "Kanchanabad"] },
          { name: "Fatikchhari", areas: ["Fatikchhari", "Bhandar Sharif", "Harualchhari", "Narangiri", "Nanupur", "Suabil"] },
          { name: "Hathazari", areas: ["Hathazari", "Chittagong University", "Dantmara", "Fatehpur", "Katirhat", "Mirzapur"] },
          { name: "Karnaphuli", areas: ["Karnaphuli", "Char Patharghata", "Juldha"] },
          { name: "Lohagara", areas: ["Lohagara", "Amirabad", "Charamba", "Chunti", "Padua", "Putibila"] },
          { name: "Mirsharai", areas: ["Mirsharai", "Durgapur", "Hinguli", "Jorarganj", "Karerhat", "Mayani", "Osmanpur"] },
          { name: "Patiya", areas: ["Patiya", "Barakhain", "Dhalghat", "Haitkandi", "Jiri", "Kelishahar"] },
          { name: "Rangunia", areas: ["Rangunia", "Chandraghona", "Hosnabad", "Islampur", "Mariamnagar", "Pomra"] },
          { name: "Raozan", areas: ["Raozan", "Binajuri", "East Guzara", "Gahira", "Haldia", "Noajishpur"] },
          { name: "Sandwip", areas: ["Sandwip", "Bauria", "Gachhua", "Haramia", "Magdhara", "Rahmatpur", "Urirchar"] },
          { name: "Satkania", areas: ["Satkania", "Amanullah", "Bazalia", "Dhemsha", "Keochia", "Madarsha"] },
          { name: "Sitakunda", areas: ["Sitakunda", "Barabkunda", "Bhatiari", "Fouzdarhat", "Kumira", "Salimpur", "Ship Breaking Yard"] },
        ],
        metroThanas: [
          { name: "Kotwali", areas: ["Anderkilla", "Chawkbazar", "Enayet Bazar", "Firingee Bazar", "Kazir Dewri", "Sadarghat", "Khatunganj", "Chaktai"] },
          { name: "Panchlaish", areas: ["Panchlaish", "GEC Circle", "Sugandha", "O.R. Nizam Road", "Prabartak Circle", "Mehedibag"] },
          { name: "Bayezid Bostami", areas: ["Bayezid Bostami", "Nasirabad", "East Nasirabad", "Chandgaon", "Nandankanon"] },
          { name: "Double Mooring", areas: ["Double Mooring", "Agrabad", "North Agrabad", "South Agrabad", "Strand Road", "Kadamtali"] },
          { name: "Halishahar", areas: ["Halishahar", "Bandartila", "Customs Area", "CDA Avenue"] },
          { name: "Pahartali", areas: ["Pahartali", "Wireless Gate", "Battali Hill", "Foillatali", "Shulakbahar"] },
          { name: "Patenga", areas: ["Patenga", "North Patenga", "South Patenga", "Port Connecting Road"] },
          { name: "Bakalia", areas: ["Bakalia", "West Bakalia", "East Bakalia", "Hamzarbag", "Ice Factory Road"] },
          { name: "Khulshi", areas: ["Khulshi", "Tigerpass", "Dampara", "Jamal Khan", "Lalkhan Bazar"] },
          { name: "EPZ", areas: ["EPZ", "CEPZ", "Kalurghat", "South Halishahar"] },
          { name: "Bandar", areas: ["Bandar", "Port Area", "Chittgong Port", "Sadarghat"] },
          { name: "Sadarghat", areas: ["Sadarghat", "Riazuddin Bazar", "Jubilee Road", "Station Road"] },
          { name: "Akbar Shah", areas: ["Akbar Shah", "Jalalabad", "Muradpur", "Dewanhat", "Katalganj"] },
          { name: "Chandgaon", areas: ["Chandgaon", "Bahaddarhat", "Oxygen", "Sholoshahar"] },
          { name: "Karnaphuli (Metro)", areas: ["Karnaphuli", "Raufabad", "South Kattali", "North Kattali"] },
        ],
      },
      {
        name: "Cox's Bazar",
        thanas: [
          { name: "Cox's Bazar Sadar", areas: ["Cox's Bazar Town", "Kolatoli", "Laboni Beach", "Sugandha Beach", "Himchari", "Golap Nagar", "Eidgaon"] },
          { name: "Chakaria", areas: ["Chakaria", "Badarkhali", "Dulahazara", "Fashiakhali", "Harbang"] },
          { name: "Kutubdia", areas: ["Kutubdia", "Ali Akbar Deil", "Baraghop", "Lemsikhali"] },
          { name: "Maheshkhali", areas: ["Maheshkhali", "Dhalghata", "Matarbari", "Saflapur"] },
          { name: "Pekua", areas: ["Pekua", "Magnama", "Rajakhali", "Shilkhali"] },
          { name: "Ramu", areas: ["Ramu", "Fatehkharkul", "Garjania", "Joarianala", "Rajarkul"] },
          { name: "Teknaf", areas: ["Teknaf", "Baharchhara", "Nhilla", "Sabrang", "Shah Porir Dwip", "Whykong", "St. Martin's Island"] },
          { name: "Ukhia", areas: ["Ukhia", "Haldia Palong", "Jalia Palong", "Palong Khali", "Raja Palong", "Kutupalong"] },
        ],
      },
      {
        name: "Cumilla",
        thanas: [
          { name: "Cumilla Sadar", areas: ["Cumilla Town", "Kandirpar", "Rajganj", "Dharmasagar", "Ranir Bazar", "Cumilla Cantonment", "Kotbari", "Chawkbazar", "Moynamoti"] },
          { name: "Cumilla Sadar Dakshin", areas: ["Bijoypur", "Jaguir", "Parbatipur", "Amratali"] },
          { name: "Barura", areas: ["Barura", "Adra", "Jamalpur", "Shuapur"] },
          { name: "Brahmanpara", areas: ["Brahmanpara", "Chandla", "Malapara", "Sahebabad"] },
          { name: "Burichong", areas: ["Burichong", "Bakshimul", "Mokam", "Rajapur"] },
          { name: "Chandina", areas: ["Chandina", "Barashalghar", "Dolokhara", "Gallai", "Jibanpur"] },
          { name: "Chauddagram", areas: ["Chauddagram", "Alkara", "Batisa", "Gunabati", "Shasidal"] },
          { name: "Daudkandi", areas: ["Daudkandi", "Biteshwar", "Eliotganj", "Gauripur", "Sundalpur"] },
          { name: "Debidwar", areas: ["Debidwar", "Barishaba", "Jafarganj", "Mohanpur", "Subil"] },
          { name: "Homna", areas: ["Homna", "Ghagotia", "Nilokhi", "Shankarpur"] },
          { name: "Laksam", areas: ["Laksam", "Laksam Junction", "Ajgara", "Mudafarganj"] },
          { name: "Lalmai", areas: ["Lalmai", "Baghmara", "Hajiganj", "Lalmai Hills"] },
          { name: "Meghna", areas: ["Meghna", "Chandpur Road", "Dakshin Eliotganj"] },
          { name: "Monoharganj", areas: ["Monoharganj", "Haitkandi", "Jhalam", "Laxmipur"] },
          { name: "Muradnagar", areas: ["Muradnagar", "Bangra", "Jaipur", "Paharpur", "Ramchandrapur"] },
          { name: "Nangalkot", areas: ["Nangalkot", "Bangodda", "Dahutia", "Pewamura", "Satbaria"] },
          { name: "Titas", areas: ["Titas", "Jagatpur", "Kalyanpur"] },
        ],
      },
      {
        name: "Brahmanbaria",
        thanas: [
          { name: "Brahmanbaria Sadar", areas: ["Brahmanbaria Town", "Kali Bazar", "Medda Bazar", "Talshahar"] },
          { name: "Akhaura", areas: ["Akhaura", "Akhaura Land Port", "Dariapur", "Mogra"] },
          { name: "Ashuganj", areas: ["Ashuganj", "Ashuganj Fertilizer Factory", "Power Station", "Lalpur"] },
          { name: "Bancharampur", areas: ["Bancharampur", "Ayubpur", "Darikandi", "Salimganj"] },
          { name: "Bijoynagar", areas: ["Bijoynagar", "Chandura", "Kaitala", "Merkuchi"] },
          { name: "Kasba", areas: ["Kasba", "Badair", "Kaimpur", "Kuti", "Gopinathpur"] },
          { name: "Nabinagar", areas: ["Nabinagar", "Biddyakut", "Ibrahimpur", "Natghar", "Shibpur"] },
          { name: "Nasirnagar", areas: ["Nasirnagar", "Burishwar", "Chapartala", "Gokarna"] },
          { name: "Sarail", areas: ["Sarail", "Noagaon", "Shahbazpur", "Kalaura"] },
        ],
      },
      {
        name: "Chandpur",
        thanas: [
          { name: "Chandpur Sadar", areas: ["Chandpur Town", "Puran Bazar", "Launch Ghat", "Kalyanpur", "Bishnupur"] },
          { name: "Faridganj", areas: ["Faridganj", "Char Bhairabi", "Islamabad", "Rampura"] },
          { name: "Haimchar", areas: ["Haimchar", "Algidurgapur", "Char Bhasani", "Nilkamal"] },
          { name: "Hajiganj", areas: ["Hajiganj", "Baghadi", "Kalacho", "Osmanganj", "Rajargaon"] },
          { name: "Kachua", areas: ["Kachua", "Asadpur", "Kadla", "Karpara", "Sakhar"] },
          { name: "Matlab Dakshin", areas: ["Matlab South", "Daspara", "Kalakanda", "Nayergaon"] },
          { name: "Matlab Uttar", areas: ["Matlab North", "Eklashpur", "Farajikandi", "Mohanpur"] },
          { name: "Shahrasti", areas: ["Shahrasti", "Islampur", "Kalipur", "Meher", "Tamta"] },
        ],
      },
      {
        name: "Feni",
        thanas: [
          { name: "Feni Sadar", areas: ["Feni Town", "Trunk Road", "College Road", "Sultanpur", "Fazilpur", "Lemua"] },
          { name: "Chhagalnaiya", areas: ["Chhagalnaiya", "Darbarpur", "Ghaniamora", "Rajapur"] },
          { name: "Daganbhuiyan", areas: ["Daganbhuiyan", "Jaypur", "Rajapur", "Sindurpur"] },
          { name: "Fulgazi", areas: ["Fulgazi", "Amzadhat", "Munshirhat", "Nayakhola"] },
          { name: "Parshuram", areas: ["Parshuram", "Chitholia", "Kasimpur", "Shubhapur"] },
          { name: "Sonagazi", areas: ["Sonagazi", "Char Chandia", "Char Darbesh", "Nutan Nagar"] },
        ],
      },
      {
        name: "Khagrachari",
        thanas: [
          { name: "Khagrachari Sadar", areas: ["Khagrachari Town", "Perachhara", "Kamalchari", "Golabari"] },
          { name: "Dighinala", areas: ["Dighinala", "Babuchara", "Boalkhali", "Kabakhali", "Merung"] },
          { name: "Guimara", areas: ["Guimara", "Hafchari", "Dochhari", "Maischari"] },
          { name: "Lakshmichhari", areas: ["Lakshmichhari", "Barmachhari", "Dullyatali"] },
          { name: "Mahalchhari", areas: ["Mahalchhari", "Gomti", "Mubachhari"] },
          { name: "Manikchhari", areas: ["Manikchhari", "Batnatali", "Gomti Bazar"] },
          { name: "Matiranga", areas: ["Matiranga", "Amtali", "Belchhari", "Tabalchhari"] },
          { name: "Panchhari", areas: ["Panchhari", "Chengi", "Latiban", "Logang", "Ultachhari"] },
          { name: "Ramgarh", areas: ["Ramgarh", "Hafchari", "Patachara"] },
        ],
      },
      {
        name: "Lakshmipur",
        thanas: [
          { name: "Lakshmipur Sadar", areas: ["Lakshmipur Town", "Dalal Bazar", "Bhobaniganj", "Hajirhat"] },
          { name: "Kamalnagar", areas: ["Kamalnagar", "Char Alexander", "Char Falcon", "Char Kadira", "Patarirhat"] },
          { name: "Raipur", areas: ["Raipur", "Char Ababil", "Char Banga", "Haydarabad"] },
          { name: "Ramganj", areas: ["Ramganj", "Bholakot", "Chandraganj", "Kanchanpur"] },
          { name: "Ramgati", areas: ["Ramgati", "Char Abdullah", "Char Alexander", "Char Ramani"] },
        ],
      },
      {
        name: "Noakhali",
        thanas: [
          { name: "Noakhali Sadar", areas: ["Maijdee", "Maijdee Court", "Binodpur", "Sonapur", "Dharmapur"] },
          { name: "Begumganj", areas: ["Begumganj", "Choumuhani", "Dattapara", "Joyag", "Rajganj"] },
          { name: "Chatkhil", areas: ["Chatkhil", "Bataiya", "Kabirhat", "Osman Nagar"] },
          { name: "Companiganj", areas: ["Companiganj", "Char Elahi", "Char Fakira", "Musapur"] },
          { name: "Hatiya", areas: ["Hatiya", "Char King", "Jahajmara", "Nijhum Dwip", "Sukh Char"] },
          { name: "Kabirhat", areas: ["Kabirhat", "Ghoshbag", "Eklashpur"] },
          { name: "Senbagh", areas: ["Senbagh", "Arjuntala", "Kadirhanpur", "Mohammedpur"] },
          { name: "Sonaimuri", areas: ["Sonaimuri", "Amishapara", "Chhatarpaiya", "Nodona"] },
          { name: "Subarna Char", areas: ["Subarna Char", "Char Amanullah", "Char Bata", "Char Jabbar", "Char Clark"] },
        ],
      },
      {
        name: "Rangamati",
        thanas: [
          { name: "Rangamati Sadar", areas: ["Rangamati Town", "Reserve Bazar", "Kaptai Lake Area", "Vedvedi"] },
          { name: "Bagaichhari", areas: ["Bagaichhari", "Sajek", "Ruilui Para"] },
          { name: "Barkal", areas: ["Barkal", "Bhusanchara", "Shubalong"] },
          { name: "Belaichhari", areas: ["Belaichhari", "Farua"] },
          { name: "Juraichhari", areas: ["Juraichhari", "Marishya", "Dumdumya"] },
          { name: "Kaptai", areas: ["Kaptai", "Kaptai Dam", "Chandraghona", "Chitmorom", "Raikhali", "Wagga"] },
          { name: "Kawkhali", areas: ["Kawkhali", "Betbunia", "Ghagra", "Betbunia Earth Station"] },
          { name: "Langadu", areas: ["Langadu", "Atarakchara", "Bagadur", "Maischari"] },
          { name: "Naniarchar", areas: ["Naniarchar", "Burighat", "Ghilachari"] },
          { name: "Rajasthali", areas: ["Rajasthali", "Ghagra", "Gainda"] },
        ],
      },
      {
        name: "Bandarban",
        thanas: [
          { name: "Bandarban Sadar", areas: ["Bandarban Town", "Rajbari", "Balaghata", "Nilgiri", "Meghla", "Shoilo Propat"] },
          { name: "Alikadam", areas: ["Alikadam", "Chaikhong", "Kurukpata"] },
          { name: "Lama", areas: ["Lama", "Aziznagar", "Fashiakhali", "Rupashimul", "Sarai"] },
          { name: "Naikhongchhari", areas: ["Naikhongchhari", "Baishari", "Dochhari", "Ghumdhum"] },
          { name: "Rowangchhari", areas: ["Rowangchhari", "Alekhyong", "Noapatang"] },
          { name: "Ruma", areas: ["Ruma", "Galengya", "Paindu", "Remakri", "Boga Lake"] },
          { name: "Thanchi", areas: ["Thanchi", "Balipara", "Remakri", "Tindu", "Nafakhum"] },
        ],
      },
    ],
  },

  // ═══════════════════════════════════════
  // 3. DHAKA DIVISION
  // ═══════════════════════════════════════
  {
    name: "Dhaka",
    nameBn: "ঢাকা",
    districts: [
      {
        name: "Dhaka",
        thanas: [
          { name: "Dhamrai", areas: ["Dhamrai", "Sombhag", "Kushura", "Rowail", "Suapur", "Gangutia"] },
          { name: "Dohar", areas: ["Dohar", "Nayabari", "Mahmudpur", "Bilashpur"] },
          { name: "Keraniganj", areas: ["Keraniganj", "South Keraniganj", "Zinzira", "Kalindi"] },
          { name: "Nawabganj", areas: ["Nawabganj", "Agla", "Bakshanagar", "Kalakopa"] },
          { name: "Savar", areas: ["Savar", "Ashulia", "Hemayetpur", "Aminbazar", "EPZ", "Jahangirnagar University", "National Martyrs' Memorial"] },
        ],
        metroThanas: [
          { name: "Adabor", areas: ["Adabor", "Shekhertek", "Baitul Aman Housing", "Ring Road"] },
          { name: "Airport", areas: ["Airport", "Kurmitola", "Bishmile", "Khilkhet"] },
          { name: "Badda", areas: ["Badda", "Middle Badda", "South Badda", "Merul Badda", "Aftabnagar"] },
          { name: "Banani", areas: ["Banani", "Banani DOHS", "Kakoli", "Chairman Bari"] },
          { name: "Bangshal", areas: ["Bangshal", "Naya Bazar", "Thathari Bazar", "Shankhari Bazar"] },
          { name: "Cantonment", areas: ["Cantonment", "Dhaka Cantonment", "ECB Chattar", "Airport Road"] },
          { name: "Chackbazar", areas: ["Chawkbazar", "Lalbagh Fort", "Islampur", "Chawk Mogaltuli"] },
          { name: "Dakshin Khan", areas: ["Dakshin Khan", "Ashkona", "Haji Camp", "Uttarkhan"] },
          { name: "Darus Salam", areas: ["Darus Salam", "Mirpur-1", "Kalshi", "Kafrul"] },
          { name: "Demra", areas: ["Demra", "Matuail", "Konapara", "Joydebpur Road", "Shiddhirganj Border"] },
          { name: "Dhanmondi", areas: ["Dhanmondi", "Shankar", "Jhigatola", "Science Lab", "New Market Road"] },
          { name: "Gandaria", areas: ["Gandaria", "Dholaikhal", "Postogola", "Dhupkhola"] },
          { name: "Gulshan", areas: ["Gulshan-1", "Gulshan-2", "Niketan", "Gulshan Avenue"] },
          { name: "Hatirjheel", areas: ["Hatirjheel", "Free School Street", "Eskaton", "Shahbag"] },
          { name: "Hazaribagh", areas: ["Hazaribagh", "Zafrabad", "Rajar Dewri", "BG Press"] },
          { name: "Jatrabari", areas: ["Jatrabari", "Postogola", "Dholaipar", "Sayedabad Bus Terminal", "Dhaka-Narayanganj Road"] },
          { name: "Kadamtali", areas: ["Kadamtali", "Madartek", "Basabo", "South Mugda"] },
          { name: "Kafrul", areas: ["Kafrul", "Taltola", "Agargaon", "Sher-e-Bangla Nagar"] },
          { name: "Kalabagan", areas: ["Kalabagan", "Panthapath", "Lake Circus", "Bashundhara City"] },
          { name: "Kamrangirchar", areas: ["Kamrangirchar", "Lalbagh", "Islambagh"] },
          { name: "Khilgaon", areas: ["Khilgaon", "Tilpapara", "Taltola", "Nandipara", "Rampura Road"] },
          { name: "Khilkhet", areas: ["Khilkhet", "Nikunja", "Jamuna Future Park", "Bashundhara"] },
          { name: "Kotwali", areas: ["Kotwali", "Sadarghat", "Babu Bazar", "Farashganj", "Wise Ghat"] },
          { name: "Lalbagh", areas: ["Lalbagh", "Azimpur", "Lalbagh Fort", "Bakshi Bazar"] },
          { name: "Mirpur Model", areas: ["Mirpur-2", "Mirpur-6", "Mirpur-10", "Mirpur-11", "Mirpur-12", "Shah Ali Bagh"] },
          { name: "Mohammadpur", areas: ["Mohammadpur", "Tajmahal Road", "Jafrabad", "Noorjahan Road", "Town Hall", "Krishi Market"] },
          { name: "Motijheel", areas: ["Motijheel", "Dilkusha", "Shapla Chattar", "Bangladesh Bank", "Kamalapur Station"] },
          { name: "Mugda", areas: ["Mugda", "Gopibag", "Manda", "Shahjahanpur"] },
          { name: "New Market", areas: ["New Market", "Elephant Road", "Katabon", "Aziz Super Market"] },
          { name: "Pallabi", areas: ["Pallabi", "Mirpur-11", "Mirpur-12", "Mirpur-14", "Rupnagar"] },
          { name: "Paltan", areas: ["Paltan", "Purana Paltan", "Naya Paltan", "Topkhana Road"] },
          { name: "Ramna", areas: ["Ramna", "Ramna Park", "Shahbag", "Segun Bagicha", "Ittefaq Mor"] },
          { name: "Rampura", areas: ["Rampura", "East Rampura", "West Rampura", "Banasree", "TV Gate"] },
          { name: "Rupnagar", areas: ["Rupnagar", "Mirpur-13", "Pallabi", "Rupnagar Housing"] },
          { name: "Sabujbag", areas: ["Sabujbag", "Mugda Para", "Manda", "Bashabo"] },
          { name: "Shah Ali", areas: ["Shah Ali", "Mirpur-1", "Mirpur-2", "Kazipara"] },
          { name: "Shahbag", areas: ["Shahbag", "TSC", "Dhaka University Campus", "Charukala", "Suhrawardy Udyan"] },
          { name: "Shahjahanpur", areas: ["Shahjahanpur", "Khilgaon Flyover", "Mugda"] },
          { name: "Sher-e-Bangla Nagar", areas: ["Sher-e-Bangla Nagar", "Parliament", "Agargaon", "Manik Mia Avenue"] },
          { name: "Shyampur", areas: ["Shyampur", "Postogola", "Pagla", "South Jatrabari"] },
          { name: "Sutrapur", areas: ["Sutrapur", "Wari", "Narinda", "Tikatuli", "Bangramur"] },
          { name: "Tejgaon", areas: ["Tejgaon", "Farmgate", "Kawran Bazar", "Banglamotor", "Bijoy Nagar"] },
          { name: "Tejgaon Industrial", areas: ["Tejgaon Industrial Area", "Gulshan Link Road", "Begunbari"] },
          { name: "Turag", areas: ["Turag", "Tongi", "Kamarpara", "Abdullahpur"] },
          { name: "Uttar Khan", areas: ["Uttar Khan", "Mollartek", "Zili Para", "Haji Para"] },
          { name: "Uttara East", areas: ["Uttara Sector-1", "Sector-3", "Sector-5", "Sector-7", "Jasimuddin Road"] },
          { name: "Uttara West", areas: ["Uttara Sector-4", "Sector-6", "Sector-9", "Sector-10", "Sector-11"] },
          { name: "Vatara", areas: ["Vatara", "Bashundhara R/A", "Aftabnagar", "Nadda", "Nurerchala"] },
          { name: "Wari", areas: ["Wari", "Narinda", "Rang Mahal", "Tikatuli", "Kaptan Bazar", "Dholaikhal"] },
        ],
      },
      {
        name: "Faridpur",
        thanas: [
          { name: "Faridpur Sadar", areas: ["Faridpur Town", "Kanaipur", "Aliabad", "Decreerchar"] },
          { name: "Alfadanga", areas: ["Alfadanga", "Bana", "Gopalpur", "Tagarbanda"] },
          { name: "Bhanga", areas: ["Bhanga", "Hamirdi", "Kaijuri", "Majchar"] },
          { name: "Boalmari", areas: ["Boalmari", "Chatul", "Dhopadanga", "Satair"] },
          { name: "Charbhadrasan", areas: ["Charbhadrasan", "Char Manair", "Gazirtek"] },
          { name: "Madhukhali", areas: ["Madhukhali", "Baluchar", "Bagat", "Kamarkali"] },
          { name: "Nagarkanda", areas: ["Nagarkanda", "Bhawal", "Laskardia", "Talma"] },
          { name: "Sadarpur", areas: ["Sadarpur", "Char Bishnupur", "Dheukhali", "Kaijuri"] },
          { name: "Saltha", areas: ["Saltha", "Ambikapur", "Jadunandi", "Sonapur"] },
        ],
      },
      {
        name: "Gazipur",
        thanas: [
          { name: "Gazipur Sadar", areas: ["Gazipur Town", "Chandra", "Baria", "Mouchak"] },
          { name: "Kaliakair", areas: ["Kaliakair", "Shreepur Border", "Mouchak", "Boali"] },
          { name: "Kaliganj", areas: ["Kaliganj", "Nagari", "Moktarpur", "Baktarpur"] },
          { name: "Kapasia", areas: ["Kapasia", "Chandpur", "Singhashree", "Tokh"] },
          { name: "Sreepur", areas: ["Sreepur", "Rajabari", "Telihati", "Barmi"] },
        ],
        metroThanas: [
          { name: "Joydebpur", areas: ["Joydebpur", "Board Bazar", "Gazipur Chaurasta"] },
          { name: "Tongi East", areas: ["Tongi East", "Cherag Ali", "BSCIC Industrial Area"] },
          { name: "Tongi West", areas: ["Tongi West", "Tongi Bazar", "Tongi Station"] },
          { name: "Bason", areas: ["Bason", "National University Campus", "Gazipur Sadar"] },
          { name: "Kashimpur", areas: ["Kashimpur", "Kaliakair Road", "Kashimpur Jail Area"] },
          { name: "Konabari", areas: ["Konabari", "Pubail Road", "Hotapara"] },
        ],
      },
      {
        name: "Gopalganj",
        thanas: [
          { name: "Gopalganj Sadar", areas: ["Gopalganj Town", "Chandradighalia", "Gobra", "Kandi"] },
          { name: "Kashiani", areas: ["Kashiani", "Fukura", "Hirapur", "Orakandi", "Rajpat"] },
          { name: "Kotalipara", areas: ["Kotalipara", "Bandhabari", "Ghonapara", "Kalabari"] },
          { name: "Muksudpur", areas: ["Muksudpur", "Bahugram", "Kasalia", "Raghunathpur"] },
          { name: "Tungipara", areas: ["Tungipara", "Patgati", "Gopalganj Upashahar"] },
        ],
      },
      {
        name: "Kishoreganj",
        thanas: [
          { name: "Kishoreganj Sadar", areas: ["Kishoreganj Town", "Hossainpur Road", "Chamra Bazar"] },
          { name: "Austagram", areas: ["Austagram", "Abdullapur", "Bangalpara", "Kalmegha"] },
          { name: "Bajitpur", areas: ["Bajitpur", "Dilalpur", "Pirijpur", "Sararchar"] },
          { name: "Bhairab", areas: ["Bhairab", "Bhairab Bazar", "Bhairab Railway Junction", "Ashuganj Road"] },
          { name: "Hossainpur", areas: ["Hossainpur", "Abdullapur", "Egarasindur", "Mathpara"] },
          { name: "Itna", areas: ["Itna", "Joysiddhi", "Badla", "Dhaki"] },
          { name: "Karimganj", areas: ["Karimganj", "Islampur", "Jafarabad", "Kargaon"] },
          { name: "Katiadi", areas: ["Katiadi", "Gopdighi", "Masua", "Narayandia"] },
          { name: "Kuliarchar", areas: ["Kuliarchar", "Hirakhola", "Ladob"] },
          { name: "Mithamain", areas: ["Mithamain", "Dhaki", "Ghagra", "Nikli Border"] },
          { name: "Nikli", areas: ["Nikli", "Dampara", "Jagatpur", "Karpasha"] },
          { name: "Pakundia", areas: ["Pakundia", "Charfaradi", "Egaro Sindur", "Hosainpur"] },
          { name: "Tarail", areas: ["Tarail", "Chhaysuti", "Gajaria", "Hilochia"] },
        ],
      },
      {
        name: "Madaripur",
        thanas: [
          { name: "Madaripur Sadar", areas: ["Madaripur Town", "Court Area", "Khaliya", "Keyain"] },
          { name: "Kalkini", areas: ["Kalkini", "Enaytpur", "Kushakhali", "Sahebrampur"] },
          { name: "Rajoir", areas: ["Rajoir", "Ishibpur", "Khoajpur", "Tarpasha"] },
          { name: "Shibchar", areas: ["Shibchar", "Bandarkhola", "Kathalbari", "Kutubpur"] },
        ],
      },
      {
        name: "Manikganj",
        thanas: [
          { name: "Manikganj Sadar", areas: ["Manikganj Town", "Betila Mitara", "Hatipara", "Nabagram"] },
          { name: "Daulatpur", areas: ["Daulatpur", "Barangail", "Char Katari", "Jhitka"] },
          { name: "Ghior", areas: ["Ghior", "Baliati", "Nali", "Talebpur"] },
          { name: "Harirampur", areas: ["Harirampur", "Balara", "Kanchanpur", "Lesraganj"] },
          { name: "Saturia", areas: ["Saturia", "Baldhara", "Dhulsura", "Fukurhari"] },
          { name: "Shivalaya", areas: ["Shivalaya", "Arijhara", "Mohadebpur", "Ulail"] },
          { name: "Singair", areas: ["Singair", "Bayra", "Charigram", "Dhalla", "Joymantap"] },
        ],
      },
      {
        name: "Munshiganj",
        thanas: [
          { name: "Munshiganj Sadar", areas: ["Munshiganj Town", "Bajrajogini", "Madhyapara", "Rekabi Bazar"] },
          { name: "Gazaria", areas: ["Gazaria", "Baluakandi", "Imampur", "Voberchar"] },
          { name: "Lohajang", areas: ["Lohajang", "Baulakandi", "Haldia", "Kanaksar", "Medini Mandal"] },
          { name: "Sirajdikhan", areas: ["Sirajdikhan", "Ichhapura", "Joginibaroipur", "Kola Para"] },
          { name: "Sreenagar", areas: ["Sreenagar", "Atpara", "Bhagyakul", "Kolapara", "Louhajang"] },
          { name: "Tongibari", areas: ["Tongibari", "Autshahi", "Dighirpar", "Hasail", "Kathadia"] },
        ],
      },
      {
        name: "Narayanganj",
        thanas: [
          { name: "Araihazar", areas: ["Araihazar", "Gopaldi", "Bishnandi", "Khagakanda"] },
          { name: "Bandar", areas: ["Bandar", "Kalagachhia", "Murapara", "Syedpur"] },
          { name: "Rupganj", areas: ["Rupganj", "Bhulta", "Kayetpara", "Murapara", "Purbachal"] },
          { name: "Sonargaon", areas: ["Sonargaon", "Panam City", "Aminpur", "Mograpara"] },
        ],
        metroThanas: [
          { name: "Narayanganj Sadar", areas: ["Narayanganj Town", "Tanbazar", "BN Bazar", "Deobhog", "Nitaiganj", "Chashara"] },
          { name: "Siddhirganj", areas: ["Siddhirganj", "Adamjee", "Demra Border", "Shiddhirganj Power"] },
          { name: "Fatullah", areas: ["Fatullah", "Enayetnagar", "Kashipur", "Kutubpur", "Fatullah Bazar"] },
        ],
      },
      {
        name: "Narsingdi",
        thanas: [
          { name: "Narsingdi Sadar", areas: ["Narsingdi Town", "Alokbali", "Char Subuddhi", "Jinardi", "Karimpur"] },
          { name: "Belabo", areas: ["Belabo", "Bajnabo", "Narsinghapur", "Sallabad"] },
          { name: "Monohardi", areas: ["Monohardi", "Chalakchar", "Hatirdia", "Monohordi Bazar"] },
          { name: "Palash", areas: ["Palash", "Ghorashal", "Char Shibpur", "Ghorashal Fertilizer"] },
          { name: "Raipura", areas: ["Raipura", "Chandanbari", "Marjal", "Musapur", "Sreenagar"] },
          { name: "Shibpur", areas: ["Shibpur", "Ayubpur", "Nuralapur", "Putia", "Shibpur Bazar"] },
        ],
      },
      {
        name: "Rajbari",
        thanas: [
          { name: "Rajbari Sadar", areas: ["Rajbari Town", "Dargarh", "Khankhanapur", "Mizanpur"] },
          { name: "Baliakandi", areas: ["Baliakandi", "Islampur", "Jamalpur", "Narua"] },
          { name: "Goalandaghat", areas: ["Goalandaghat", "Debagram", "Rajibpur", "Goalanda Ferry"] },
          { name: "Kalukhali", areas: ["Kalukhali", "Boalia", "Madapur", "Ratandia"] },
          { name: "Pangsha", areas: ["Pangsha", "Babupara", "Habashpur", "Jashohai", "Mriganka"] },
        ],
      },
      {
        name: "Shariatpur",
        thanas: [
          { name: "Shariatpur Sadar", areas: ["Shariatpur Town", "Chikandi", "Kachikata", "Tulasar"] },
          { name: "Bhedarganj", areas: ["Bhedarganj", "Char Atra", "Fatehpur", "Sakhi Mohol"] },
          { name: "Damudya", areas: ["Damudya", "Kaijuri", "Sidulkura", "Pachchar"] },
          { name: "Gosairhat", areas: ["Gosairhat", "Idilpur", "Nager Para", "Somaj Nagar"] },
          { name: "Naria", areas: ["Naria", "Bhojeshwar", "Gharishar", "Lakshmipur"] },
          { name: "Zanjira", areas: ["Zanjira", "Baroikhali", "Kunderchar", "Naodoba"] },
        ],
      },
      {
        name: "Tangail",
        thanas: [
          { name: "Tangail Sadar", areas: ["Tangail Town", "Kakrajan", "Porabari", "Santosh"] },
          { name: "Basail", areas: ["Basail", "Fulki", "Habla", "Kauljani"] },
          { name: "Bhuapur", areas: ["Bhuapur", "Aloa", "Dapunia", "Gabsara"] },
          { name: "Delduar", areas: ["Delduar", "Atia", "Deulabari", "Lauhati", "Pathrail"] },
          { name: "Dhanbari", areas: ["Dhanbari", "Jadunathpur", "Mushuddi", "Paikar"] },
          { name: "Ghatail", areas: ["Ghatail", "Dehanagar", "Lokerpara", "Sandhanpur"] },
          { name: "Gopalpur", areas: ["Gopalpur", "Hadira", "Jhawail", "Nagbari"] },
          { name: "Kalihati", areas: ["Kalihati", "Ballabhdi", "Elenga", "Nagarbari", "Shahabatpur"] },
          { name: "Madhupur", areas: ["Madhupur", "Arankhola", "Golabari", "Jalchatra"] },
          { name: "Mirzapur", areas: ["Mirzapur", "Gorai", "Mohera", "Warsi"] },
          { name: "Nagarpur", areas: ["Nagarpur", "Bhadra", "Dhuburia", "Pakutia", "Salimabad"] },
          { name: "Sakhipur", areas: ["Sakhipur", "Gazipur", "Hatibandha", "Kalmegha"] },
        ],
      },
    ],
  },

  // ═══════════════════════════════════════
  // 4. KHULNA DIVISION
  // ═══════════════════════════════════════
  {
    name: "Khulna",
    nameBn: "খুলনা",
    districts: [
      {
        name: "Khulna",
        thanas: [
          { name: "Batiaghata", areas: ["Batiaghata", "Amirpur", "Gangarampur", "Surkhali", "Bhandarkot", "Baliadanga", "Jalma"] },
          { name: "Dacope", areas: ["Dacope", "Bajua", "Kamarkhola", "Tildanga", "Sutarkhali", "Pankhali", "Banishanta"] },
          { name: "Dighalia", areas: ["Dighalia", "Senhati", "Gazirhat", "Barakpur", "Jogipol"] },
          { name: "Dumuria", areas: ["Dumuria", "Maguraghona", "Sahos", "Rudaghara", "Shovna", "Kharnia", "Sharafpur"] },
          { name: "Koyra", areas: ["Koyra", "Amadi", "Bagali", "Moheswaripur", "Uttar Bedkashi", "Sundarbans"] },
          { name: "Paikgachha", areas: ["Paikgachha", "Garaikhali", "Kapilmuni", "Deluti", "Lashkar", "Godaipur"] },
          { name: "Phultala", areas: ["Phultala", "Damodor", "Atra Gilatala", "Jamira"] },
          { name: "Rupsa", areas: ["Rupsa", "Aichgati", "Naihati", "Alaipur", "Ghatvog"] },
          { name: "Terokhada", areas: ["Terokhada", "Chagladoho", "Barasat", "Madhupur", "Ajgara"] },
        ],
        metroThanas: [
          { name: "Kotwali", areas: ["Tutpara", "Dolkhola", "Khulna Shipyard", "Railway Station", "Rayer Mahal", "Pather Bazar"] },
          { name: "Sonadanga", areas: ["Sonadanga", "Nirala", "Gollamari", "Boyra", "New Market", "Shibbari", "Mujgunni", "Eastern Plaza"] },
          { name: "Khalishpur", areas: ["Khalishpur", "Khalishpur Industrial", "Jute Mills Area", "Newsprint Mill", "Power House", "BIT Khulna"] },
          { name: "Daulatpur", areas: ["Daulatpur", "Maheshwarpasha", "Shiramoni", "Badamtali", "Trade School", "Daulatpur Railway Station"] },
          { name: "Khan Jahan Ali", areas: ["Khan Jahan Ali", "Phulbari Gate", "Atra", "Jahanabad Cantonment", "Satgumbad Mosque"] },
          { name: "Labanchara", areas: ["Labanchara", "Moylapota", "Arambag", "Gilatola", "KDA Avenue"] },
          { name: "Harintana", areas: ["Harintana", "Khulna University", "Gutudia"] },
          { name: "Aranghata", areas: ["Aranghata", "Rangpur", "Kartikkul", "Bania Khamar"] },
        ],
      },
      {
        name: "Bagerhat",
        thanas: [
          { name: "Bagerhat Sadar", areas: ["Bagerhat Town", "Karapara", "Gotapara", "Bishnapur", "Satgambuj", "Champanagar"] },
          { name: "Chitalmari", areas: ["Chitalmari", "Kalatala", "Hizla", "Shibpur", "Charbaniari"] },
          { name: "Fakirhat", areas: ["Fakirhat", "Betaga", "Lakhpur", "Piljang", "Bahirdia Mansa"] },
          { name: "Kachua", areas: ["Kachua", "Gojalia", "Dhopakhali", "Gopalpur", "Badhal"] },
          { name: "Mollahat", areas: ["Mollahat", "Chunkhola", "Gangni", "Kodalia", "Atjuri"] },
          { name: "Mongla", areas: ["Mongla", "Mongla Port", "Burirdanga", "Mithakhali", "Chandpai", "Sundarban"] },
          { name: "Morrelganj", areas: ["Morrelganj", "Teligati", "Putikhali", "Chingrakhali", "Hoglapasha"] },
          { name: "Rampal", areas: ["Rampal", "Gouramva", "Baintala", "Rajnagar", "Vojpatia"] },
          { name: "Sarankhola", areas: ["Sarankhola", "Dhansagor", "Khontakata", "Rayenda", "Sundarbans"] },
        ],
      },
      {
        name: "Chuadanga",
        thanas: [
          { name: "Chuadanga Sadar", areas: ["Chuadanga Town", "Alukdia", "Begumpur", "Kutubpur", "Padmabila"] },
          { name: "Alamdanga", areas: ["Alamdanga", "Belgachi", "Chitla", "Hardi", "Jehala", "Nagdah"] },
          { name: "Damurhuda", areas: ["Damurhuda", "Darshana", "Hawli", "Juranpur", "Karpashdanga"] },
          { name: "Jibannagar", areas: ["Jibannagar", "Andulbaria", "Banka", "Hasadah", "Raypur"] },
        ],
      },
      {
        name: "Jashore",
        thanas: [
          { name: "Jashore Sadar", areas: ["Jashore Town", "Chanchra", "Arabpur", "Noapara", "Hamidpur", "Upashahar"] },
          { name: "Abhaynagar", areas: ["Abhaynagar", "Prembag", "Sundoli", "Chalishia", "Sreedhorpur"] },
          { name: "Bagherpara", areas: ["Bagherpara", "Johorpur", "Raipur", "Narikelbaria"] },
          { name: "Chaugachha", areas: ["Chaugachha", "Fulsara", "Dhuliani", "Jagadishpur", "Hakimpur"] },
          { name: "Jhikargachha", areas: ["Jhikargachha", "Gadkhali", "Panisara", "Shankarpur"] },
          { name: "Keshabpur", areas: ["Keshabpur", "Sagardari", "Bidyanandakati", "Mongolkot", "Panjia"] },
          { name: "Manirampur", areas: ["Manirampur", "Chaluahati", "Haridaskati", "Kashimnagar", "Khanpur"] },
          { name: "Sharsha", areas: ["Sharsha", "Benapole", "Benapole Land Port", "Bahadurpur", "Lakshmanpur"] },
        ],
      },
      {
        name: "Jhenaidah",
        thanas: [
          { name: "Jhenaidah Sadar", areas: ["Jhenaidah Town", "Naldanga", "Dogachi", "Ghorshal", "Maharazpur"] },
          { name: "Harinakunda", areas: ["Harinakunda", "Bhayna", "Chandpur", "Kapashatia"] },
          { name: "Kaliganj", areas: ["Kaliganj", "Baro Bazar", "Niamatpur", "Trilochanpur"] },
          { name: "Kotchandpur", areas: ["Kotchandpur", "Baluhar", "Dora", "Elangi", "Kushna"] },
          { name: "Maheshpur", areas: ["Maheshpur", "Banshbaria", "Fatepur", "Jadabpur", "Shyamkur"] },
          { name: "Shailkupa", areas: ["Shailkupa", "Dignagore", "Dudshar", "Fulhari", "Hakimpur"] },
        ],
      },
      {
        name: "Kushtia",
        thanas: [
          { name: "Kushtia Sadar", areas: ["Kushtia Town", "Cheouria", "Ailchara", "Alampur", "Barkhada"] },
          { name: "Bheramara", areas: ["Bheramara", "Bahadurpur", "Chandgram", "Dharampur", "Juniadaha"] },
          { name: "Daulatpur", areas: ["Daulatpur", "Islamic University", "Boalia", "Chilmari", "Khalishakundi"] },
          { name: "Khoksa", areas: ["Khoksa", "Ambaria", "Betbaria", "Gopgram", "Jayanti Hazra"] },
          { name: "Kumarkhali", areas: ["Kumarkhali", "Shelaidaha", "Bagulat", "Chandpur", "Chapra"] },
          { name: "Mirpur", areas: ["Mirpur", "Amla", "Bahalbaria", "Fulbaria", "Poradaha"] },
        ],
      },
      {
        name: "Magura",
        thanas: [
          { name: "Magura Sadar", areas: ["Magura Town", "Atharokhada", "Bogia", "Gopalgram", "Hazipur"] },
          { name: "Mohammadpur", areas: ["Mohammadpur", "Babukhali", "Balidia", "Binodpur"] },
          { name: "Shalikha", areas: ["Shalikha", "Arpara", "Bunagati", "Shatakhali"] },
          { name: "Sreepur", areas: ["Sreepur", "Amalsar", "Dariapur", "Gayeshpur", "Nakol"] },
        ],
      },
      {
        name: "Meherpur",
        thanas: [
          { name: "Meherpur Sadar", areas: ["Meherpur Town", "Kutubpur", "Buripota", "Amjhupi", "Pirojpur"] },
          { name: "Gangni", areas: ["Gangni", "Kathuli", "Tetulbaria", "Kazipur", "Bamondi"] },
          { name: "Mujibnagar", areas: ["Mujibnagar", "Baidyanathtala", "Dariapur", "Monkhali"] },
        ],
      },
      {
        name: "Narail",
        thanas: [
          { name: "Narail Sadar", areas: ["Narail Town", "Roopgonj", "Rotongonj", "Hatbaria", "Chandiborpur"] },
          { name: "Kalia", areas: ["Kalia", "Naragati", "Babra Hasla", "Hamidpur", "Joynagar"] },
          { name: "Lohagara", areas: ["Lohagara", "Naldi", "Shalnagar", "Noagram", "Joypur"] },
        ],
      },
      {
        name: "Satkhira",
        thanas: [
          { name: "Satkhira Sadar", areas: ["Satkhira Town", "Bhomra", "Bhomra Land Port", "Banshdaha", "Shibpur"] },
          { name: "Assasuni", areas: ["Assasuni", "Budhhata", "Kulla", "Protapnagar", "Kadakati"] },
          { name: "Debhata", areas: ["Debhata", "Kulia", "Parulia", "Sakhipur", "Noapara"] },
          { name: "Kalaroa", areas: ["Kalaroa", "Joynagar", "Jalalabad", "Sonabaria", "Chandanpur"] },
          { name: "Kaliganj", areas: ["Kaliganj", "Krishnagar", "Bishnupur", "Nalta", "Ratanpur"] },
          { name: "Shyamnagar", areas: ["Shyamnagar", "Burigoalini", "Gabura", "Munsigang", "Sundarbans"] },
          { name: "Tala", areas: ["Tala", "Patkelghata", "Nagarghata", "Kumira", "Khalishkhali"] },
        ],
      },
    ],
  },

  // ═══════════════════════════════════════
  // 5. MYMENSINGH DIVISION
  // ═══════════════════════════════════════
  {
    name: "Mymensingh",
    nameBn: "ময়মনসিংহ",
    districts: [
      {
        name: "Jamalpur",
        thanas: [
          { name: "Jamalpur Sadar", areas: ["Jamalpur Town", "Digpaith", "Itail", "Kendua", "Meshta", "Rashidpur"] },
          { name: "Bakshiganj", areas: ["Bakshiganj", "Bagarchar", "Battajore", "Danua", "Nilakhia"] },
          { name: "Dewanganj", areas: ["Dewanganj", "Bahadurabad", "Char Aomkhaoa", "Hatebhanga"] },
          { name: "Islampur", areas: ["Islampur", "Belghacha", "Chinaduli", "Kulkandi", "Noarpara"] },
          { name: "Madarganj", areas: ["Madarganj", "Balijuri", "Gunaritala", "Sidhuli"] },
          { name: "Melandaha", areas: ["Melandaha", "Char Banipakuri", "Fulkocha", "Mahmudpur", "Nayanagar"] },
          { name: "Sarishabari", areas: ["Sarishabari", "Bhatara", "Kamrabad", "Pingna", "Satpoa"] },
        ],
      },
      {
        name: "Mymensingh",
        thanas: [
          { name: "Mymensingh Sadar", areas: ["Mymensingh Town", "Boro Bazaar", "Choto Bazaar", "Chorpara", "Shambhuganj", "Bipin Park"] },
          { name: "Bhaluka", areas: ["Bhaluka", "Birunia", "Dhitpur", "Habirbari", "Mallikbari"] },
          { name: "Dhobaura", areas: ["Dhobaura", "Gamaritala", "Guatala", "Pora Kandulia"] },
          { name: "Fulbaria", areas: ["Fulbaria", "Bakta", "Enayetpur", "Kaladaha", "Naogaon"] },
          { name: "Gaffargaon", areas: ["Gaffargaon", "Josora", "Moshakhali", "Panchbagh", "Saltia"] },
          { name: "Gauripur", areas: ["Gauripur", "Bhangnamari", "Bokainagar", "Ramgopalpur"] },
          { name: "Haluaghat", areas: ["Haluaghat", "Bhubankura", "Dhara", "Dhurail", "Sakuai"] },
          { name: "Ishwarganj", areas: ["Ishwarganj", "Atharabari", "Magtula", "Rajibpur", "Sohagi"] },
          { name: "Muktagacha", areas: ["Muktagacha", "Borogram", "Daogaon", "Kashimpur", "Kumargata"] },
          { name: "Nandail", areas: ["Nandail", "Gangail", "Jahangirpur", "Kharua", "Sherpur"] },
          { name: "Phulpur", areas: ["Phulpur", "Balia", "Baola", "Rahimganj", "Rupasi"] },
          { name: "Tarakanda", areas: ["Tarakanda", "Banihala", "Dhakua", "Kakni", "Kamaria"] },
          { name: "Trishal", areas: ["Trishal", "Bailar", "Dhanikhola", "Harirampur", "Sakhua"] },
        ],
      },
      {
        name: "Netrokona",
        thanas: [
          { name: "Netrokona Sadar", areas: ["Netrokona Town", "Amtala", "Kailati", "Madanpur", "Rauha"] },
          { name: "Atpara", areas: ["Atpara", "Baniyajan", "Duoj", "Sukhari", "Teligati"] },
          { name: "Barhatta", areas: ["Barhatta", "Asma", "Baushi", "Roypur", "Singdha"] },
          { name: "Durgapur", areas: ["Durgapur", "Birisiri", "Chandigarh", "Gaokandia", "Kakairgara"] },
          { name: "Kalmakanda", areas: ["Kalmakanda", "Kharnai", "Langura", "Nazirpur", "Rangchhati"] },
          { name: "Kendua", areas: ["Kendua", "Chirang", "Dalpa", "Garadoba", "Mashka", "Sandikona"] },
          { name: "Khaliajuri", areas: ["Khaliajuri", "Gazipur", "Krishnapur", "Mendipur"] },
          { name: "Madan", areas: ["Madan", "Fatehpur", "Gobindasree", "Nayekpur"] },
          { name: "Mohanganj", areas: ["Mohanganj", "Barkashia", "Gaglajur", "Suair", "Tentulia"] },
          { name: "Purbadhala", areas: ["Purbadhala", "Agia", "Bishkakuni", "Gohalakanda", "Khalishaur"] },
        ],
      },
      {
        name: "Sherpur",
        thanas: [
          { name: "Sherpur Sadar", areas: ["Sherpur Town", "Bajitkhila", "Betmari", "Dhola", "Kamaria"] },
          { name: "Jhenaigati", areas: ["Jhenaigati", "Kangsha", "Dhanshail", "Nalkura", "Hatibandha"] },
          { name: "Nakla", areas: ["Nakla", "Baneshwardi", "Chandrakona", "Ganapaddi", "Pathakata"] },
          { name: "Nalitabari", areas: ["Nalitabari", "Juganiya", "Koloshpar", "Nayabil", "Puragau"] },
          { name: "Sreebardi", areas: ["Sreebardi", "Garjaripa", "Gosaipur", "Kakilakura", "Ranishimul"] },
        ],
      },
    ],
  },

  // ═══════════════════════════════════════
  // 6. RAJSHAHI DIVISION
  // ═══════════════════════════════════════
  {
    name: "Rajshahi",
    nameBn: "রাজশাহী",
    districts: [
      {
        name: "Rajshahi",
        thanas: [
          { name: "Bagha", areas: ["Bagha", "Arani", "Ziapur", "Bausara", "Monigram"] },
          { name: "Bagmara", areas: ["Bagmara", "Ganespur", "Jogipara", "Taherpur"] },
          { name: "Charghat", areas: ["Charghat", "Sardah", "Yusufpur", "Bhalkia"] },
          { name: "Durgapur", areas: ["Durgapur", "Govindha", "Noapara", "Saranjai"] },
          { name: "Godagari", areas: ["Godagari", "Premtali", "Rishikul", "Pakri"] },
          { name: "Mohanpur", areas: ["Mohanpur", "Basudebpur", "Dhurail", "Kachhari"] },
          { name: "Paba", areas: ["Paba", "Nowhata", "Katakhali", "Haripur", "Dariapur"] },
          { name: "Puthia", areas: ["Puthia", "Belpukuria", "Baniagram", "Silmaria"] },
          { name: "Tanore", areas: ["Tanore", "Mundumala", "Badhair", "Gollapara"] },
        ],
        metroThanas: [
          { name: "Boalia", areas: ["Saheb Bazar", "Ghoramara", "Talaimari", "Laxmipur", "Kazihata", "Hetmakhan"] },
          { name: "Rajpara", areas: ["Rajpara", "Binodpur", "Sapura", "Sultanabad", "Boalia Para"] },
          { name: "Motihar", areas: ["Motihar", "University Campus", "Kazla", "Budhapara", "Meherchandi"] },
          { name: "Shah Makhdum", areas: ["Shah Makhdum", "Bhadra", "Uposhohor", "Padma Garden"] },
          { name: "Chandrima", areas: ["Chandrima", "Kashaydanga", "Shahajipara", "Aduburi"] },
          { name: "Kasiadanga", areas: ["Kasiadanga", "Kathalbariya", "Raipara", "Ghuripara"] },
          { name: "Katakhali", areas: ["Katakhali", "Helenabad Colony", "Goalpara"] },
          { name: "Airport", areas: ["Airport", "Bulanpur", "Chandipur", "Nawabganj"] },
        ],
      },
      {
        name: "Bogura",
        thanas: [
          { name: "Bogura Sadar", areas: ["Bogura Town", "Satmatha", "Banani", "Rangapara", "Sultanpur"] },
          { name: "Adamdighi", areas: ["Adamdighi", "Santahar", "Nasratpur"] },
          { name: "Dhunat", areas: ["Dhunat", "Gopalnagar", "Gosaipur", "Nimgachhi"] },
          { name: "Dhupchanchia", areas: ["Dhupchanchia", "Talora", "Gumaniganj"] },
          { name: "Gabtali", areas: ["Gabtali", "Balua", "Kagail", "Sonaroy"] },
          { name: "Kahaloo", areas: ["Kahaloo", "Durgahata", "Bhandarbari"] },
          { name: "Nandigram", areas: ["Nandigram", "Dhulaura", "Chapra", "Mithapur"] },
          { name: "Sariakandi", areas: ["Sariakandi", "Kutubpur", "Hatfulbari", "Bohail"] },
          { name: "Shajahanpur", areas: ["Shajahanpur", "Gohail", "Aria", "Rajapur"] },
          { name: "Sherpur", areas: ["Sherpur", "Kherua", "Khanpur", "Bishalpur"] },
          { name: "Shibganj", areas: ["Shibganj", "Mokamtala", "Bihar", "Buriganj"] },
          { name: "Sonatala", areas: ["Sonatala", "Pakulla", "Tekani", "Balighata"] },
        ],
      },
      {
        name: "Chapai Nawabganj",
        thanas: [
          { name: "Chapai Nawabganj Sadar", areas: ["Chapai Nawabganj Town", "Ranihati", "Balidiar", "Islampur"] },
          { name: "Bholahat", areas: ["Bholahat", "Daldali", "Jambaria", "Gohalbari"] },
          { name: "Gomastapur", areas: ["Gomastapur", "Rohanpur", "Rahimanpur"] },
          { name: "Nachole", areas: ["Nachole", "Kosba", "Fatehpur", "Nizampur"] },
          { name: "Shibganj", areas: ["Shibganj", "Kansat", "Manaksha", "Shahbajpur"] },
        ],
      },
      {
        name: "Joypurhat",
        thanas: [
          { name: "Joypurhat Sadar", areas: ["Joypurhat Town", "Dogachhi", "Tilakpur", "Mohammadabad"] },
          { name: "Akkelpur", areas: ["Akkelpur", "Roynagar", "Jaypur"] },
          { name: "Kalai", areas: ["Kalai", "Amdah", "Pudumdi"] },
          { name: "Khetlal", areas: ["Khetlal", "Mamudpur", "Singra"] },
          { name: "Panchbibi", areas: ["Panchbibi", "Dharanji", "Kusumba"] },
        ],
      },
      {
        name: "Naogaon",
        thanas: [
          { name: "Naogaon Sadar", areas: ["Naogaon Town", "Dubalhati", "Kirtipur", "Boalia"] },
          { name: "Atrai", areas: ["Atrai", "Ahsanganj", "Bandaikhara"] },
          { name: "Badalgachhi", areas: ["Badalgachhi", "Paharpur", "Balubhara"] },
          { name: "Dhamoirhat", areas: ["Dhamoirhat", "Agradigun", "Jahanpur"] },
          { name: "Manda", areas: ["Manda", "Prasadpur", "Kalikapur"] },
          { name: "Mohadevpur", areas: ["Mohadevpur", "Enayetpur", "Chandas"] },
          { name: "Niamatpur", areas: ["Niamatpur", "Hajinagar", "Rasulpur"] },
          { name: "Patnitala", areas: ["Patnitala", "Nirmail", "Amair"] },
          { name: "Porsha", areas: ["Porsha", "Ghatnagar", "Nitpur"] },
          { name: "Raninagar", areas: ["Raninagar", "Kasba", "Gona"] },
          { name: "Sapahar", areas: ["Sapahar", "Goala", "Aihai"] },
        ],
      },
      {
        name: "Natore",
        thanas: [
          { name: "Natore Sadar", areas: ["Natore Town", "Laxmikol", "Dighapatia", "Halsa"] },
          { name: "Bagatipara", areas: ["Bagatipara", "Dayarampur", "Jamnagor"] },
          { name: "Baraigram", areas: ["Baraigram", "Joari", "Majgaon"] },
          { name: "Gurudaspur", areas: ["Gurudaspur", "Chaluabar", "Noldanga"] },
          { name: "Lalpur", areas: ["Lalpur", "Arbab", "Duaria"] },
          { name: "Naldanga", areas: ["Naldanga", "Luxmikunda", "Chhatni"] },
          { name: "Singra", areas: ["Singra", "Chaugram", "Hatiandha", "Tajpur"] },
        ],
      },
      {
        name: "Pabna",
        thanas: [
          { name: "Pabna Sadar", areas: ["Pabna Town", "Hemayetpur", "Laxmikundi", "Maligachha"] },
          { name: "Atgharia", areas: ["Atgharia", "Debottar", "Lakshmikunda"] },
          { name: "Bera", areas: ["Bera", "Kasipur", "Nakalia"] },
          { name: "Bhangura", areas: ["Bhangura", "Dilpasar", "Parmanandapur"] },
          { name: "Chatmohar", areas: ["Chatmohar", "Handial", "Barabaldia"] },
          { name: "Faridpur", areas: ["Faridpur", "Dogachhi", "Hadal"] },
          { name: "Ishwardi", areas: ["Ishwardi", "Paksey", "Dashuria", "Sara"] },
          { name: "Santhia", areas: ["Santhia", "Dhalar", "Khetupara"] },
          { name: "Sujanagar", areas: ["Sujanagar", "Dulai", "Manikhat"] },
        ],
      },
      {
        name: "Sirajganj",
        thanas: [
          { name: "Sirajganj Sadar", areas: ["Sirajganj Town", "Khukni", "Mechhra", "Ratankandi"] },
          { name: "Belkuchi", areas: ["Belkuchi", "Enayetpur", "Bhangabari"] },
          { name: "Chauhali", areas: ["Chauhali", "Sthal", "Khasrajbari"] },
          { name: "Kamarkhanda", areas: ["Kamarkhanda", "Dhangara", "Sohagpur"] },
          { name: "Kazipur", areas: ["Kazipur", "Meghai", "Gandhail"] },
          { name: "Raiganj", areas: ["Raiganj", "Chandaikona", "Dhubil"] },
          { name: "Shahjadpur", areas: ["Shahjadpur", "Potajia", "Sonamukhi"] },
          { name: "Tarash", areas: ["Tarash", "Naogaon", "Moshinda"] },
          { name: "Ullahpara", areas: ["Ullahpara", "Salanga", "Hatikumrul"] },
        ],
      },
    ],
  },

  // ═══════════════════════════════════════
  // 7. RANGPUR DIVISION
  // ═══════════════════════════════════════
  {
    name: "Rangpur",
    nameBn: "রংপুর",
    districts: [
      {
        name: "Rangpur",
        thanas: [
          { name: "Badarganj", areas: ["Badarganj", "Ramnathpur", "Bishnupur", "Kutubpur"] },
          { name: "Gangachara", areas: ["Gangachara", "Gajaghanta", "Nohali", "Kolkanda"] },
          { name: "Kaunia", areas: ["Kaunia", "Tepa Madhupur", "Sahebganj"] },
          { name: "Mithapukur", areas: ["Mithapukur", "Ballapara", "Payrabondh"] },
          { name: "Pirgachha", areas: ["Pirgachha", "Chattracol", "Kabilpur", "Annodanagar"] },
          { name: "Pirganj", areas: ["Pirganj", "Ramnath Hat", "Chattra"] },
          { name: "Rangpur Sadar", areas: ["Rangpur Town"] },
          { name: "Taraganj", areas: ["Taraganj", "Ekarchali", "Haridev", "Kursha"] },
        ],
        metroThanas: [
          { name: "Kotwali", areas: ["Burirhat", "Chabbis Hazari", "Jahaj Company", "Nababgonj", "Jummapara", "Khalifapara"] },
          { name: "Tajhat", areas: ["Tajhat", "Ganeshpur", "Babukha", "DC More", "Adarshapara"] },
          { name: "Mahiganj", areas: ["Mahiganj", "Dhap", "Kellabond", "Shimulbag", "Keranipara"] },
          { name: "Parshuram", areas: ["Parshuram", "Modern", "Ashratpur", "Alamnagar", "Robertsonganj"] },
          { name: "Haragach", areas: ["Haragach", "Lalbagh", "Khamarpara", "Islampur"] },
          { name: "Hazirhat", areas: ["Hazirhat", "CO Bazar", "Uttam", "Panadardighi"] },
        ],
      },
      {
        name: "Dinajpur",
        thanas: [
          { name: "Dinajpur Sadar", areas: ["Dinajpur Town", "Chehelgazi", "Auliapur", "Pulhat", "Balubari"] },
          { name: "Biral", areas: ["Biral", "Mangalpur", "Palashbari"] },
          { name: "Birampur", areas: ["Birampur", "Bhognagar", "Mominpur"] },
          { name: "Birganj", areas: ["Birganj", "Sator", "Bherbheri"] },
          { name: "Bochaganj", areas: ["Bochaganj", "Rangapur", "Manmathapur"] },
          { name: "Chirirbandar", areas: ["Chirirbandar", "Elahipur", "Saitara"] },
          { name: "Fulbari", areas: ["Fulbari", "Daulatpur", "Shobhnagar"] },
          { name: "Ghoraghat", areas: ["Ghoraghat", "Singhara", "Nayabad"] },
          { name: "Hakimpur", areas: ["Hakimpur", "Alokdihi", "Razarampur"] },
          { name: "Kaharole", areas: ["Kaharole", "Sundarpur", "Raniganj"] },
          { name: "Khansama", areas: ["Khansama", "Angarpara", "Goaldihi"] },
          { name: "Nawabganj", areas: ["Nawabganj", "Balapara", "Daudpur"] },
          { name: "Parbatipur", areas: ["Parbatipur", "Habra", "Mominpur"] },
        ],
      },
      {
        name: "Gaibandha",
        thanas: [
          { name: "Gaibandha Sadar", areas: ["Gaibandha Town", "Kholahati", "Kamarpara"] },
          { name: "Fulchhari", areas: ["Fulchhari", "Erendabari", "Fazlupur", "Udakhali"] },
          { name: "Gobindaganj", areas: ["Gobindaganj", "Kachua", "Mahimaganj"] },
          { name: "Palashbari", areas: ["Palashbari", "Monohorpur", "Bharatkhali"] },
          { name: "Sadullapur", areas: ["Sadullapur", "Kamardaha", "Naldanga"] },
          { name: "Saghata", areas: ["Saghata", "Bonarpara", "Muktinagar"] },
          { name: "Sundarganj", areas: ["Sundarganj", "Bamandanga", "Belka", "Kuptala"] },
        ],
      },
      {
        name: "Kurigram",
        thanas: [
          { name: "Kurigram Sadar", areas: ["Kurigram Town", "Pandul", "Mogalbasa"] },
          { name: "Bhurungamari", areas: ["Bhurungamari", "Bangasonahat", "Joymonirhat"] },
          { name: "Char Rajibpur", areas: ["Char Rajibpur", "Kodalkati", "Ranichar"] },
          { name: "Chilmari", areas: ["Chilmari", "Ashtamir Char", "Ramna"] },
          { name: "Nageshwari", areas: ["Nageshwari", "Bhitarband", "Raiganj"] },
          { name: "Phulbari", areas: ["Phulbari", "Baravita", "Kashipur"] },
          { name: "Rajarhat", areas: ["Rajarhat", "Chhinai", "Ghogadaha"] },
          { name: "Raomari", areas: ["Raomari", "Rajibpur", "Dantbhanga"] },
          { name: "Ulipur", areas: ["Ulipur", "Hatia", "Bazra", "Durgapur"] },
        ],
      },
      {
        name: "Lalmonirhat",
        thanas: [
          { name: "Lalmonirhat Sadar", areas: ["Lalmonirhat Town", "Mogalhat", "Kulaghat", "Barobari"] },
          { name: "Aditmari", areas: ["Aditmari", "Palashi", "Mohishkhocha"] },
          { name: "Hatibandha", areas: ["Hatibandha", "Sindurna", "Nowdabash"] },
          { name: "Kaliganj", areas: ["Kaliganj", "Bhotemari", "Dalagram", "Kakina"] },
          { name: "Patgram", areas: ["Patgram", "Dahagram", "Burimari", "Kuchlibari"] },
        ],
      },
      {
        name: "Nilphamari",
        thanas: [
          { name: "Nilphamari Sadar", areas: ["Nilphamari Town", "Sonaray", "Putimari", "Garagram"] },
          { name: "Dimla", areas: ["Dimla", "Gayabari", "Tepakharibari"] },
          { name: "Domar", areas: ["Domar", "Boragari", "Pancha Pir"] },
          { name: "Jaldhaka", areas: ["Jaldhaka", "Balagram", "Kaimail"] },
          { name: "Kishoreganj", areas: ["Kishoreganj", "Balapara", "Srirampur"] },
          { name: "Saidpur", areas: ["Saidpur", "Saidpur Cantonment", "Kamarpukur", "Botlagari"] },
        ],
      },
      {
        name: "Panchagarh",
        thanas: [
          { name: "Panchagarh Sadar", areas: ["Panchagarh Town", "Amarkhana", "Hafizabad"] },
          { name: "Atwari", areas: ["Atwari", "Torany", "Mirjapur"] },
          { name: "Boda", areas: ["Boda", "Chandanbari", "Sakoa"] },
          { name: "Debiganj", areas: ["Debiganj", "Tepriganj", "Sonahat"] },
          { name: "Tetulia", areas: ["Tetulia", "Banglabandha", "Bhajan Pur"] },
        ],
      },
      {
        name: "Thakurgaon",
        thanas: [
          { name: "Thakurgaon Sadar", areas: ["Thakurgaon Town", "Ruhia", "Akhanagar", "Rajagaon"] },
          { name: "Baliadangi", areas: ["Baliadangi", "Amgaon", "Charol"] },
          { name: "Haripur", areas: ["Haripur", "Gedura", "Dholarhat"] },
          { name: "Pirganj", areas: ["Pirganj", "Jamalpur", "Kotwalihat"] },
          { name: "Ranisankail", areas: ["Ranisankail", "Nekmorod", "Lehemba"] },
        ],
      },
    ],
  },

  // ═══════════════════════════════════════
  // 8. SYLHET DIVISION
  // ═══════════════════════════════════════
  {
    name: "Sylhet",
    nameBn: "সিলেট",
    districts: [
      {
        name: "Sylhet",
        thanas: [
          { name: "Balaganj", areas: ["Balaganj", "Tajpur", "Burunga", "Dewan Bazar"] },
          { name: "Beanibazar", areas: ["Beanibazar", "Kurar Bazar", "Mathiura", "Sheola"] },
          { name: "Bishwanath", areas: ["Bishwanath", "Deokalas", "Lama Kazi"] },
          { name: "Companiganj", areas: ["Companiganj", "Islampur", "Purba Jaflong"] },
          { name: "Dakshin Surma", areas: ["Dakshin Surma", "Tettli", "Mogla Bazar", "Silam"] },
          { name: "Fenchuganj", areas: ["Fenchuganj", "Maijgaon", "Ghilachhara"] },
          { name: "Golapganj", areas: ["Golapganj", "Lakshmi Pasha", "Bhadeshwar"] },
          { name: "Gowainghat", areas: ["Gowainghat", "Jaflong", "Panchgram", "Fatehpur"] },
          { name: "Jaintiapur", areas: ["Jaintiapur", "Chiknagul", "Nijpat", "Fatehpur"] },
          { name: "Kanaighat", areas: ["Kanaighat", "Durbinnagar", "Laxmiprasad", "Satbak"] },
          { name: "Osmani Nagar", areas: ["Osmani Nagar", "Dayamir", "Paigaon"] },
          { name: "Sylhet Sadar", areas: ["Sylhet Town"] },
          { name: "Zakiganj", areas: ["Zakiganj", "Barsala", "Kazinagar", "Sultanpur"] },
        ],
        metroThanas: [
          { name: "Kotwali", areas: ["Zindabazar", "Bandar Bazar", "Laldighirpar", "Dhopadighir Par", "Subhanighat", "Baruthkhana"] },
          { name: "South Surma", areas: ["Mogla Bazar", "Kazitula", "Kumarpara", "Mirabazar", "Chowhatta"] },
          { name: "Moglabazar", areas: ["Moglabazar", "Kazitula", "Manikpir Tila", "Loharpara"] },
          { name: "Jalalabad", areas: ["Jalalabad R/A", "Pathantula", "Sagardighir Par", "Akhalia", "Shamimabad"] },
          { name: "Bimanbandar", areas: ["Airport", "Ambarkhana", "Dattapara", "Housing Estate", "Badam Bagicha"] },
          { name: "Shah Poran", areas: ["Shah Poran", "Shahjalal Upashahar", "Subidbazar", "Police Line", "Tilagarh"] },
        ],
      },
      {
        name: "Habiganj",
        thanas: [
          { name: "Habiganj Sadar", areas: ["Habiganj Town", "Gopaya", "Nizampur", "Shahajibazar"] },
          { name: "Ajmiriganj", areas: ["Ajmiriganj", "Kakailseo", "Sirajnagar"] },
          { name: "Bahubal", areas: ["Bahubal", "Satkapan", "Lamatashi"] },
          { name: "Baniachang", areas: ["Baniachang", "Daulatpur", "Mandari", "Subidpur"] },
          { name: "Chunarughat", areas: ["Chunarughat", "Shatiarkhola", "Deorgachh", "Ahmadabad"] },
          { name: "Lakhai", areas: ["Lakhai", "Bamoi", "Karaiuri", "Muriauk"] },
          { name: "Madhabpur", areas: ["Madhabpur", "Shahpur", "Gayeshpur"] },
          { name: "Nabiganj", areas: ["Nabiganj", "Debpara", "Inatganj"] },
          { name: "Shaistaganj", areas: ["Shaistaganj", "Lakshipasha", "Laskerpur"] },
        ],
      },
      {
        name: "Moulvibazar",
        thanas: [
          { name: "Moulvibazar Sadar", areas: ["Moulvibazar Town", "Monumukh", "Kamalpur", "Chandnighat"] },
          { name: "Barlekha", areas: ["Barlekha", "Sujanagar", "Dakshinbhag"] },
          { name: "Juri", areas: ["Juri", "Fultala", "Goalbari"] },
          { name: "Kamalganj", areas: ["Kamalganj", "Shamshernagar", "Munshibazar", "Adampur"] },
          { name: "Kulaura", areas: ["Kulaura", "Prithimpasha", "Bhatera", "Hakaluki Haor"] },
          { name: "Rajnagar", areas: ["Rajnagar", "Monumukh", "Kamarchak"] },
          { name: "Sreemangal", areas: ["Sreemangal", "Kalighat", "Sindurkhana", "Lawachara"] },
        ],
      },
      {
        name: "Sunamganj",
        thanas: [
          { name: "Sunamganj Sadar", areas: ["Sunamganj Town", "Surma", "Pagla", "Patharia"] },
          { name: "Bishwamvarpur", areas: ["Bishwamvarpur", "Palash", "Fenarbak", "Dhanpur"] },
          { name: "Chhatak", areas: ["Chhatak", "Gobindganj", "Noarai"] },
          { name: "Derai", areas: ["Derai", "Rafinagar", "Kulanj", "Jagddal"] },
          { name: "Dharamapasha", areas: ["Dharamapasha", "Selborosh", "Madhanagar"] },
          { name: "Dowarabazar", areas: ["Dowarabazar", "Lakshmansree", "Pandargaon"] },
          { name: "Jagannathpur", areas: ["Jagannathpur", "Raniganj", "Syedpur", "Haldipur"] },
          { name: "Jamalganj", areas: ["Jamalganj", "Sachnabazar", "Bhimkhali"] },
          { name: "Shalla", areas: ["Shalla", "Habibpur", "Damerpara"] },
          { name: "Tahirpur", areas: ["Tahirpur", "Tekerghat", "Badarpur"] },
        ],
      },
    ],
  },
];
