import { useState, useEffect, useRef } from "react";

// ── SUPABASE CLIENT ───────────────────────────────────────────────────────────
const SUPA_URL="https://aapbbeqwnnhmhedsgryt.supabase.co";
const SUPA_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFhcGJiZXF3bm5obWhlZHNncnl0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY2NzU3ODAsImV4cCI6MjA5MjI1MTc4MH0.bBdSvBdXeC_hqmE9syeeFYzmIHCVZlHUsh4_RX6zNH8";
async function sbFetch(path,opts={}){
  const {method="GET",body,params,upsert}=opts;
  let url=`${SUPA_URL}/rest/v1/${path}`;
  if(params)url+="?"+new URLSearchParams(params).toString();
  const prefer=[];
  if(method==="POST"||method==="PATCH")prefer.push("return=representation");
  if(upsert)prefer.push("resolution=merge-duplicates");
  const res=await fetch(url,{method,headers:{"apikey":SUPA_KEY,"Authorization":`Bearer ${SUPA_KEY}`,"Content-Type":"application/json","Prefer":prefer.join(",")},body:body?JSON.stringify(body):undefined});
  if(res.status===204)return null;
  const data=await res.json();
  if(!res.ok){console.warn("Supabase error:",JSON.stringify(data));return null;}
  return data;
}
function pkgToRow(p){return{id:p.id,country_id:p.countryId,name:p.name,route:p.route,nights:p.nights,duration:p.duration,is_active:p.isActive!==false,flights:p.flights||[],hotels:p.hotels||[],transfers:p.transfers||[],included_activities:p.includedActivities||[],addons:p.addons||[],base_prices:p.basePrices||{},itinerary_days:p.itineraryDays||[],default_inclusions:p.defaultInclusions||[],default_exclusions:p.defaultExclusions||[]};}
function rowToPkg(r){return{id:r.id,countryId:r.country_id,name:r.name,route:r.route,nights:r.nights||4,duration:r.duration||((r.nights||4)+1)+" Days / "+(r.nights||4)+" Nights",isActive:r.is_active!==false,flights:r.flights||[],hotels:r.hotels||[],transfers:r.transfers||[],includedActivities:r.included_activities||[],addons:r.addons||[],basePrices:r.base_prices||{adult:0,child_5_11:0,child_2_4:0,infant:0},itineraryDays:r.itinerary_days||[],defaultInclusions:r.default_inclusions||[],defaultExclusions:r.default_exclusions||[]};}
const DB={
  getPkgs:()=>sbFetch("packages?order=name"),
  savePkg:(p)=>sbFetch("packages",{method:"POST",body:pkgToRow(p),params:{on_conflict:"id"},upsert:true}).then(r=>r&&r[0]),
  delPkg:(id)=>sbFetch(`packages?id=eq.${id}`,{method:"DELETE"}),
  getDiscounts:()=>sbFetch("discounts?order=name"),
  saveDiscount:(d)=>sbFetch("discounts",{method:"POST",body:d,params:{on_conflict:"id"},upsert:true}).then(r=>r&&r[0]),
  delDiscount:(id)=>sbFetch(`discounts?id=eq.${id}`,{method:"DELETE"}),
  getReferrals:()=>sbFetch("referral_codes?order=code"),
  saveReferral:(r)=>sbFetch("referral_codes",{method:"POST",body:r,params:{on_conflict:"id"},upsert:true}).then(r=>r&&r[0]),
  delReferral:(id)=>sbFetch(`referral_codes?id=eq.${id}`,{method:"DELETE"}),
  saveQuote:(q)=>sbFetch("quotes",{method:"POST",body:q}).then(r=>r&&r[0]),
};

const LOGO_LIGHT = null;
const LOGO_DARK = null;

const B = {
  teal:"#0496a5",tealDark:"#036e7a",tealLight:"#e8f7f9",tealXLight:"#f0fbfc",blue:"#1e98f7",blueLight:"#e8f3ff",mint:"#24fbaa",cyan:"#29FFFF",orange:"#f3792a",orangeLight:"#fff4ee",white:"#ffffff",offWhite:"#f4fafb",bg:"#f0f8fa",text:"#0d2e33",textMid:"#3a6570",textLight:"#7aabb5",border:"#c8e8ed",
};
const COUNTRY_CURRENCY = {
  th:{code:"THB",symbol:"฿",name:"Thai Baht"},my:{code:"MYR",symbol:"RM",name:"Malaysian Ringgit"},id:{code:"IDR",symbol:"Rp",name:"Indonesian Rupiah"},sg:{code:"SGD",symbol:"S$",name:"Singapore Dollar"},
};
const FALLBACK_RATES = {THB:0.3425,MYR:0.055,IDR:175,SGD:0.016};
const C = {
  bg:"#F7F5F0",card:"#FFFFFF",ink:"#1C1C1A",muted:"#8A8A80",accent:"#0496a5",accentLight:"#E5F7F9",teal:"#0496a5",tealLight:"#E5F5F2",gold:"#C99A2E",goldLight:"#FEF7E6",blue:"#1e98f7",blueLight:"#EAF1FB",purple:"#7044C9",purpleLight:"#F1ECFB",orange:"#f3792a",orangeLight:"#FFF0E6",mint:"#24fbaa",mintLight:"#E8FFF6",border:"#EAEAE6",red:"#D94141",redLight:"#FEECEC",green:"#047857",greenLight:"#DEF7EC",
};

const PAX_KEYS = ["adult","child_5_11","child_2_4","infant"];
const PAX_LABELS = {adult:"Adult",child_5_11:"Child (5–11)",child_2_4:"Child (2–4)",infant:"Infant"};
const PAX_ICONS  = {adult:"👤",child_5_11:"🧒",child_2_4:"👶",infant:"🍼"};
const STAR_LABEL = {3:"3★ Standard",4:"4★ Superior",5:"5★ / Resort"};
const STAR_COLOR = {3:B.teal,4:B.blue,5:B.orange};
const ROLE_COLOR = {admin:B.teal,hotel:B.blue,ops:B.mint,sales:B.orange};

function sp(cost,markup,markupType){
  if(!cost)return 0;
  return markupType==="percent"?Math.round(cost*(1+markup/100)):cost+markup;
}
function fmtINR(n){return "₹"+Math.round(Number(n)||0).toLocaleString("en-IN");}
function uid(){return Date.now().toString(36)+Math.random().toString(36).slice(2,6);}
function toINR(amount,rate){if(!rate)return amount;return Math.round(amount/rate);}
function toLocal(amountINR,rate){if(!rate)return amountINR;return Math.round(amountINR*rate);}

const INIT = {
  countries:[
    {id:"th",name:"Thailand",flag:"🇹🇭"},
    {id:"my",name:"Malaysia",flag:"🇲🇾"},
    {id:"id",name:"Indonesia",flag:"🇮🇩"},
    {id:"sg",name:"Singapore",flag:"🇸🇬"},
  ],packages:[{
    id:"pkg1",countryId:"th",name:"PHUKET EXPERIENCE PLUS",route:"Bangalore / Mumbai ↔ Phuket",duration:"5 Days / 4 Nights",isActive:true,nights:4,flights:[
      {id:"f1",name:"Bangalore → Phuket",airline:"IndiGo",costPerPaxINR:30000,isDefault:true},
      {id:"f2",name:"Bangalore → Phuket",airline:"Air Asia",costPerPaxINR:30000,isDefault:false},
      {id:"f3",name:"Mumbai → Phuket",airline:"IndiGo",costPerPaxINR:30000,isDefault:false},
    ],hotels:[
      {id:"h1",name:"Sunshine Patong",star:3,costPerNightINR:4000,markup:0,markupType:"percent",isDefault:true,isDynamic:false},
      {id:"h2",name:"Best Western Patong",star:4,costPerNightINR:6250,markup:0,markupType:"percent",isDefault:false,isDynamic:false},
      {id:"h3",name:"5★ Resort (Daily Rate)",star:5,costPerNightINR:0,markup:0,markupType:"percent",isDefault:false,isDynamic:true},
    ],transfers:[
      {id:"t1",name:"Airport → Hotel",costPerVanINR:3787,maxPax:8,isDefault:true},
      {id:"t2",name:"Hotel → Patong & Patong → Hotel (5 hrs)",costPerVanINR:4369,maxPax:8,isDefault:true},
      {id:"t3",name:"Private Transfer to Panwaburi Resort from Patong",costPerVanINR:4369,maxPax:8,isDefault:false},
      {id:"t4",name:"Panwaburi Resort → Airport",costPerVanINR:3495,maxPax:8,isDefault:false},
      {id:"t5",name:"Panwaburi → Airport via Old Town, Central Mall & Dolphin Show (5 hrs)",costPerVanINR:7283,maxPax:8,isDefault:false},
    ],includedActivities:[
      {id:"ia1",name:"Phi Phi Island Tour (7 Islands, Breakfast & Lunch)",costPerPaxINR:4078,kidCostPerPaxINR:2500},
      {id:"ia2",name:"City Tour with Tiger Kingdom",costPerPaxINR:3787,kidCostPerPaxINR:2000},
      {id:"ia3",name:"Dolphin Show",costPerPaxINR:1602,kidCostPerPaxINR:1000},
    ],addons:[
      {id:"a1",name:"James Bond Island",costINR:4078,kidCostINR:2500,markup:20,markupType:"percent",hasQty:false,hasKidPrice:true},
      {id:"a2",name:"Yona Beach Club (Men)",costINR:11652,kidCostINR:0,markup:20,markupType:"percent",hasQty:true,hasKidPrice:false},
      {id:"a3",name:"Yona Beach Club (Women)",costINR:5826,kidCostINR:0,markup:20,markupType:"percent",hasQty:true,hasKidPrice:false},
      {id:"a4",name:"Adventure Package",costINR:3500,kidCostINR:2000,markup:20,markupType:"percent",hasQty:false,hasKidPrice:true},
      {id:"a5",name:"Scuba Dive",costINR:6000,kidCostINR:0,markup:20,markupType:"percent",hasQty:false,hasKidPrice:false},
      {id:"a6",name:"Magic Carnival",costINR:7575,kidCostINR:4000,markup:20,markupType:"percent",hasQty:false,hasKidPrice:true},
    ],basePrices:{adult:58000,child_5_11:49000,child_2_4:40000,infant:3000},
  },{
    id:"pkg2",countryId:"my",
    name:"Malaysia Getaway",
    route:"Kochi 🔄 Kuala Lumpur",
    nights:3,
    duration:"4 Days / 3 Nights",
    isActive:true,
    flights:[
      {id:"mf1",name:"Kochi → KL Return",airline:"IndiGo",costPerPaxINR:20000,markup:0,markupType:"percent",isDefault:true},
    ],
    hotels:[
      {id:"mh1",name:"Deface Platinum 2",star:5,costPerNightINR:17000,markup:0,markupType:"percent",isDefault:true,breakfast:true},
      {id:"mh2",name:"Ceylonz Suites",star:5,costPerNightINR:17000,markup:0,markupType:"percent",isDefault:false,breakfast:true},
    ],
    transfers:[
      {id:"mt1",name:"Airport Arrival Transfer",from:"KL International Airport",to:"Hotel",vehicle:"18-Seater A/C Coach",costPerVanINR:45455,isDefault:true,note:"Meet representative at arrival hall"},
      {id:"mt2",name:"Airport Departure Transfer",from:"Hotel",to:"KL International Airport",vehicle:"18-Seater A/C Coach",costPerVanINR:45455,isDefault:true,note:"Pickup from hotel lobby"},
    ],
    includedActivities:[
      {id:"ma1",name:"Genting Highland Cable Car (2-Way)",costPerPaxINR:909,kidCostPerPaxINR:545,hasKidPrice:true},
    ],
    addons:[],
    defaultInclusions:[
      "✈ Return flight tickets (7kg hand baggage only)",
      "🇲🇾 Malaysian Pass",
      "🏨 3 nights accommodation in Kuala Lumpur (5★)",
      "🚌 Arrival & departure transfers (A/C Coach)",
      "🌆 KL day & night city tour with chocolate gallery",
      "🏔 Full day Batu Caves & Genting Highland trip",
      "🚡 2-way Genting Highland cable car tickets",
      "🕌 En route Putrajaya photo stop tour",
    ],
    defaultExclusions:[
      "🍽 Food & entrance fees (Note: food is very cheap in Malaysia)",
      "Anything not mentioned in inclusions",
      "5% GST and 2% TCS",
    ],
    basePrices:{adult:40000,child_5_11:33000,child_2_4:28000,infant:3000},
    itineraryDays:[
      {id:"md1",title:"Arrival & City Highlights",emoji:"✈",location:"Kuala Lumpur",transfers:[{id:"mt1",from:"KL International Airport",to:"Hotel",vehicle:"18-Seater A/C Coach",note:"Meet representative at arrival hall"}],bulletNotes:["Arrive at KL International Airport, meet our representative.","Check in at hotel. Freshen up with early check-in facility.","Evening city tour covering Twin Towers, Jalan Alor Night Street, Bukit Bintang & Saloma Bridge.","Experience KL's vibrant nightlife and street food scene."],activities:[{id:"ma1",name:"Petronas Twin Towers",duration:"1 hr",ticketIncluded:false,photo:"",description:"Iconic twin skyscrapers — best viewed from KLCC Park at night.",notes:[]},{id:"ma2",name:"Jalan Alor Night Street",duration:"1.5 hr",ticketIncluded:false,photo:"",description:"KL's famous food street — diverse local flavors amid vibrant city lights.",notes:[]},{id:"ma3",name:"Bukit Bintang",duration:"1.5 hr",ticketIncluded:false,photo:"",description:"Heart of KL's shopping and entertainment district.",notes:[]},{id:"ma4",name:"Saloma Bridge",duration:"30 min",ticketIncluded:false,photo:"",description:"Beautiful illuminated pedestrian bridge over Klang River.",notes:[]}],stay:{name:"Deface Platinum 2 / Ceylonz Suites",checkInTime:"2:00 PM",checkOutTime:"11:00 AM",nights:3,breakfast:true,photo:""},leisure:"Explore the vibrant streets of KL at your own pace ✨",photos:[],textBlocks:[]},
      {id:"md2",title:"Nature & Culture — Genting & Batu Caves",emoji:"🏔",location:"Genting Highland & Batu Caves",transfers:[{id:"mt2",from:"Hotel",to:"Genting Highland",vehicle:"18-Seater A/C Coach",note:"Early morning departure at 7:00 AM"},{id:"mt3",from:"Genting Highland",to:"Batu Caves",vehicle:"18-Seater A/C Coach",note:"Afternoon transfer"}],bulletNotes:["Early morning departure to Genting Highland — cool mountain escape at 1,800m altitude.","2-way cable car tickets included — enjoy panoramic views of the rainforest.","Visit Chin Swee Cave Temple — a stunning Taoist temple perched on the hillside.","Afternoon visit to Batu Caves — 272 steps to the iconic golden statue and limestone caverns.","Return to hotel by evening."],activities:[{id:"ma5",name:"Genting Highland",duration:"3 hr",ticketIncluded:false,photo:"",description:"Perched in cool mountains — entertainment hub with casinos, theme parks and mountain views.",notes:[]},{id:"ma6",name:"Genting Highland Cable Car (2-Way)",duration:"30 min",ticketIncluded:true,photo:"",description:"Scenic cable car ride with panoramic rainforest views — tickets included.",notes:[]},{id:"ma7",name:"Chin Swee Cave Temple",duration:"1 hr",ticketIncluded:false,photo:"",description:"Beautiful Taoist temple with nine-tier pagoda and stunning hilltop views.",notes:[]},{id:"ma8",name:"Batu Caves",duration:"1.5 hr",ticketIncluded:false,photo:"",description:"Iconic limestone cave temple complex with 272 steps and giant golden Murugan statue.",notes:[]}],stay:null,leisure:"",photos:[],textBlocks:[]},
      {id:"md3",title:"KL Urban Wonders",emoji:"🌆",location:"Kuala Lumpur City",transfers:[{id:"mt4",from:"Hotel",to:"City Tour",vehicle:"18-Seater A/C Coach",note:"Depart at 9:00 AM"}],bulletNotes:["Full day KL city tour covering iconic landmarks.","Visit KLCC Aquaria — stunning underwater tunnel with marine life.","KL Tower observation deck — bridges tradition with modern skyline views.","Independence Square — heart of KL's national heritage.","King's Palace photo stop, National Mosque, National Monument.","Thean Hou Temple — serene Chinese temple with beautiful architecture."],activities:[{id:"ma9",name:"KLCC Aquaria",duration:"1.5 hr",ticketIncluded:false,photo:"",description:"Stunning aquarium beneath KLCC with a walk-through underwater tunnel.",notes:[]},{id:"ma10",name:"KL Tower",duration:"1 hr",ticketIncluded:false,photo:"",description:"338m tower offering panoramic views of KL skyline.",notes:[]},{id:"ma11",name:"Independence Square",duration:"30 min",ticketIncluded:false,photo:"",description:"Historic Dataran Merdeka — where Malaysia's independence was declared.",notes:[]},{id:"ma12",name:"Thean Hou Temple",duration:"45 min",ticketIncluded:false,photo:"",description:"Six-tiered Chinese temple dedicated to the Goddess of Heaven.",notes:[]}],stay:null,leisure:"",photos:[],textBlocks:[]},
      {id:"md4",title:"Departure — Chinatown & Putrajaya",emoji:"🛫",location:"KL & Airport",transfers:[{id:"mt5",from:"Hotel",to:"Chinatown & Central Market",vehicle:"18-Seater A/C Coach",note:"Morning tour"},{id:"mt6",from:"Central Market",to:"Putrajaya",vehicle:"18-Seater A/C Coach",note:"En route photo stop"},{id:"mt7",from:"Putrajaya",to:"KL International Airport",vehicle:"18-Seater A/C Coach",note:"Drop-off for departure flight"}],bulletNotes:["Morning visit to Chinatown and Petaling Street — souvenir shopping paradise.","Central Market — traditional crafts, art and local cuisines.","En route Putrajaya photo stop — Malaysia's stunning modern administrative capital.","Drop-off at KL International Airport. Safe travels!"],activities:[{id:"ma13",name:"Chinatown & Petaling Street",duration:"1 hr",ticketIncluded:false,photo:"",description:"Bustling district with diverse street markets and local delights.",notes:[]},{id:"ma14",name:"Central Market",duration:"45 min",ticketIncluded:false,photo:"",description:"Traditional crafts, art and local cuisines in the heart of KL.",notes:[]},{id:"ma15",name:"Putrajaya Photo Stop",duration:"30 min",ticketIncluded:false,photo:"",description:"Malaysia's modern administrative capital with striking architecture and scenic landscapes.",notes:[]}],stay:null,leisure:"Until the next adventure! Bon Voyage! 🌟",photos:[],textBlocks:[]},
    ],
  }],discounts:[
    {id:"d1",name:"Staff Discount",type:"percent",value:10},
    {id:"d2",name:"Early Bird Offer",type:"percent",value:5},
    {id:"d3",name:"Group Discount",type:"fixed",value:5000},
  ],referralCodes:[
    {id:"r1",code:"SUMMER24",name:"Summer 2024",type:"percent",value:5,active:true},
    {id:"r2",code:"KT2025",name:"KT Launch",type:"fixed",value:3000,active:true},
  ],
};

const USERS = {
  admin:{password:"admin123",role:"admin",label:"Admin"},hotel:{password:"hotel123",role:"hotel",label:"Hotel Dept"},ops:{password:"ops123",role:"ops",label:"Operations"},sales:{password:"sales123",role:"sales",label:"Sales"},
};

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Poppins:ital,wght@0,400;0,500;0,600;0,700;0,800;1,400&family=Playfair+Display:ital,wght@0,700;1,700&display=swap');
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;-webkit-tap-highlight-color:transparent;}
  html,body{background:#f0f8fa;overflow-x:hidden;}
  input,select{-webkit-appearance:none;appearance:none;font-family:'Poppins',sans-serif;}
  input[type=number]::-webkit-inner-spin-button{display:none;}
  select option{background:#fff;color:#0d2e33;}
  ::-webkit-scrollbar{width:0;}
  @media print{.noprint{display:none!important;}body{background:white!important;}}
  .safe-top{padding-top:env(safe-area-inset-top,0px);}
  .safe-bottom{padding-bottom:env(safe-area-inset-bottom,0px);}
`;

// ── LOGO (with fallback) ──────────────────────────────────────────────────────
const KT_LOGO_SRC="https://aapbbeqwnnhmhedsgryt.supabase.co/storage/v1/object/public/photos/IMG_2310.jpg";
const KT_LOGO_DARK_SRC="https://aapbbeqwnnhmhedsgryt.supabase.co/storage/v1/object/public/photos/IMG_2309.PNG";
function KTLogoLight({h=48}){
  const w=Math.round(h*2.38);
  const [err,setErr]=useState(false);
  if(err) return <div style={{height:h,display:"flex",alignItems:"center",fontWeight:800,fontSize:Math.round(h*0.3),color:B.teal,letterSpacing:0.5,fontFamily:"'Poppins',sans-serif"}}>Kairali Trails</div>;
  return <img src={KT_LOGO_SRC} alt="Kairali Trails" crossOrigin="anonymous" onError={()=>setErr(true)} style={{height:h,width:w,objectFit:"contain",display:"block"}}/>;
}
function KTLogoDark({h=56}){
  const w=Math.round(h*2.38);
  const [err,setErr]=useState(false);
  if(err) return <div style={{height:h,display:"flex",alignItems:"center",fontWeight:800,fontSize:Math.round(h*0.3),color:"#fff",letterSpacing:0.5,fontFamily:"'Poppins',sans-serif"}}>Kairali Trails</div>;
  return <img src={KT_LOGO_DARK_SRC} alt="Kairali Trails" crossOrigin="anonymous" onError={()=>setErr(true)} style={{height:h,width:w,objectFit:"contain",display:"block"}}/>;
}

function Shell({children,user,onLogout,fxRates,rateError,subtitle,onBack}){
  return(
    <div style={{minHeight:"100vh",background:B.bg,fontFamily:"'Poppins',sans-serif",color:B.text,maxWidth:393,margin:"0 auto",display:"flex",flexDirection:"column"}}>
      <style>{css}</style>
      <div style={{height:"max(50px,env(safe-area-inset-top,50px))",background:B.white,flexShrink:0}}/>
      <div style={{background:B.white,padding:"8px 16px 8px 16px",flexShrink:0,borderBottom:`2px solid ${B.tealLight}`,boxShadow:"0 2px 8px rgba(4,150,165,0.08)"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",minHeight:52}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            {onBack&&<button onClick={onBack} style={{background:B.tealLight,border:"none",color:B.teal,fontSize:22,cursor:"pointer",padding:"6px 10px",borderRadius:9,fontWeight:700,flexShrink:0,lineHeight:1}}>‹</button>}
            <div>
              <KTLogoLight h={52}/>
              {subtitle&&<div style={{fontSize:9,color:B.textLight,marginTop:2,fontWeight:600,letterSpacing:1}}>{subtitle}</div>}
            </div>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:6}}>
            <div style={{background:ROLE_COLOR[user.role]+"18",color:ROLE_COLOR[user.role],borderRadius:20,padding:"3px 9px",fontSize:11,fontWeight:700}}>{user.label}</div>
            <button onClick={onLogout} style={{background:B.tealLight,border:"none",color:B.teal,fontSize:15,cursor:"pointer",padding:"6px 10px",borderRadius:9}}>⏻</button>
          </div>
        </div>
      </div>
      <div style={{flex:1,overflowY:"auto",padding:"14px",paddingBottom:50}}>{children}</div>
    </div>
  );
}

function Card({children,style,accent}){return <div style={{background:B.white,border:`1.5px solid ${accent?accent+"44":B.border}`,borderRadius:16,padding:"14px",marginBottom:10,boxShadow:"0 1px 8px #0496a506",...style}}>{children}</div>;}
function SL({children,color}){return <div style={{fontSize:10,color:color||B.teal,letterSpacing:2,fontWeight:700,marginBottom:8,textTransform:"uppercase"}}>{children}</div>;}
function PT({children,sub}){return <div style={{marginBottom:16}}><div style={{fontWeight:800,fontSize:19,color:B.teal}}>{children}</div>{sub&&<div style={{fontSize:11,color:B.textLight,marginTop:2,fontWeight:500}}>{sub}</div>}</div>;}
function PBtn({children,onClick,style}){return <button onClick={onClick} style={{width:"100%",background:`linear-gradient(135deg,${B.teal},${B.blue})`,color:"#fff",border:"none",padding:"14px",borderRadius:13,fontSize:14,fontWeight:700,cursor:"pointer",...style}}>{children}</button>;}
function SBtn({children,onClick,style}){return <button onClick={onClick} style={{background:B.tealLight,color:B.teal,border:`1.5px solid ${B.border}`,padding:"9px 14px",borderRadius:11,fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"'Poppins',sans-serif",...style}}>{children}</button>;}
function MBtn({children,onClick,style}){return <button onClick={onClick} style={{background:`linear-gradient(135deg,${B.mint},${B.cyan})`,color:B.tealDark,border:"none",padding:"10px 16px",borderRadius:11,fontSize:13,fontWeight:700,cursor:"pointer",...style}}>{children}</button>;}
function DBtn({children,onClick}){return <button onClick={onClick} style={{background:B.orangeLight,color:B.orange,border:`1px solid ${B.orange}33`,padding:"6px 11px",borderRadius:9,fontSize:12,cursor:"pointer",fontFamily:"'Poppins',sans-serif",fontWeight:600}}>{children}</button>;}
function Inp({label,value,onChange,type="text",placeholder,style,note}){return <div style={{marginBottom:11}}>{label&&<div style={{fontSize:10,color:B.textLight,letterSpacing:2,fontWeight:700,marginBottom:4}}>{label}</div>}<input type={type} value={value} onChange={onChange} placeholder={placeholder} style={{background:B.offWhite,border:`1.5px solid ${B.border}`,borderRadius:11,color:B.text,padding:"11px 13px",fontSize:14,width:"100%",outline:"none",fontFamily:"'Poppins',sans-serif",...style}}/>{note&&<div style={{fontSize:10,color:B.textLight,marginTop:3}}>{note}</div>}</div>;}
function Sel({label,value,onChange,children,style}){return <div style={{marginBottom:11}}>{label&&<div style={{fontSize:10,color:B.textLight,letterSpacing:2,fontWeight:700,marginBottom:4}}>{label}</div>}<select value={value} onChange={onChange} style={{background:B.offWhite,border:`1.5px solid ${B.border}`,borderRadius:11,color:B.text,padding:"11px 13px",fontSize:14,width:"100%",outline:"none",fontFamily:"'Poppins',sans-serif",...style}}>{children}</select></div>;}
function Counter({value,onDec,onInc,min=0,max=99}){return <div style={{display:"flex",alignItems:"center",background:B.offWhite,border:`1.5px solid ${B.border}`,borderRadius:11,overflow:"hidden"}}><button onClick={onDec} disabled={value<=min} style={{width:42,height:42,background:"none",border:"none",color:value<=min?B.border:B.teal,fontSize:19,cursor:value<=min?"default":"pointer",fontWeight:700}}>−</button><div style={{width:32,textAlign:"center",fontSize:15,fontWeight:800,color:B.teal}}>{value}</div><button onClick={onInc} disabled={value>=max} style={{width:42,height:42,background:"none",border:"none",color:value>=max?B.border:B.teal,fontSize:19,cursor:value>=max?"default":"pointer",fontWeight:700}}>+</button></div>;}
function Toggle({value,onChange,label}){return <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}><div onClick={onChange} style={{width:44,height:24,borderRadius:12,background:value?B.teal:B.border,cursor:"pointer",position:"relative",flexShrink:0}}><div style={{position:"absolute",top:3,left:value?20:3,width:18,height:18,borderRadius:"50%",background:"white",transition:"left .15s"}}/></div>{label&&<span style={{fontSize:13,color:B.textMid,fontWeight:500}}>{label}</span>}</div>;}
function TabBar({tabs,active,onSelect}){return <div style={{display:"flex",background:B.offWhite,borderRadius:13,padding:4,marginBottom:14,border:`1.5px solid ${B.border}`,overflowX:"auto",gap:2,WebkitOverflowScrolling:"touch",scrollbarWidth:"none"}}>{tabs.map(t=><button key={t.id} onClick={()=>onSelect(t.id)} style={{flexShrink:0,padding:"9px 10px",fontSize:10,fontWeight:700,cursor:"pointer",background:active===t.id?`linear-gradient(135deg,${B.teal},${B.blue})`:"transparent",color:active===t.id?"#fff":B.textLight,border:"none",borderRadius:9,fontFamily:"'Poppins',sans-serif",whiteSpace:"nowrap"}}>{t.label}</button>)}</div>;}
function CGrid({countries,selected,onSelect}){return <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:14}}>{countries.map(c=>{const cur=COUNTRY_CURRENCY[c.id];return <div key={c.id} onClick={()=>onSelect(c.id)} style={{background:selected===c.id?`${B.teal}0f`:B.white,border:`2px solid ${selected===c.id?B.teal:B.border}`,borderRadius:14,padding:"12px 14px",cursor:"pointer",display:"flex",alignItems:"center",gap:12}}><span style={{fontSize:26}}>{c.flag}</span><div style={{flex:1}}><div style={{fontSize:13,fontWeight:700,color:selected===c.id?B.teal:B.text}}>{c.name}</div>{cur&&<div style={{fontSize:10,color:B.textLight,marginTop:1}}>{cur.code}</div>}</div>{selected===c.id&&<div style={{width:9,height:9,borderRadius:"50%",background:B.teal}}/>}</div>;})}</div>;}
function Tag({children,color}){return <span style={{fontSize:10,background:(color||B.teal)+"18",color:color||B.teal,borderRadius:20,padding:"2px 8px",fontWeight:700,display:"inline-block"}}>{children}</span>;}
function DefBadge(){return <span style={{fontSize:9,background:B.mint,color:B.tealDark,borderRadius:20,padding:"2px 7px",fontWeight:800,marginLeft:6}}>DEFAULT</span>;}

function CurrencyInp({label,valueINR,onChange,countryId,fxRates,placeholder}){
  const cur=COUNTRY_CURRENCY[countryId];
  const rate=fxRates?.[cur?.code]||FALLBACK_RATES[cur?.code];
  const [mode,setMode]=useState("INR");
  function handleChange(e){const v=Number(e.target.value)||0;onChange(mode==="INR"?v:toINR(v,rate));}
  const displayVal=mode==="INR"?valueINR:(rate?toLocal(valueINR,rate):valueINR);
  return(
    <div style={{marginBottom:11}}>
      {label&&<div style={{fontSize:10,color:B.textLight,letterSpacing:2,fontWeight:700,marginBottom:4}}>{label}</div>}
      <div style={{display:"flex",border:`1.5px solid ${B.border}`,borderRadius:11,overflow:"hidden",background:B.offWhite}}>
        <input type="number" value={displayVal||""} onChange={handleChange} placeholder={placeholder||"0"} style={{flex:1,background:"transparent",border:"none",color:B.text,padding:"11px 13px",fontSize:14,outline:"none",fontFamily:"'Poppins',sans-serif"}}/>
        <div style={{display:"flex",borderLeft:`1px solid ${B.border}`}}>
          <button onClick={()=>setMode("INR")} style={{padding:"0 10px",background:mode==="INR"?B.teal:"transparent",color:mode==="INR"?"#fff":B.textLight,border:"none",fontSize:11,fontWeight:700,cursor:"pointer"}}>₹</button>
          {cur&&rate&&<button onClick={()=>setMode(cur.code)} style={{padding:"0 10px",background:mode===cur.code?B.teal:"transparent",color:mode===cur.code?"#fff":B.textLight,border:"none",fontSize:11,fontWeight:700,cursor:"pointer"}}>{cur.symbol}</button>}
        </div>
      </div>
      {cur&&rate&&mode===cur.code&&valueINR>0&&<div style={{fontSize:10,color:B.teal,marginTop:3,fontWeight:600}}>= {fmtINR(valueINR)}</div>}
      {cur&&rate&&mode==="INR"&&valueINR>0&&<div style={{fontSize:10,color:B.textLight,marginTop:3}}>≈ {Math.round(toLocal(valueINR,rate)).toLocaleString()} {cur.code}</div>}
    </div>
  );
}

function Login({onLogin}){
  const [u,setU]=useState("");const [p,setP]=useState("");const [err,setErr]=useState("");
  function go(){const f=USERS[u.toLowerCase()];if(f&&f.password===p)onLogin({...f,username:u.toLowerCase()});else setErr("Invalid credentials.");}
  return(
    <div style={{minHeight:"100vh",background:B.white,fontFamily:"'Poppins',sans-serif",maxWidth:393,margin:"0 auto",display:"flex",flexDirection:"column"}}>
      <style>{css}</style>
      <div style={{background:`linear-gradient(135deg,${B.teal},${B.blue})`,padding:"36px 28px 36px 28px",position:"relative",overflow:"hidden",flexShrink:0}}>
        <div style={{position:"absolute",top:-30,right:-30,width:130,height:130,borderRadius:"50%",background:B.mint,opacity:.17}}/>
        <div style={{position:"absolute",bottom:-20,left:10,width:80,height:80,borderRadius:"50%",background:B.cyan,opacity:.14}}/>
        <div style={{position:"relative",display:"flex",flexDirection:"column",alignItems:"center",gap:0}}>
          <div style={{marginBottom:16,display:"flex",justifyContent:"center"}}><KTLogoDark h={64}/></div>
          <div style={{fontFamily:"'Playfair Display',serif",fontStyle:"italic",fontSize:22,color:"rgba(255,255,255,0.95)",fontWeight:700,lineHeight:1.3,textAlign:"center"}}>Customisation System</div>
          <div style={{width:40,height:3,background:B.mint,borderRadius:2,marginTop:13,marginLeft:"auto",marginRight:"auto"}}/>
        </div>
      </div>
      <div style={{flex:1,padding:"28px 24px",background:B.white}}>
        <div style={{marginBottom:14}}><div style={{fontSize:10,color:B.textLight,letterSpacing:2,fontWeight:700,marginBottom:6}}>USERNAME</div><input style={{background:B.offWhite,border:`1.5px solid ${B.border}`,borderRadius:13,color:B.text,padding:"13px 15px",fontSize:16,width:"100%",outline:"none"}} value={u} onChange={e=>setU(e.target.value)} placeholder="Enter username" autoCapitalize="none" onKeyDown={e=>e.key==="Enter"&&go()}/></div>
        <div style={{marginBottom:22}}><div style={{fontSize:10,color:B.textLight,letterSpacing:2,fontWeight:700,marginBottom:6}}>PASSWORD</div><input style={{background:B.offWhite,border:`1.5px solid ${B.border}`,borderRadius:13,color:B.text,padding:"13px 15px",fontSize:16,width:"100%",outline:"none"}} type="password" value={p} onChange={e=>setP(e.target.value)} placeholder="Enter password" onKeyDown={e=>e.key==="Enter"&&go()}/></div>
        {err&&<div style={{color:B.orange,fontSize:13,marginBottom:14,textAlign:"center",fontWeight:600}}>{err}</div>}
        <button onClick={go} style={{width:"100%",background:`linear-gradient(135deg,${B.teal},${B.blue})`,color:"#fff",border:"none",padding:"15px",borderRadius:13,fontSize:15,fontWeight:700,cursor:"pointer"}}>SIGN IN</button>
        <div style={{marginTop:16,display:"flex",gap:7,justifyContent:"center"}}>
          {["admin","hotel","ops","sales"].map(r=><div key={r} style={{fontSize:11,color:ROLE_COLOR[r],background:ROLE_COLOR[r]+"15",borderRadius:20,padding:"3px 9px",fontWeight:700}}>{r}</div>)}
        </div>
      </div>
    </div>
  );
}

export default function App(){
  const [user,setUser]=useState(null);
  const [data,setData]=useState(INIT);
  const [fxRates,setFxRates]=useState(FALLBACK_RATES);
  const [fxError,setFxError]=useState(false);
  const [dbLoading,setDbLoading]=useState(false);
  const [dbError,setDbError]=useState(null);
  useEffect(()=>{
    setDbLoading(true);
    Promise.all([DB.getPkgs(), DB.getDiscounts(), DB.getReferrals()])
      .then(([pkgs,discounts,refs])=>{
        const loadedPkgs = pkgs && pkgs.length > 0 ? pkgs.map(rowToPkg) : null;
        if(!loadedPkgs || loadedPkgs.length===0){INIT.packages.forEach(p=>DB.savePkg(p).catch(()=>{}));}
        setData(d=>({...d,packages: loadedPkgs || d.packages,discounts: discounts && discounts.length>0 ? discounts : d.discounts,referralCodes: refs && refs.length>0 ? refs.map(r=>({id:r.id,code:r.code,type:r.type,value:r.value})) : d.referralCodes}));
        setDbLoading(false);
      })
      .catch(err=>{console.warn("Supabase load failed, using local data:", err);setDbError("Using offline data");setDbLoading(false);});
    fetch("https://api.exchangerate-api.com/v4/latest/INR").then(r=>r.json()).then(d=>{setFxRates({THB:d.rates?.THB||0.3425,MYR:d.rates?.MYR||0.055,IDR:d.rates?.IDR||175,SGD:d.rates?.SGD||0.016});}).catch(()=>{});
  },[]);
  if(!user)return <Login onLogin={setUser}/>;
  const props={user,data,setData,fxRates,fxError,onLogout:()=>setUser(null)};
  if(user.role==="admin")return <AdminPanel {...props}/>;
  if(user.role==="hotel")return <HotelPanel {...props}/>;
  if(user.role==="ops")return <OpsPanel {...props}/>;
  return <SalesPanel {...props}/>;
}

function AdminPanel({user,data,setData,fxRates,fxError,onLogout}){
  const [screen,setScreen]=useState("home");
  const [cId,setCId]=useState("");
  const [editPkg,setEditPkg]=useState(null);
  const [adminTab,setAdminTab]=useState("packages");
  function savePkg(pkg){
    const finalId = pkg._isNew ? "pkg"+uid() : pkg.id;
    const finalPkg = {...pkg, id:finalId, _isNew:undefined};
    DB.savePkg(finalPkg).catch(e=>console.warn("DB save failed:",e));
    setData(d=>({...d,packages:pkg._isNew?[...d.packages,finalPkg]:d.packages.map(p=>p.id===pkg.id?finalPkg:p)}));
    setScreen("pkgList");
  }
  if(screen==="editPkg"&&editPkg) return <PackageEditor pkg={editPkg} isNew={!!editPkg._isNew} onSave={savePkg} onBack={()=>setScreen("pkgList")} user={user} onLogout={onLogout} fxRates={fxRates} fxError={fxError}/>;
  if(screen==="pkgList"&&cId){
    const country=data.countries.find(c=>c.id===cId);
    const pkgs=data.packages.filter(p=>p.countryId===cId);
    const blank={_isNew:true,countryId:cId,name:"",route:"",duration:"",nights:4,isActive:true,flights:[],hotels:[],transfers:[],includedActivities:[],addons:[],basePrices:{adult:0,child_5_11:0,child_2_4:0,infant:0}};
    return(
      <Shell user={user} onLogout={onLogout} fxRates={fxRates} rateError={fxError} subtitle={`${country?.flag} ${country?.name}`} onBack={()=>setScreen("home")}>
        <PT>{country?.flag} {country?.name} Packages</PT>
        <MBtn onClick={()=>{setEditPkg(blank);setScreen("editPkg");}} style={{width:"100%",marginBottom:12}}>+ Create New Package</MBtn>
        {pkgs.length===0&&<Card><div style={{textAlign:"center",color:B.textLight,padding:20,fontSize:13}}>No packages yet.</div></Card>}
        {pkgs.map(pkg=>(
          <Card key={pkg.id} accent={pkg.isActive?B.teal:B.border}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
              <div style={{flex:1}}>
                <div style={{fontSize:13,fontWeight:800,color:B.teal,marginBottom:2}}>{pkg.name}</div>
                <div style={{fontSize:11,color:B.textLight,marginBottom:7}}>{pkg.route} · {pkg.duration}</div>
                <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
                  <Tag color={B.blue}>{pkg.flights?.length||0} flights</Tag>
                  <Tag color={B.teal}>{pkg.hotels?.length||0} hotels</Tag>
                  <Tag color={B.orange}>{pkg.transfers?.length||0} transfers</Tag>
                  <Tag color={B.mint}>{pkg.addons?.length||0} add-ons</Tag>
                  <Tag color={pkg.isActive?B.teal:B.textLight}>{pkg.isActive?"Active":"Inactive"}</Tag>
                </div>
              </div>
              <div style={{display:"flex",gap:5,marginLeft:8}}>
                <SBtn onClick={()=>{setEditPkg(pkg);setScreen("editPkg");}}>Edit</SBtn>
                <DBtn onClick={()=>{if(window.confirm("Delete?"))DB.delPkg(pkg.id).catch(e=>console.warn(e));setData(d=>({...d,packages:d.packages.filter(p=>p.id!==pkg.id)}))}}>Del</DBtn>
              </div>
            </div>
          </Card>
        ))}
      </Shell>
    );
  }
  return(
    <Shell user={user} onLogout={onLogout} fxRates={fxRates} rateError={fxError} subtitle="Admin Panel">
      <TabBar tabs={[{id:"packages",label:"📦 Packages"},{id:"discounts",label:"🏷 Discounts"},{id:"referrals",label:"🎟 Referrals"},{id:"countries",label:"🌍 Countries"}]} active={adminTab} onSelect={setAdminTab}/>
      {adminTab==="packages"&&<>
        <PT sub="Select country to manage">Packages</PT>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:9,marginBottom:18}}>
          {[{label:"Countries",value:data.countries.length,color:B.teal},{label:"Packages",value:data.packages.length,color:B.blue},{label:"Active",value:data.packages.filter(p=>p.isActive).length,color:B.mint},{label:"Hotels",value:data.packages.reduce((s,p)=>s+(p.hotels?.length||0),0),color:B.orange}].map((s,i)=>(
            <div key={i} style={{background:B.white,border:`1.5px solid ${s.color}33`,borderRadius:16,padding:"13px"}}><div style={{fontSize:10,color:B.textLight,letterSpacing:1,marginBottom:4,fontWeight:600}}>{s.label}</div><div style={{fontSize:26,color:s.color,fontWeight:800}}>{s.value}</div></div>
          ))}
        </div>
        <SL>SELECT COUNTRY — tap to open packages</SL>
        <CGrid countries={data.countries} selected={cId} onSelect={id=>{setCId(id);setScreen("pkgList");}}/>
      </>}
      {adminTab==="discounts"&&<DiscountManager data={data} setData={setData}/>}
      {adminTab==="referrals"&&<ReferralManager data={data} setData={setData}/>}
      {adminTab==="countries"&&<CountryMgr data={data} setData={setData}/>}
    </Shell>
  );
}

function DiscountManager({data,setData}){
  const [newD,setNewD]=useState({name:"",type:"percent",value:0});
  function add(){if(!newD.name)return;setData(d=>({...d,discounts:[...(d.discounts||[]),{...newD,id:"d"+uid(),value:Number(newD.value)}]}));setNewD({name:"",type:"percent",value:0});}
  function rem(id){setData(d=>({...d,discounts:(d.discounts||[]).filter(x=>x.id!==id)}));}
  function upd(id,f,v){setData(d=>({...d,discounts:(d.discounts||[]).map(x=>x.id===id?{...x,[f]:f==="value"?Number(v):v}:x)}));}
  return(<div>
    <PT sub="Named discounts for sales staff">Discount Presets</PT>
    {(data.discounts||[]).map(d=>(
      <Card key={d.id} accent={B.orange}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
          <div><div style={{fontSize:13,fontWeight:700}}>{d.name}</div><div style={{fontSize:11,color:B.orange,fontWeight:600}}>{d.type==="percent"?`${d.value}% off`:`₹${Number(d.value).toLocaleString("en-IN")} off`}</div></div>
          <DBtn onClick={()=>rem(d.id)}>Remove</DBtn>
        </div>
        <Inp label="NAME" value={d.name} onChange={e=>upd(d.id,"name",e.target.value)}/>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
          <Sel label="TYPE" value={d.type} onChange={e=>upd(d.id,"type",e.target.value)}><option value="percent">%</option><option value="fixed">Fixed ₹</option></Sel>
          <Inp label="VALUE" type="number" value={d.value} onChange={e=>upd(d.id,"value",e.target.value)}/>
        </div>
      </Card>
    ))}
    <Card accent={B.teal}><SL>ADD DISCOUNT</SL>
      <Inp label="NAME" value={newD.name} onChange={e=>setNewD(x=>({...x,name:e.target.value}))} placeholder="e.g. Staff Discount"/>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
        <Sel label="TYPE" value={newD.type} onChange={e=>setNewD(x=>({...x,type:e.target.value}))}><option value="percent">%</option><option value="fixed">Fixed ₹</option></Sel>
        <Inp label="VALUE" type="number" value={newD.value} onChange={e=>setNewD(x=>({...x,value:e.target.value}))}/>
      </div>
      <MBtn onClick={add} style={{width:"100%"}}>+ Add</MBtn>
    </Card>
  </div>);
}

function ReferralManager({data,setData}){
  const [newR,setNewR]=useState({code:"",name:"",type:"percent",value:0,active:true});
  function add(){if(!newR.code)return;setData(d=>({...d,referralCodes:[...(d.referralCodes||[]),{...newR,id:"r"+uid(),value:Number(newR.value),code:newR.code.toUpperCase()}]}));setNewR({code:"",name:"",type:"percent",value:0,active:true});}
  function rem(id){setData(d=>({...d,referralCodes:(d.referralCodes||[]).filter(x=>x.id!==id)}));}
  function toggle(id){setData(d=>({...d,referralCodes:(d.referralCodes||[]).map(x=>x.id===id?{...x,active:!x.active}:x)}));}
  return(<div>
    <PT sub="Active referral codes for clients">Referral Codes</PT>
    {(data.referralCodes||[]).map(r=>(
      <Card key={r.id} accent={r.active?B.mint:B.border}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
          <div><div style={{fontSize:14,fontWeight:800,color:r.active?B.teal:B.textLight,letterSpacing:1}}>{r.code}</div><div style={{fontSize:11,color:B.textLight,marginTop:1}}>{r.name} · {r.type==="percent"?`${r.value}%`:`₹${Number(r.value).toLocaleString("en-IN")}`} off</div></div>
          <div style={{display:"flex",gap:6,alignItems:"center"}}>
            <div onClick={()=>toggle(r.id)} style={{width:40,height:22,borderRadius:11,background:r.active?B.mint:B.border,cursor:"pointer",position:"relative"}}><div style={{position:"absolute",top:2,left:r.active?19:2,width:18,height:18,borderRadius:"50%",background:"white",transition:"left .15s"}}/></div>
            <DBtn onClick={()=>rem(r.id)}>Del</DBtn>
          </div>
        </div>
      </Card>
    ))}
    <Card accent={B.teal}><SL>ADD REFERRAL CODE</SL>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
        <Inp label="CODE" value={newR.code} onChange={e=>setNewR(x=>({...x,code:e.target.value.toUpperCase()}))} placeholder="e.g. KT2025"/>
        <Inp label="LABEL" value={newR.name} onChange={e=>setNewR(x=>({...x,name:e.target.value}))} placeholder="e.g. KT Launch"/>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
        <Sel label="TYPE" value={newR.type} onChange={e=>setNewR(x=>({...x,type:e.target.value}))}><option value="percent">%</option><option value="fixed">Fixed ₹</option></Sel>
        <Inp label="VALUE" type="number" value={newR.value} onChange={e=>setNewR(x=>({...x,value:e.target.value}))}/>
      </div>
      <MBtn onClick={add} style={{width:"100%"}}>+ Add Code</MBtn>
    </Card>
  </div>);
}

function PackageEditor({pkg,isNew,onSave,onBack,user,onLogout,fxRates,fxError}){
  const [form,setForm]=useState(JSON.parse(JSON.stringify(pkg)));
  const [tab,setTab]=useState("basics");
  const cId=form.countryId;
  const cur=COUNTRY_CURRENCY[cId];
  function sf(path,val){setForm(f=>{const c=JSON.parse(JSON.stringify(f));const keys=path.split(".");let o=c;for(let i=0;i<keys.length-1;i++)o=o[keys[i]];o[keys[keys.length-1]]=val;return c;});}
  function updArr(field,id,key,val){setForm(f=>({...f,[field]:f[field].map(x=>x.id===id?{...x,[key]:["costPerPaxINR","costPerNightINR","costPerVanINR","costINR","kidCostINR","kidCostPerPaxINR","markup","nights","maxPax"].includes(key)?Number(val):val}:x)}));}
  function remArr(field,id){setForm(f=>({...f,[field]:f[field].filter(x=>x.id!==id)}));}
  function setDef(field,id){setForm(f=>({...f,[field]:f[field].map(x=>({...x,isDefault:x.id===id}))}))}
  const defH=form.hotels?.find(h=>h.isDefault);
  const tabs=[{id:"basics",label:"📋 Basics"},{id:"flights",label:"✈ Flights"},{id:"hotels",label:"🏨 Hotels"},{id:"transfers",label:"🚌 Transfers"},{id:"activities",label:"🎯 Activities"},{id:"addons",label:"🎪 Add-ons"},{id:"pricing",label:"💰 Pricing"},{id:"itinerary",label:"🗓 Itinerary"},{id:"inclexcl",label:"📋 Incl/Excl"}];
  return(
    <Shell user={user} onLogout={onLogout} fxRates={fxRates} rateError={fxError} subtitle={isNew?"New Package":"Edit Package"} onBack={onBack}>
      <PT>{isNew?"Create Package":form.name||"Edit"}</PT>
      {cur&&<div style={{background:B.tealLight,borderRadius:11,padding:"8px 12px",marginBottom:10,fontSize:12,color:B.teal,fontWeight:600}}>💱 Toggle ₹/{cur.symbol} on each field</div>}
      <TabBar tabs={tabs} active={tab} onSelect={setTab}/>
      {tab==="basics"&&<div>
        <Inp label="PACKAGE NAME" value={form.name} onChange={e=>sf("name",e.target.value)} placeholder="Package name"/>
        <Inp label="ROUTE" value={form.route} onChange={e=>sf("route",e.target.value)} placeholder="e.g. Bangalore ↔ Phuket"/>
        <Inp label="DURATION" value={form.duration} onChange={e=>sf("duration",e.target.value)} placeholder="e.g. 5 Days / 4 Nights"/>
        <Inp label="BASE NIGHTS" type="number" value={form.nights||4} onChange={e=>sf("nights",Number(e.target.value))}/>
        <Toggle value={form.isActive} onChange={()=>sf("isActive",!form.isActive)} label="Active — visible to sales"/>
      </div>}
      {tab==="flights"&&<div>
        <SL>FLIGHT OPTIONS</SL>
        {(form.flights||[]).map(f=>(
          <Card key={f.id} accent={f.isDefault?B.teal:B.border}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}><div><div style={{fontSize:13,fontWeight:700}}>{f.name||"Flight"}{f.isDefault&&<DefBadge/>}</div><div style={{fontSize:11,color:B.textLight}}>{f.airline} · {fmtINR(f.costPerPaxINR)}/pax</div></div><DBtn onClick={()=>remArr("flights",f.id)}>Remove</DBtn></div>
            <Inp label="NAME" value={f.name} onChange={e=>updArr("flights",f.id,"name",e.target.value)} placeholder="e.g. BLR → HKT"/>
            <Inp label="AIRLINE" value={f.airline} onChange={e=>updArr("flights",f.id,"airline",e.target.value)}/>
            <CurrencyInp label="COST PER PAX" valueINR={f.costPerPaxINR} onChange={v=>updArr("flights",f.id,"costPerPaxINR",v)} countryId={cId} fxRates={fxRates}/>
            {!f.isDefault&&<SBtn onClick={()=>setDef("flights",f.id)} style={{width:"100%"}}>Set as Default</SBtn>}
          </Card>
        ))}
        <Card accent={B.teal}><SL>ADD FLIGHT</SL><AddFlightForm onAdd={f=>setForm(x=>({...x,flights:[...(x.flights||[]),f]}))} hasDefault={(form.flights||[]).some(f=>f.isDefault)} countryId={cId} fxRates={fxRates}/></Card>
      </div>}
      {tab==="hotels"&&<div>
        <SL>HOTEL OPTIONS</SL>
        <div style={{background:B.tealLight,borderRadius:11,padding:"9px 12px",marginBottom:10,fontSize:12,color:B.teal}}>🏨 <strong>Room basis.</strong> Default hotel cost is built into base price.</div>
        {defH&&<div style={{background:B.tealLight,borderRadius:11,padding:"9px 12px",marginBottom:10,fontSize:12,color:B.teal,fontWeight:600}}>Default: <strong>{defH.name}</strong> · {fmtINR(defH.costPerNightINR)}/night × {form.nights}N = {fmtINR(defH.costPerNightINR*(form.nights||4))}</div>}
        {(form.hotels||[]).map(h=>(
          <Card key={h.id} accent={h.isDefault?B.teal:STAR_COLOR[h.star]}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}><div><div style={{fontSize:13,fontWeight:700}}>{h.name||"Hotel"}{h.isDefault&&<DefBadge/>}</div><div style={{fontSize:11,color:STAR_COLOR[h.star],fontWeight:600}}>{STAR_LABEL[h.star]}{h.isDynamic?" · Daily Rate":""}</div></div><DBtn onClick={()=>remArr("hotels",h.id)}>Remove</DBtn></div>
            <Inp label="NAME" value={h.name} onChange={e=>updArr("hotels",h.id,"name",e.target.value)}/>
            <Sel label="STARS" value={h.star} onChange={e=>updArr("hotels",h.id,"star",Number(e.target.value))}><option value={3}>3★</option><option value={4}>4★</option><option value={5}>5★/Resort</option></Sel>
            <CurrencyInp label="COST/NIGHT (1 ROOM)" valueINR={h.costPerNightINR} onChange={v=>updArr("hotels",h.id,"costPerNightINR",v)} countryId={cId} fxRates={fxRates}/>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
              <Inp label="MARKUP" type="number" value={h.markup} onChange={e=>updArr("hotels",h.id,"markup",e.target.value)}/>
              <Sel label="TYPE" value={h.markupType} onChange={e=>updArr("hotels",h.id,"markupType",e.target.value)}><option value="percent">%</option><option value="fixed">Fixed ₹</option></Sel>
            </div>
            <Toggle value={h.isDynamic} onChange={()=>updArr("hotels",h.id,"isDynamic",!h.isDynamic)} label="Daily Rate"/>
            {!h.isDefault&&<SBtn onClick={()=>setDef("hotels",h.id)} style={{width:"100%"}}>Set as Default Hotel</SBtn>}
          </Card>
        ))}
        <Card accent={B.teal}><SL>ADD HOTEL</SL><AddHotelForm onAdd={h=>setForm(x=>({...x,hotels:[...(x.hotels||[]),h]}))} hasDefault={(form.hotels||[]).some(h=>h.isDefault)} countryId={cId} fxRates={fxRates}/></Card>
      </div>}
      {tab==="transfers"&&<div>
        <SL>TRANSFERS</SL>
        <div style={{background:B.tealLight,borderRadius:11,padding:"9px 12px",marginBottom:10,fontSize:12,color:B.teal}}>Default transfers included in base price. Optional transfers split per pax.</div>
        {(form.transfers||[]).map(t=>(
          <Card key={t.id} accent={t.isDefault?B.teal:B.border}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}><div style={{flex:1}}><div style={{fontSize:12,fontWeight:700}}>{t.name||"Transfer"}</div><div style={{fontSize:11,color:B.textLight}}>{fmtINR(t.costPerVanINR)}/van · max {t.maxPax} · {t.isDefault?"Default":"Optional"}</div></div><DBtn onClick={()=>remArr("transfers",t.id)}>Remove</DBtn></div>
            <Inp label="NAME" value={t.name} onChange={e=>updArr("transfers",t.id,"name",e.target.value)}/>
            <CurrencyInp label="COST/VAN" valueINR={t.costPerVanINR} onChange={v=>updArr("transfers",t.id,"costPerVanINR",v)} countryId={cId} fxRates={fxRates}/>
            <Inp label="MAX PAX" type="number" value={t.maxPax||8} onChange={e=>updArr("transfers",t.id,"maxPax",e.target.value)}/>
            <Toggle value={t.isDefault} onChange={()=>updArr("transfers",t.id,"isDefault",!t.isDefault)} label="Included by default"/>
          </Card>
        ))}
        <Card accent={B.teal}><SL>ADD TRANSFER</SL><AddTransferForm onAdd={t=>setForm(x=>({...x,transfers:[...(x.transfers||[]),t]}))} countryId={cId} fxRates={fxRates}/></Card>
      </div>}
      {tab==="activities"&&<div>
        <SL>INCLUDED ACTIVITIES</SL>
        {(form.includedActivities||[]).map(a=>(
          <Card key={a.id}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}><div><div style={{fontSize:13,fontWeight:700}}>{a.name||a.title||"Activity"}</div><div style={{fontSize:11,color:B.teal,fontWeight:600}}>Adult: {fmtINR(a.costPerPaxINR)} · Child: {fmtINR(a.kidCostPerPaxINR||0)}</div></div><DBtn onClick={()=>remArr("includedActivities",a.id)}>Remove</DBtn></div>
            <Inp label="NAME" value={a.name} onChange={e=>updArr("includedActivities",a.id,"name",e.target.value)}/>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
              <CurrencyInp label="ADULT COST/PAX" valueINR={a.costPerPaxINR} onChange={v=>updArr("includedActivities",a.id,"costPerPaxINR",v)} countryId={cId} fxRates={fxRates}/>
              <CurrencyInp label="CHILD COST/PAX" valueINR={a.kidCostPerPaxINR||0} onChange={v=>updArr("includedActivities",a.id,"kidCostPerPaxINR",v)} countryId={cId} fxRates={fxRates}/>
            </div>
          </Card>
        ))}
        <Card accent={B.teal}><SL>ADD ACTIVITY</SL><AddActivityForm onAdd={a=>setForm(x=>({...x,includedActivities:[...(x.includedActivities||[]),a]}))} countryId={cId} fxRates={fxRates}/></Card>
      </div>}
      {tab==="addons"&&<div>
        <SL>ADD-ON ACTIVITIES</SL>
        {(form.addons||[]).map(a=>(
          <Card key={a.id}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}><div><div style={{fontSize:13,fontWeight:700}}>{a.name}</div><div style={{fontSize:11,color:B.teal,fontWeight:600}}>Adult sell: {fmtINR(sp(a.costINR,a.markup,a.markupType))}</div></div><DBtn onClick={()=>remArr("addons",a.id)}>Remove</DBtn></div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
              <CurrencyInp label="ADULT NET COST" valueINR={a.costINR} onChange={v=>updArr("addons",a.id,"costINR",v)} countryId={cId} fxRates={fxRates}/>
              <CurrencyInp label="ADULT SELL" valueINR={sp(a.costINR,a.markup,a.markupType)} onChange={()=>{}} countryId={cId} fxRates={fxRates} style={{background:"#f0fbfc"}}/>
            </div>
            {a.hasKidPrice&&<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginTop:4}}>
              <CurrencyInp label="CHILD NET COST" valueINR={a.kidCostINR||0} onChange={v=>updArr("addons",a.id,"kidCostINR",v)} countryId={cId} fxRates={fxRates}/>
              <CurrencyInp label="CHILD SELL" valueINR={sp(a.kidCostINR||0,a.markup,a.markupType)} onChange={()=>{}} countryId={cId} fxRates={fxRates} style={{background:"#f0fbfc"}}/>
            </div>}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
              <Inp label="MARKUP" type="number" value={a.markup} onChange={e=>updArr("addons",a.id,"markup",e.target.value)}/>
              <Sel label="TYPE" value={a.markupType} onChange={e=>updArr("addons",a.id,"markupType",e.target.value)}><option value="percent">%</option><option value="fixed">Fixed ₹</option></Sel>
            </div>
            <Toggle value={a.hasKidPrice} onChange={()=>updArr("addons",a.id,"hasKidPrice",!a.hasKidPrice)} label="Has child price"/>
            <Toggle value={a.hasQty} onChange={()=>updArr("addons",a.id,"hasQty",!a.hasQty)} label="Qty Selector"/>
          </Card>
        ))}
        <Card accent={B.teal}><SL>ADD ADD-ON</SL><AddAddonForm onAdd={a=>setForm(x=>({...x,addons:[...(x.addons||[]),a]}))} countryId={cId} fxRates={fxRates}/></Card>
      </div>}
      {tab==="pricing"&&<div>
        <SL>BASE PRICES PER PERSON (₹)</SL>
        {PAX_KEYS.map(k=><Inp key={k} label={PAX_LABELS[k].toUpperCase()} type="number" value={form.basePrices[k]} onChange={e=>sf(`basePrices.${k}`,Number(e.target.value))}/>)}
        <Card accent={B.blue} style={{marginTop:8}}>
          <SL color={B.blue}>COST REFERENCE</SL>
          {(()=>{
            const df=(form.flights||[]).find(f=>f.isDefault);
            const dh=(form.hotels||[]).find(h=>h.isDefault);
            const dts=(form.transfers||[]).filter(t=>t.isDefault);
            const tTC=dts.reduce((s,t)=>s+(t.costPerVanINR||0),0);
            const tAC=(form.includedActivities||[]).reduce((s,a)=>s+(a.costPerPaxINR||0),0);
            const fC=df?.costPerPaxINR||0;
            const hC=dh?sp(dh.costPerNightINR,dh.markup,dh.markupType)*(form.nights||4):0;
            const hCPerPax=Math.round(hC/2);
            const total=fC+hCPerPax+tTC+tAC;
            return(<div style={{fontSize:12}}>
              {[{label:"✈ Default Flight",val:fC,note:"/pax"},{label:`🏨 Default Hotel (${form.nights||4}N, 1 room)`,val:hCPerPax,note:"/pax"},{label:"🚌 Default Transfers",val:tTC,note:"/van"},{label:"🎯 Included Activities",val:tAC,note:"/pax"}].map((r,i)=><div key={i} style={{display:"flex",justifyContent:"space-between",padding:"6px 0",borderBottom:`1px solid ${B.border}`}}><span style={{color:B.textMid}}>{r.label}</span><span style={{fontWeight:700}}>{fmtINR(r.val)} <span style={{fontSize:10,color:B.textLight}}>{r.note}</span></span></div>)}
              <div style={{display:"flex",justifyContent:"space-between",padding:"7px 0",borderTop:`2px solid ${B.border}`,marginTop:4}}><span style={{color:B.teal,fontWeight:700}}>Est. Cost</span><span style={{color:B.teal,fontWeight:800}}>{fmtINR(total)}</span></div>
              <div style={{display:"flex",justifyContent:"space-between",padding:"5px 0"}}><span style={{color:B.blue,fontWeight:700}}>Adult Selling</span><span style={{color:B.blue,fontWeight:800}}>{fmtINR(form.basePrices.adult||0)}</span></div>
              <div style={{display:"flex",justifyContent:"space-between",padding:"5px 0"}}><span style={{color:B.mint,fontWeight:700}}>Est. Margin</span><span style={{color:B.mint,fontWeight:800}}>{fmtINR((form.basePrices.adult||0)-total)}</span></div>
            </div>);
          })()}
        </Card>
      </div>}
      {tab==="itinerary"&&<ItineraryTemplateEditor form={form} setForm={setForm}/>}
      {tab==="inclexcl"&&<InclExclEditor form={form} setForm={setForm}/>}
      <div style={{marginTop:10}}><PBtn onClick={()=>onSave(form)}>💾 {isNew?"Create Package":"Save Changes"}</PBtn></div>
    </Shell>
  );
}

function ItineraryTemplateEditor({form, setForm}){
  const nights = form.nights || 4;
  const totalDays = nights + 1;
  useEffect(()=>{
    const existing = form.itineraryDays || [];
    if(existing.length === 0 && form.id === "pkg1"){setForm(f=>({...f,itineraryDays:JSON.parse(JSON.stringify(DEFAULT_PHUKET_ITINERARY))}));return;}
    if(existing.length !== totalDays){
      const existingNonDep = existing.length>1 ? existing.slice(0,-1) : [];
      const existingDep = existing.length>0 ? existing[existing.length-1] : null;
      const newDays = Array.from({length:totalDays}, (_,i)=>{
        const isLast = i===totalDays-1;
        if(isLast){return existingDep?{...existingDep,id:"dep"+totalDays}:{id:"dep"+totalDays,title:"Departure",emoji:"🛫",location:"Airport",transfers:[],bulletNotes:[],activities:[],stay:null,leisure:"Until the next adventure! 🌟",photos:[],textBlocks:[]};}
        return existingNonDep[i]?{...existingNonDep[i],id:"day"+(i+1)}:{id:"day"+(i+1),title:`Day ${i+1}`,emoji:"📍",location:"Phuket",transfers:[],bulletNotes:[],activities:[],stay:null,leisure:"",photos:[],textBlocks:[]};
      });
      setForm(f=>({...f,itineraryDays:newDays}));
    }
  }, [form.id, totalDays]);
  const days = form.itineraryDays || [];
  const [openDay, setOpenDay] = useState(days.length > 0 ? days[0].id : null);
  function setDays(newDays){ setForm(f=>({...f,itineraryDays:newDays})); }
  function updateDay(id, field, val){ setDays(days.map(d=>d.id===id?{...d,[field]:val}:d)); }
  function addTransfer(dayId){const t={id:"t"+Date.now().toString(36),from:"",to:"",vehicle:"A/C Vehicle",note:""};setDays(days.map(d=>d.id===dayId?{...d,transfers:[...d.transfers,t]}:d));}
  function updateTransfer(dayId,tId,field,val){setDays(days.map(d=>d.id===dayId?{...d,transfers:d.transfers.map(t=>t.id===tId?{...t,[field]:val}:t)}:d));}
  function removeTransfer(dayId,tId){setDays(days.map(d=>d.id===dayId?{...d,transfers:d.transfers.filter(t=>t.id!==tId)}:d));}
  function addActivity(dayId){const a={id:"a"+Date.now().toString(36),name:"",title:"",photo:"",duration:"Full Day",ticketIncluded:true,notes:[]};setDays(days.map(d=>d.id===dayId?{...d,activities:[...d.activities,a]}:d));}
  function updateActivity(dayId,aId,field,val){setDays(days.map(d=>d.id===dayId?{...d,activities:d.activities.map(a=>a.id===aId?{...a,[field]:val}:a)}:d));}
  function removeActivity(dayId,aId){setDays(days.map(d=>d.id===dayId?{...d,activities:d.activities.filter(a=>a.id!==aId)}:d));}
  function addBulletNote(dayId){setDays(days.map(d=>d.id===dayId?{...d,bulletNotes:[...(d.bulletNotes||[]),"New note"]}:d));}
  function updateBulletNote(dayId,idx,val){setDays(days.map(d=>d.id===dayId?{...d,bulletNotes:(d.bulletNotes||[]).map((n,i)=>i===idx?val:n)}:d));}
  function removeBulletNote(dayId,idx){setDays(days.map(d=>d.id===dayId?{...d,bulletNotes:(d.bulletNotes||[]).filter((_,i)=>i!==idx)}:d));}
  function addPhoto(dayId){const url=window.prompt("Paste image URL:");if(!url)return;setDays(days.map(d=>d.id===dayId?{...d,photos:[...(d.photos||[]),{id:"p"+Date.now().toString(36),url}]}:d));}
  function removePhoto(dayId,pId){setDays(days.map(d=>d.id===dayId?{...d,photos:(d.photos||[]).filter(p=>p.id!==pId)}:d));}
  function addTextBlock(dayId){const tb={id:"tb"+Date.now().toString(36),text:""};setDays(days.map(d=>d.id===dayId?{...d,textBlocks:[...(d.textBlocks||[]),tb]}:d));}
  function updateTextBlock(dayId,tbId,val){setDays(days.map(d=>d.id===dayId?{...d,textBlocks:(d.textBlocks||[]).map(tb=>tb.id===tbId?{...tb,text:val}:tb)}:d));}
  function removeTextBlock(dayId,tbId){setDays(days.map(d=>d.id===dayId?{...d,textBlocks:(d.textBlocks||[]).filter(tb=>tb.id!==tbId)}:d));}
  function toggleStay(dayId){setDays(days.map(d=>{if(d.id!==dayId)return d;if(d.stay)return {...d,stay:null};return {...d,stay:{name:"",checkInTime:"3:00 PM",checkOutTime:"11:00 AM",nights:form.nights||4,breakfast:true,photo:""}}}));}
  function updateStay(dayId,field,val){setDays(days.map(d=>d.id===dayId?{...d,stay:{...d.stay,[field]:val}}:d));}
  return(
    <div>
      <div style={{background:B.tealLight,borderRadius:11,padding:"10px 13px",marginBottom:12,fontSize:12,color:B.teal,fontWeight:600}}>🗓 {totalDays} day slots auto-created from {nights} base nights.</div>
      {days.length===0&&<div style={{textAlign:"center",padding:"24px",color:B.textLight,fontSize:13}}>Loading days...</div>}
      {days.map((d,idx)=>{
        const isLast = idx === days.length - 1;
        return(
          <div key={d.id} style={{background:B.white,border:`2px solid ${openDay===d.id?B.teal:B.border}`,borderRadius:16,marginBottom:10,overflow:"hidden"}}>
            <div style={{display:"flex",alignItems:"center",gap:10,padding:"12px 14px",cursor:"pointer",background:openDay===d.id?B.tealXLight:B.white}} onClick={()=>setOpenDay(openDay===d.id?null:d.id)}>
              <div style={{width:44,height:44,borderRadius:10,background:isLast?"#fff3e0":B.tealLight,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                <div style={{fontSize:8,color:isLast?B.orange:B.teal,fontWeight:700,letterSpacing:1}}>DAY</div>
                <div style={{fontSize:18,fontWeight:800,color:isLast?B.orange:B.teal,lineHeight:1}}>{String(idx+1).padStart(2,"0")}</div>
              </div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:13,fontWeight:700,color:B.text}}>{d.emoji} {d.title||"Untitled"}</div>
                <div style={{fontSize:10,color:B.textLight,marginTop:2}}>📍 {d.location} · {(d.transfers||[]).length}T · {(d.activities||[]).length}A · {(d.bulletNotes||[]).length}N</div>
              </div>
              <div style={{fontSize:11,color:B.textLight}}>{openDay===d.id?"▲":"▼"}</div>
            </div>
            {openDay===d.id&&(
              <div style={{padding:"14px",borderTop:`1px solid ${B.border}`}}>
                <div style={{display:"grid",gridTemplateColumns:"2fr 1fr",gap:8,marginBottom:10}}>
                  <div><div style={{fontSize:10,color:B.textLight,letterSpacing:2,fontWeight:700,marginBottom:4}}>TITLE</div><input value={d.title} onChange={e=>updateDay(d.id,"title",e.target.value)} style={{background:B.offWhite,border:`1.5px solid ${B.border}`,borderRadius:10,color:B.text,padding:"9px 11px",fontSize:13,width:"100%",outline:"none",fontFamily:"'Poppins',sans-serif"}}/></div>
                  <div><div style={{fontSize:10,color:B.textLight,letterSpacing:2,fontWeight:700,marginBottom:4}}>EMOJI</div><input value={d.emoji} onChange={e=>updateDay(d.id,"emoji",e.target.value)} style={{background:B.offWhite,border:`1.5px solid ${B.border}`,borderRadius:10,color:B.text,padding:"9px 11px",fontSize:16,width:"100%",outline:"none",fontFamily:"'Poppins',sans-serif"}}/></div>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:14}}>
                  <div><div style={{fontSize:10,color:B.textLight,letterSpacing:2,fontWeight:700,marginBottom:4}}>LOCATION</div><input value={d.location} onChange={e=>updateDay(d.id,"location",e.target.value)} style={{background:B.offWhite,border:`1.5px solid ${B.border}`,borderRadius:10,color:B.text,padding:"9px 11px",fontSize:12,width:"100%",outline:"none",fontFamily:"'Poppins',sans-serif"}}/></div>
                  <div><div style={{fontSize:10,color:B.textLight,letterSpacing:2,fontWeight:700,marginBottom:4}}>LEISURE</div><input value={d.leisure||""} onChange={e=>updateDay(d.id,"leisure",e.target.value)} placeholder="e.g. Relax ✨" style={{background:B.offWhite,border:`1.5px solid ${B.border}`,borderRadius:10,color:B.text,padding:"9px 11px",fontSize:12,width:"100%",outline:"none",fontFamily:"'Poppins',sans-serif"}}/></div>
                </div>
                {/* TRANSFERS */}
                <div style={{marginBottom:12}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}><div style={{fontSize:10,color:B.blue,letterSpacing:2,fontWeight:700}}>🚐 TRANSFERS</div><button onClick={()=>addTransfer(d.id)} style={{background:B.blueLight,border:"none",color:B.blue,padding:"5px 11px",borderRadius:8,fontSize:11,fontWeight:700,cursor:"pointer"}}>+ Add</button></div>
                  {(d.transfers||[]).length===0&&<div style={{fontSize:11,color:B.textLight,padding:"8px",background:B.offWhite,borderRadius:9,textAlign:"center"}}>No transfers added</div>}
                  {(d.transfers||[]).map(t=>(
                    <div key={t.id} style={{background:B.offWhite,borderRadius:11,padding:"10px 12px",marginBottom:8,border:`1px solid ${B.border}`}}>
                      <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}><div style={{fontSize:11,fontWeight:700,color:B.blue}}>Transfer</div><button onClick={()=>removeTransfer(d.id,t.id)} style={{background:"none",border:"none",color:B.orange,fontSize:14,cursor:"pointer"}}>✕</button></div>
                      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6,marginBottom:6}}>
                        <input value={t.from} onChange={e=>updateTransfer(d.id,t.id,"from",e.target.value)} placeholder="From" style={{background:B.white,border:`1px solid ${B.border}`,borderRadius:8,color:B.text,padding:"8px 9px",fontSize:12,outline:"none",fontFamily:"'Poppins',sans-serif"}}/>
                        <input value={t.to} onChange={e=>updateTransfer(d.id,t.id,"to",e.target.value)} placeholder="To" style={{background:B.white,border:`1px solid ${B.border}`,borderRadius:8,color:B.text,padding:"8px 9px",fontSize:12,outline:"none",fontFamily:"'Poppins',sans-serif"}}/>
                      </div>
                      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
                        <input value={t.vehicle} onChange={e=>updateTransfer(d.id,t.id,"vehicle",e.target.value)} placeholder="Vehicle" style={{background:B.white,border:`1px solid ${B.border}`,borderRadius:8,color:B.text,padding:"8px 9px",fontSize:12,outline:"none",fontFamily:"'Poppins',sans-serif"}}/>
                        <input value={t.note} onChange={e=>updateTransfer(d.id,t.id,"note",e.target.value)} placeholder="Note" style={{background:B.white,border:`1px solid ${B.border}`,borderRadius:8,color:B.text,padding:"8px 9px",fontSize:12,outline:"none",fontFamily:"'Poppins',sans-serif"}}/>
                      </div>
                    </div>
                  ))}
                </div>
                {/* BULLET NOTES */}
                <div style={{marginBottom:12}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}><div style={{fontSize:10,color:B.teal,letterSpacing:2,fontWeight:700}}>📝 DAY NOTES</div><button onClick={()=>addBulletNote(d.id)} style={{background:B.tealLight,border:"none",color:B.teal,padding:"5px 11px",borderRadius:8,fontSize:11,fontWeight:700,cursor:"pointer"}}>+ Add</button></div>
                  {(d.bulletNotes||[]).length===0&&<div style={{fontSize:11,color:B.textLight,padding:"8px",background:B.offWhite,borderRadius:9,textAlign:"center"}}>No notes added</div>}
                  {(d.bulletNotes||[]).map((n,ni)=>(
                    <div key={ni} style={{display:"flex",gap:6,marginBottom:6}}>
                      <textarea value={n} onChange={e=>updateBulletNote(d.id,ni,e.target.value)} rows={2} placeholder="Day note" style={{flex:1,background:B.offWhite,border:`1.5px solid ${B.border}`,borderRadius:9,color:B.text,padding:"8px 10px",fontSize:12,outline:"none",fontFamily:"'Poppins',sans-serif",resize:"vertical"}}/>
                      <button onClick={()=>removeBulletNote(d.id,ni)} style={{background:"none",border:"none",color:B.orange,fontSize:14,cursor:"pointer",alignSelf:"flex-start",padding:"8px 4px"}}>✕</button>
                    </div>
                  ))}
                </div>
                {/* ACTIVITIES */}
                <div style={{marginBottom:12}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}><div style={{fontSize:10,color:"#7044C9",letterSpacing:2,fontWeight:700}}>🎯 ACTIVITY CARDS</div><button onClick={()=>addActivity(d.id)} style={{background:"#F1ECFB",border:"none",color:"#7044C9",padding:"5px 11px",borderRadius:8,fontSize:11,fontWeight:700,cursor:"pointer"}}>+ Add</button></div>
                  {(d.activities||[]).length===0&&<div style={{fontSize:11,color:B.textLight,padding:"8px",background:B.offWhite,borderRadius:9,textAlign:"center"}}>No activity cards</div>}
                  {(d.activities||[]).map(a=>(
                    <div key={a.id} style={{background:B.offWhite,borderRadius:11,padding:"10px 12px",marginBottom:8,border:`1px solid ${B.border}`}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}><div style={{fontSize:11,fontWeight:700,color:"#7044C9"}}>📍 {a.name||a.title||"Activity"}</div><button onClick={()=>removeActivity(d.id,a.id)} style={{background:"none",border:"none",color:B.orange,fontSize:14,cursor:"pointer"}}>✕</button></div>
                      <input value={a.name||a.title||""} onChange={e=>{updateActivity(d.id,a.id,"name",e.target.value);updateActivity(d.id,a.id,"title",e.target.value);}} placeholder="Activity name" style={{background:B.white,border:`1px solid ${B.border}`,borderRadius:8,color:B.text,padding:"9px 11px",fontSize:13,fontWeight:600,width:"100%",outline:"none",fontFamily:"'Poppins',sans-serif",marginBottom:8}}/>
                      <input value={a.photo||""} onChange={e=>updateActivity(d.id,a.id,"photo",e.target.value)} placeholder="Paste photo URL" style={{background:B.white,border:`1px solid ${B.border}`,borderRadius:8,color:B.text,padding:"9px 11px",fontSize:12,width:"100%",outline:"none",fontFamily:"'Poppins',sans-serif",marginBottom:6}}/>
                      {a.photo&&<img src={a.photo} alt={a.name} style={{width:"100%",height:90,objectFit:"cover",borderRadius:8}}/>}
                    </div>
                  ))}
                </div>
                {/* HOTEL STAY */}
                <div style={{marginBottom:12}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}><div style={{fontSize:10,color:B.orange,letterSpacing:2,fontWeight:700}}>🏨 HOTEL STAY</div><button onClick={()=>toggleStay(d.id)} style={{background:d.stay?B.orangeLight:B.tealLight,border:"none",color:d.stay?B.orange:B.teal,padding:"5px 11px",borderRadius:8,fontSize:11,fontWeight:700,cursor:"pointer"}}>{d.stay?"Remove":"+ Add Stay"}</button></div>
                  {d.stay&&(
                    <div style={{background:B.offWhite,borderRadius:11,padding:"10px 12px",border:`1px solid ${B.border}`}}>
                      <input value={d.stay.name} onChange={e=>updateStay(d.id,"name",e.target.value)} placeholder="Hotel name" style={{background:B.white,border:`1px solid ${B.border}`,borderRadius:8,color:B.text,padding:"8px 9px",fontSize:13,width:"100%",outline:"none",fontFamily:"'Poppins',sans-serif",marginBottom:8}}/>
                      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:6,marginBottom:8}}>
                        <input value={d.stay.checkInTime} onChange={e=>updateStay(d.id,"checkInTime",e.target.value)} placeholder="3:00 PM" style={{background:B.white,border:`1px solid ${B.border}`,borderRadius:8,color:B.text,padding:"7px 8px",fontSize:11,outline:"none",fontFamily:"'Poppins',sans-serif"}}/>
                        <input value={d.stay.checkOutTime} onChange={e=>updateStay(d.id,"checkOutTime",e.target.value)} placeholder="11:00 AM" style={{background:B.white,border:`1px solid ${B.border}`,borderRadius:8,color:B.text,padding:"7px 8px",fontSize:11,outline:"none",fontFamily:"'Poppins',sans-serif"}}/>
                        <input type="number" value={d.stay.nights} onChange={e=>updateStay(d.id,"nights",Number(e.target.value))} placeholder="Nights" style={{background:B.white,border:`1px solid ${B.border}`,borderRadius:8,color:B.text,padding:"7px 8px",fontSize:11,outline:"none",fontFamily:"'Poppins',sans-serif"}}/>
                      </div>
                      <input value={d.stay.photo||""} onChange={e=>updateStay(d.id,"photo",e.target.value)} placeholder="Hotel photo URL" style={{background:B.white,border:`1px solid ${B.border}`,borderRadius:8,color:B.text,padding:"7px 9px",fontSize:11,width:"100%",outline:"none",fontFamily:"'Poppins',sans-serif",marginBottom:8}}/>
                      {d.stay.photo&&<div style={{height:90,borderRadius:9,backgroundImage:`url(${d.stay.photo})`,backgroundSize:"cover",backgroundPosition:"center",marginBottom:8}}/>}
                      <div onClick={()=>updateStay(d.id,"breakfast",!d.stay.breakfast)} style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer"}}>
                        <div style={{width:36,height:20,borderRadius:10,background:d.stay.breakfast?B.teal:B.border,position:"relative",flexShrink:0}}><div style={{position:"absolute",top:2,left:d.stay.breakfast?16:2,width:16,height:16,borderRadius:"50%",background:"white",transition:"left .15s"}}/></div>
                        <span style={{fontSize:12,color:d.stay.breakfast?B.teal:B.textLight,fontWeight:600}}>Breakfast Included</span>
                      </div>
                    </div>
                  )}
                </div>
                {/* PHOTOS */}
                <div style={{marginBottom:12}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}><div style={{fontSize:10,color:B.textMid,letterSpacing:2,fontWeight:700}}>📷 PHOTOS</div><button onClick={()=>addPhoto(d.id)} style={{background:B.offWhite,border:`1px solid ${B.border}`,color:B.textMid,padding:"5px 11px",borderRadius:8,fontSize:11,fontWeight:700,cursor:"pointer"}}>+ Add URL</button></div>
                  {(d.photos||[]).length===0&&<div style={{fontSize:11,color:B.textLight,padding:"8px",background:B.offWhite,borderRadius:9,textAlign:"center"}}>No photos.</div>}
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>{(d.photos||[]).map(p=>(<div key={p.id} style={{position:"relative",borderRadius:9,overflow:"hidden",height:72}}><div style={{height:"100%",backgroundImage:`url(${p.url})`,backgroundSize:"cover",backgroundPosition:"center"}}/><button onClick={()=>removePhoto(d.id,p.id)} style={{position:"absolute",top:4,right:4,background:"rgba(0,0,0,0.55)",border:"none",color:"#fff",width:20,height:20,borderRadius:10,cursor:"pointer",fontSize:10,display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button></div>))}</div>
                </div>
                {/* TEXT BLOCKS */}
                <div>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}><div style={{fontSize:10,color:B.textMid,letterSpacing:2,fontWeight:700}}>📄 TEXT BLOCKS</div><button onClick={()=>addTextBlock(d.id)} style={{background:B.offWhite,border:`1px solid ${B.border}`,color:B.textMid,padding:"5px 11px",borderRadius:8,fontSize:11,fontWeight:700,cursor:"pointer"}}>+ Add</button></div>
                  {(d.textBlocks||[]).map(tb=>(<div key={tb.id} style={{display:"flex",gap:6,marginBottom:6}}><textarea value={tb.text} onChange={e=>updateTextBlock(d.id,tb.id,e.target.value)} placeholder="Extra info" rows={3} style={{flex:1,background:B.offWhite,border:`1.5px solid ${B.border}`,borderRadius:9,color:B.text,padding:"9px 11px",fontSize:12,outline:"none",fontFamily:"'Poppins',sans-serif",resize:"vertical"}}/><button onClick={()=>removeTextBlock(d.id,tb.id)} style={{background:"none",border:"none",color:B.orange,fontSize:14,cursor:"pointer",alignSelf:"flex-start",paddingTop:8}}>✕</button></div>))}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function AddFlightForm({onAdd,hasDefault,countryId,fxRates}){
  const [f,setF]=useState({name:"",airline:"",costPerPaxINR:0,isDefault:false});
  return <div>
    <Inp label="NAME" value={f.name} onChange={e=>setF(x=>({...x,name:e.target.value}))} placeholder="e.g. BLR → HKT (IndiGo)"/>
    <Inp label="AIRLINE" value={f.airline} onChange={e=>setF(x=>({...x,airline:e.target.value}))} placeholder="Airline"/>
    <CurrencyInp label="COST PER PAX" valueINR={f.costPerPaxINR} onChange={v=>setF(x=>({...x,costPerPaxINR:v}))} countryId={countryId} fxRates={fxRates}/>
    {!hasDefault&&<Toggle value={f.isDefault} onChange={()=>setF(x=>({...x,isDefault:!x.isDefault}))} label="Set as default"/>}
    <MBtn onClick={()=>{if(!f.name)return;onAdd({...f,id:"f"+uid()});setF({name:"",airline:"",costPerPaxINR:0,isDefault:false});}} style={{width:"100%"}}>+ Add Flight</MBtn>
  </div>;
}
function AddHotelForm({onAdd,hasDefault,countryId,fxRates}){
  const [h,setH]=useState({name:"",star:3,costPerNightINR:0,markup:0,markupType:"percent",isDynamic:false,isDefault:false});
  return <div>
    <Inp label="NAME" value={h.name} onChange={e=>setH(x=>({...x,name:e.target.value}))} placeholder="Hotel name"/>
    <Sel label="STARS" value={h.star} onChange={e=>setH(x=>({...x,star:Number(e.target.value)}))}><option value={3}>3★</option><option value={4}>4★</option><option value={5}>5★/Resort</option></Sel>
    <CurrencyInp label="COST/NIGHT (1 ROOM)" valueINR={h.costPerNightINR} onChange={v=>setH(x=>({...x,costPerNightINR:v}))} countryId={countryId} fxRates={fxRates}/>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
      <Inp label="MARKUP" type="number" value={h.markup} onChange={e=>setH(x=>({...x,markup:Number(e.target.value)}))}/>
      <Sel label="TYPE" value={h.markupType} onChange={e=>setH(x=>({...x,markupType:e.target.value}))}><option value="percent">%</option><option value="fixed">Fixed ₹</option></Sel>
    </div>
    <Toggle value={h.isDynamic} onChange={()=>setH(x=>({...x,isDynamic:!x.isDynamic}))} label="Daily Rate"/>
    {!hasDefault&&<Toggle value={h.isDefault} onChange={()=>setH(x=>({...x,isDefault:!x.isDefault}))} label="Set as default hotel"/>}
    <MBtn onClick={()=>{if(!h.name)return;onAdd({...h,id:"h"+uid()});setH({name:"",star:3,costPerNightINR:0,markup:0,markupType:"percent",isDynamic:false,isDefault:false});}} style={{width:"100%"}}>+ Add Hotel</MBtn>
  </div>;
}
function AddTransferForm({onAdd,countryId,fxRates}){
  const [t,setT]=useState({name:"",costPerVanINR:0,maxPax:8,isDefault:false});
  return <div>
    <Inp label="NAME" value={t.name} onChange={e=>setT(x=>({...x,name:e.target.value}))} placeholder="e.g. Airport → Hotel"/>
    <CurrencyInp label="COST/VAN" valueINR={t.costPerVanINR} onChange={v=>setT(x=>({...x,costPerVanINR:v}))} countryId={countryId} fxRates={fxRates}/>
    <Inp label="MAX PAX" type="number" value={t.maxPax} onChange={e=>setT(x=>({...x,maxPax:Number(e.target.value)}))}/>
    <Toggle value={t.isDefault} onChange={()=>setT(x=>({...x,isDefault:!x.isDefault}))} label="Include by default"/>
    <MBtn onClick={()=>{if(!t.name)return;onAdd({...t,id:"t"+uid()});setT({name:"",costPerVanINR:0,maxPax:8,isDefault:false});}} style={{width:"100%"}}>+ Add Transfer</MBtn>
  </div>;
}
function AddActivityForm({onAdd,countryId,fxRates}){
  const [a,setA]=useState({name:"",costPerPaxINR:0,kidCostPerPaxINR:0});
  return <div>
    <Inp label="NAME" value={a.name} onChange={e=>setA(x=>({...x,name:e.target.value}))} placeholder="Activity name"/>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
      <CurrencyInp label="ADULT COST/PAX" valueINR={a.costPerPaxINR} onChange={v=>setA(x=>({...x,costPerPaxINR:v}))} countryId={countryId} fxRates={fxRates}/>
      <CurrencyInp label="CHILD COST/PAX" valueINR={a.kidCostPerPaxINR} onChange={v=>setA(x=>({...x,kidCostPerPaxINR:v}))} countryId={countryId} fxRates={fxRates}/>
    </div>
    <MBtn onClick={()=>{if(!a.name)return;onAdd({...a,id:"ia"+uid()});setA({name:"",costPerPaxINR:0,kidCostPerPaxINR:0});}} style={{width:"100%"}}>+ Add</MBtn>
  </div>;
}
function AddAddonForm({onAdd,countryId,fxRates}){
  const [a,setA]=useState({name:"",costINR:0,kidCostINR:0,markup:20,markupType:"percent",hasQty:false,hasKidPrice:false});
  return <div>
    <Inp label="NAME" value={a.name} onChange={e=>setA(x=>({...x,name:e.target.value}))} placeholder="Activity name"/>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
      <CurrencyInp label="ADULT NET COST" valueINR={a.costINR} onChange={v=>setA(x=>({...x,costINR:v}))} countryId={countryId} fxRates={fxRates}/>
      {a.hasKidPrice&&<CurrencyInp label="CHILD NET COST" valueINR={a.kidCostINR} onChange={v=>setA(x=>({...x,kidCostINR:v}))} countryId={countryId} fxRates={fxRates}/>}
    </div>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
      <Inp label="MARKUP" type="number" value={a.markup} onChange={e=>setA(x=>({...x,markup:Number(e.target.value)}))}/>
      <Sel label="TYPE" value={a.markupType} onChange={e=>setA(x=>({...x,markupType:e.target.value}))}><option value="percent">%</option><option value="fixed">Fixed ₹</option></Sel>
    </div>
    <Toggle value={a.hasKidPrice} onChange={()=>setA(x=>({...x,hasKidPrice:!x.hasKidPrice}))} label="Has child price"/>
    <Toggle value={a.hasQty} onChange={()=>setA(x=>({...x,hasQty:!x.hasQty}))} label="Qty Selector"/>
    <MBtn onClick={()=>{if(!a.name)return;onAdd({...a,id:"a"+uid()});setA({name:"",costINR:0,kidCostINR:0,markup:20,markupType:"percent",hasQty:false,hasKidPrice:false});}} style={{width:"100%"}}>+ Add</MBtn>
  </div>;
}

function CountryMgr({data,setData}){
  const [n,setN]=useState({name:"",flag:"🌍",customId:""});
  return(<div>
    <PT sub="Manage destinations">Countries</PT>
    {data.countries.map(c=>{const cur=COUNTRY_CURRENCY[c.id];return <div key={c.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",background:B.white,border:`1.5px solid ${B.border}`,borderRadius:13,padding:"11px 13px",marginBottom:7}}>
      <div style={{display:"flex",alignItems:"center",gap:9}}><span style={{fontSize:22}}>{c.flag}</span><div><div style={{fontSize:13,fontWeight:700}}>{c.name}</div><div style={{fontSize:10,color:B.textLight}}>{cur?`${cur.symbol} ${cur.code} ·`:""} {data.packages.filter(p=>p.countryId===c.id).length} pkg(s)</div></div></div>
      <DBtn onClick={()=>{if(window.confirm(`Remove ${c.name}?`))setData(d=>({...d,countries:d.countries.filter(x=>x.id!==c.id),packages:d.packages.filter(p=>p.countryId!==c.id)}))}}>Remove</DBtn>
    </div>;})}
    <Card accent={B.teal}><SL>ADD COUNTRY</SL>
      <Inp label="NAME" value={n.name} onChange={e=>setN(x=>({...x,name:e.target.value}))} placeholder="e.g. Singapore"/>
      <Inp label="FLAG" value={n.flag} onChange={e=>setN(x=>({...x,flag:e.target.value}))} placeholder="🌍"/>
      <Inp label="COUNTRY ID (th/my/id/sg)" value={n.customId} onChange={e=>setN(x=>({...x,customId:e.target.value.toLowerCase()}))} placeholder="e.g. sg"/>
      <MBtn onClick={()=>{if(!n.name)return;setData(d=>({...d,countries:[...d.countries,{name:n.name,flag:n.flag,id:n.customId||"c"+uid()}]}));setN({name:"",flag:"🌍",customId:""});}} style={{width:"100%"}}>+ Add Country</MBtn>
    </Card>
  </div>);
}

function HotelPanel({user,data,setData,fxRates,fxError,onLogout}){
  const [cId,setCId]=useState("");const [pkgId,setPkgId]=useState("");
  const [hotels,setHotels]=useState([]);const [saved,setSaved]=useState(false);
  const [newH,setNewH]=useState({name:"",star:3,costPerNightINR:0,markup:0,markupType:"percent",isDynamic:false,isDefault:false});
  const pkgs=data.packages.filter(p=>p.countryId===cId&&p.isActive);
  const pkg=data.packages.find(p=>p.id===pkgId);
  useEffect(()=>{if(pkg)setHotels(JSON.parse(JSON.stringify(pkg.hotels||[])));return()=>{};},[pkgId]);
  function save(){const updated={...data.packages.find(p=>p.id===pkgId),hotels};setData(d=>({...d,packages:d.packages.map(p=>p.id===pkgId?updated:p)}));DB.savePkg(updated).catch(()=>{});setSaved(true);setTimeout(()=>setSaved(false),2000);}
  function updH(id,k,v){setHotels(hs=>hs.map(h=>h.id===id?{...h,[k]:["costPerNightINR","markup"].includes(k)?Number(v):v}:h));}
  function setDef(id){setHotels(hs=>hs.map(h=>({...h,isDefault:h.id===id})));}
  function addH(){if(!newH.name)return;setHotels(h=>[...h,{...newH,id:"h"+uid()}]);setNewH({name:"",star:3,costPerNightINR:0,markup:0,markupType:"percent",isDynamic:false,isDefault:false});}
  return(
    <Shell user={user} onLogout={onLogout} fxRates={fxRates} rateError={fxError} subtitle="Hotel Department">
      <PT sub="Country → Package → Hotels">Hotel Management</PT>
      <SL>SELECT COUNTRY</SL><CGrid countries={data.countries} selected={cId} onSelect={id=>{setCId(id);setPkgId("");}}/>
      {cId&&<><SL>SELECT PACKAGE</SL>
        {pkgs.map(p=><div key={p.id} onClick={()=>setPkgId(p.id)} style={{background:pkgId===p.id?B.tealLight:B.white,border:`2px solid ${pkgId===p.id?B.teal:B.border}`,borderRadius:13,padding:"12px",marginBottom:7,cursor:"pointer"}}><div style={{fontSize:13,fontWeight:700,color:pkgId===p.id?B.teal:B.text}}>{p.name}</div><div style={{fontSize:11,color:B.textLight}}>{p.duration}</div></div>)}
        {pkgs.length===0&&<div style={{color:B.textLight,fontSize:13,padding:14,textAlign:"center"}}>No active packages.</div>}
      </>}
      {pkg&&<>
        {hotels.map(h=>{const sell=h.isDynamic&&!h.costPerNightINR?null:sp(h.costPerNightINR,h.markup,h.markupType);return(
          <Card key={h.id} accent={h.isDefault?B.teal:STAR_COLOR[h.star]}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}><div><div style={{fontSize:13,fontWeight:700}}>{h.name}{h.isDefault&&<DefBadge/>}</div><div style={{fontSize:11,color:STAR_COLOR[h.star],fontWeight:600}}>{STAR_LABEL[h.star]}{h.isDynamic?" · Update Daily":""}</div>{sell>0&&<div style={{fontSize:11,color:B.teal}}>Sell: {fmtINR(sell)}/night</div>}</div><DBtn onClick={()=>setHotels(hs=>hs.filter(h2=>h2.id!==h.id))}>Remove</DBtn></div>
            <Inp label="NAME" value={h.name} onChange={e=>updH(h.id,"name",e.target.value)}/>
            <CurrencyInp label="COST/NIGHT (1 ROOM)" valueINR={h.costPerNightINR} onChange={v=>updH(h.id,"costPerNightINR",v)} countryId={cId} fxRates={fxRates}/>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
              <Inp label="MARKUP" type="number" value={h.markup} onChange={e=>updH(h.id,"markup",e.target.value)}/>
              <Sel label="TYPE" value={h.markupType} onChange={e=>updH(h.id,"markupType",e.target.value)}><option value="percent">%</option><option value="fixed">Fixed ₹</option></Sel>
            </div>
            <Toggle value={h.isDynamic} onChange={()=>updH(h.id,"isDynamic",!h.isDynamic)} label="Daily Rate"/>
            {!h.isDefault&&<SBtn onClick={()=>setDef(h.id)} style={{width:"100%"}}>Set as Default</SBtn>}
          </Card>
        );})}
        <Card accent={B.teal}><SL>ADD HOTEL</SL>
          <Inp label="NAME" value={newH.name} onChange={e=>setNewH(h=>({...h,name:e.target.value}))} placeholder="Hotel name"/>
          <Sel label="STARS" value={newH.star} onChange={e=>setNewH(h=>({...h,star:Number(e.target.value)}))}><option value={3}>3★</option><option value={4}>4★</option><option value={5}>5★/Resort</option></Sel>
          <CurrencyInp label="COST/NIGHT" valueINR={newH.costPerNightINR} onChange={v=>setNewH(h=>({...h,costPerNightINR:v}))} countryId={cId} fxRates={fxRates}/>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
            <Inp label="MARKUP" type="number" value={newH.markup} onChange={e=>setNewH(h=>({...h,markup:Number(e.target.value)}))}/>
            <Sel label="TYPE" value={newH.markupType} onChange={e=>setNewH(h=>({...h,markupType:e.target.value}))}><option value="percent">%</option><option value="fixed">Fixed ₹</option></Sel>
          </div>
          <Toggle value={newH.isDynamic} onChange={()=>setNewH(h=>({...h,isDynamic:!h.isDynamic}))} label="Daily Rate"/>
          {!hotels.some(h=>h.isDefault)&&<Toggle value={newH.isDefault} onChange={()=>setNewH(h=>({...h,isDefault:!h.isDefault}))} label="Set as default"/>}
          <MBtn onClick={addH} style={{width:"100%"}}>+ Add Hotel</MBtn>
        </Card>
        <PBtn onClick={save}>{saved?"✓ Saved!":"💾 Save Changes"}</PBtn>
      </>}
    </Shell>
  );
}

function OpsPanel({user,data,setData,fxRates,fxError,onLogout}){
  const [cId,setCId]=useState("");const [pkgId,setPkgId]=useState("");
  const [addons,setAddons]=useState([]);const [saved,setSaved]=useState(false);
  const [newA,setNewA]=useState({name:"",costINR:0,kidCostINR:0,markup:20,markupType:"percent",hasQty:false,hasKidPrice:false});
  const pkgs=data.packages.filter(p=>p.countryId===cId&&p.isActive);
  const pkg=data.packages.find(p=>p.id===pkgId);
  useEffect(()=>{if(pkg)setAddons(JSON.parse(JSON.stringify(pkg.addons||[])));return()=>{};},[pkgId]);
  function save(){const updated={...data.packages.find(p=>p.id===pkgId),addons};setData(d=>({...d,packages:d.packages.map(p=>p.id===pkgId?updated:p)}));DB.savePkg(updated).catch(()=>{});setSaved(true);setTimeout(()=>setSaved(false),2000);}
  function updA(id,k,v){setAddons(as=>as.map(a=>a.id===id?{...a,[k]:["costINR","kidCostINR","markup"].includes(k)?Number(v):v}:a));}
  function addNew(){if(!newA.name)return;setAddons(a=>[...a,{...newA,id:"a"+uid()}]);setNewA({name:"",costINR:0,kidCostINR:0,markup:20,markupType:"percent",hasQty:false,hasKidPrice:false});}
  return(
    <Shell user={user} onLogout={onLogout} fxRates={fxRates} rateError={fxError} subtitle="Operations Executive">
      <PT sub="Country → Package → Activities">Activity Management</PT>
      <div style={{background:"#fff8ee",border:`1px solid ${B.orange}33`,borderRadius:11,padding:"10px 13px",marginBottom:14,fontSize:12,color:B.orange,fontWeight:600}}>⚠ Prices confidential — not visible to sales.</div>
      <SL>SELECT COUNTRY</SL><CGrid countries={data.countries} selected={cId} onSelect={id=>{setCId(id);setPkgId("");}}/>
      {cId&&<><SL>SELECT PACKAGE</SL>
        {pkgs.map(p=><div key={p.id} onClick={()=>setPkgId(p.id)} style={{background:pkgId===p.id?"#effffa":B.white,border:`2px solid ${pkgId===p.id?B.mint:B.border}`,borderRadius:13,padding:"12px",marginBottom:7,cursor:"pointer"}}><div style={{fontSize:13,fontWeight:700,color:pkgId===p.id?B.teal:B.text}}>{p.name}</div><div style={{fontSize:11,color:B.textLight}}>{p.duration}</div></div>)}
        {pkgs.length===0&&<div style={{color:B.textLight,fontSize:13,padding:14,textAlign:"center"}}>No active packages.</div>}
      </>}
      {pkg&&<>
        {addons.map(a=>{const sell=sp(a.costINR,a.markup,a.markupType);const kidSell=a.hasKidPrice?sp(a.kidCostINR||0,a.markup,a.markupType):0;return(
          <Card key={a.id}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}><div><div style={{fontSize:13,fontWeight:700}}>{a.name}</div><div style={{fontSize:11,color:B.teal,fontWeight:600}}>Adult: {fmtINR(sell)}{a.hasKidPrice?` · Child: ${fmtINR(kidSell)}`:""}</div></div><DBtn onClick={()=>setAddons(xs=>xs.filter(x=>x.id!==a.id))}>Remove</DBtn></div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
              <CurrencyInp label="ADULT NET COST" valueINR={a.costINR} onChange={v=>updA(a.id,"costINR",v)} countryId={cId} fxRates={fxRates}/>
              {a.hasKidPrice&&<CurrencyInp label="CHILD NET COST" valueINR={a.kidCostINR||0} onChange={v=>updA(a.id,"kidCostINR",v)} countryId={cId} fxRates={fxRates}/>}
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
              <Inp label="MARKUP" type="number" value={a.markup} onChange={e=>updA(a.id,"markup",e.target.value)}/>
              <Sel label="TYPE" value={a.markupType} onChange={e=>updA(a.id,"markupType",e.target.value)}><option value="percent">%</option><option value="fixed">Fixed ₹</option></Sel>
            </div>
          </Card>
        );})}
        <Card accent={B.teal}><SL>ADD ACTIVITY</SL>
          <Inp label="NAME" value={newA.name} onChange={e=>setNewA(a=>({...a,name:e.target.value}))} placeholder="Activity name"/>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
            <CurrencyInp label="ADULT NET COST" valueINR={newA.costINR} onChange={v=>setNewA(a=>({...a,costINR:v}))} countryId={cId} fxRates={fxRates}/>
            {newA.hasKidPrice&&<CurrencyInp label="CHILD NET COST" valueINR={newA.kidCostINR} onChange={v=>setNewA(a=>({...a,kidCostINR:v}))} countryId={cId} fxRates={fxRates}/>}
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
            <Inp label="MARKUP" type="number" value={newA.markup} onChange={e=>setNewA(a=>({...a,markup:Number(e.target.value)}))}/>
            <Sel label="TYPE" value={newA.markupType} onChange={e=>setNewA(a=>({...a,markupType:e.target.value}))}><option value="percent">%</option><option value="fixed">Fixed ₹</option></Sel>
          </div>
          <Toggle value={newA.hasKidPrice} onChange={()=>setNewA(a=>({...a,hasKidPrice:!a.hasKidPrice}))} label="Has child price"/>
          <Toggle value={newA.hasQty} onChange={()=>setNewA(a=>({...a,hasQty:!a.hasQty}))} label="Qty Selector"/>
          <MBtn onClick={addNew} style={{width:"100%"}}>+ Add</MBtn>
        </Card>
        <PBtn onClick={save}>{saved?"✓ Saved!":"💾 Save Changes"}</PBtn>
      </>}
    </Shell>
  );
}

// ── DATE HELPERS ──────────────────────────────────────────────────────────────
function addDays(dateStr, days) {
  if(!dateStr) return `Day ${days+1}`;
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d;
}
function fmtShort(d){if(!d)return "";const dt=typeof d==="string"?new Date(d):d;return dt.toLocaleDateString("en-GB",{day:"2-digit",month:"short"});}
function fmtYear(d){if(!d)return "";const dt=typeof d==="string"?new Date(d):d;return "'"+String(dt.getFullYear()).slice(2);}
function formatDate(dateStr) {if(!dateStr) return "";const d = new Date(dateStr);return fmtShort(d)+" "+fmtYear(d);}
function dateRange(startStr, endDateObj) {if(!startStr) return "";const s = new Date(startStr);const e = endDateObj instanceof Date ? endDateObj : new Date(endDateObj);return fmtShort(s)+" - "+fmtShort(e)+" "+fmtYear(e);}

// ── COUNTRY PHOTOS ────────────────────────────────────────────────────────────
const COUNTRY_PHOTOS={
  "th":["https://aapbbeqwnnhmhedsgryt.supabase.co/storage/v1/object/public/photos/IMG_2109.JPG","https://aapbbeqwnnhmhedsgryt.supabase.co/storage/v1/object/public/photos/IMG_2110.JPG","https://aapbbeqwnnhmhedsgryt.supabase.co/storage/v1/object/public/photos/IMG_2111.JPG"],
  "my":["https://aapbbeqwnnhmhedsgryt.supabase.co/storage/v1/object/public/photos/IMG_2109.JPG"],
};
const HERO_PHOTOS=COUNTRY_PHOTOS["th"];

// ── DEFAULT PHUKET ITINERARY ──────────────────────────────────────────────────
const DEFAULT_PHUKET_ITINERARY = [
  {id:"d1",title:"Arrival & Explore Nightlife",location:"Phuket",emoji:"✈️",transfers:[{id:"t1",from:"Phuket International Airport",to:"Hotel",vehicle:"SUV or Similar",note:"Meet our representative at 9:30 AM"}],bulletNotes:["Arrive Phuket airport, meet representative at 9:30 AM.","Hotel drop-off. Check-in at 3:00 PM.","Rest till 6:15 PM, leave at 6:30 PM for Patong night walk.","Covers Bangla Road, Patong Beach, Street Food.","Back at hotel by 11:00 PM."],activities:[{id:"ac1",title:"Patong Beach",name:"Patong Beach",description:"",photo:""},{id:"ac2",title:"Night Street Food",name:"Night Street Food",description:"",photo:""}],stay:{name:"Sunshine Patong",checkInTime:"3:00 PM",checkOutTime:"11:00 AM",nights:4,breakfast:true,photo:""},leisure:"",photos:[],textBlocks:[]},
  {id:"d2",title:"City Tour (Big Buddha, Chalong Temple, Elephant Trekking, Tiger Photo)",location:"Phuket",emoji:"🏛️",transfers:[{id:"t2",from:"Hotel",to:"City Tour Spots",vehicle:"A/C Coach",note:"Pickup at 12:00 PM"}],bulletNotes:["Pickup from hotel at 12:00 PM for city tour — 8 attractions.","Includes Tiger Kingdom — photo with tiger or lion.","Back at hotel at 6:00 PM. Evening free to explore."],activities:[{id:"ac3",title:"Chalong Temple",name:"Chalong Temple",description:"",photo:""},{id:"ac4",title:"Big Buddha",name:"Big Buddha",description:"",photo:""},{id:"ac5",title:"Old Phuket Town",name:"Old Phuket Town",description:"",photo:""},{id:"ac6",title:"Tiger Kingdom",name:"Tiger Kingdom",description:"",photo:""}],stay:null,leisure:"",photos:[],textBlocks:[]},
  {id:"d3",title:"Phi Phi Island Tour (7 Island Full Day with Buffet Lunch)",location:"Phi Phi Islands",emoji:"🏝️",transfers:[{id:"t3",from:"Hotel",to:"Pier",vehicle:"A/C Coach",note:"Pickup at 7:00 AM"},{id:"t4",from:"Pier",to:"Phi Phi Islands",vehicle:"Speedboat",note:"Depart 9:30 AM — Breakfast included"}],bulletNotes:["Pickup at 7:00 AM for Phi Phi Island tour — 7 islands.","9:00 AM — arrive pier, complimentary breakfast.","9:30 AM — depart by speedboat.","Covers Maya Bay, Viking Cave, Monkey Beach, Khai Island. Lunch included.","Back at hotel by 6:00 PM."],activities:[{id:"ac7",title:"Maya Bay",name:"Maya Bay",description:"",photo:""},{id:"ac8",title:"Monkey Beach",name:"Monkey Beach",description:"",photo:""},{id:"ac9",title:"Snorkeling",name:"Snorkeling",description:"",photo:""},{id:"ac10",title:"Buffet Lunch",name:"Buffet Lunch",description:"",photo:""}],stay:null,leisure:"",photos:[],textBlocks:[]},
  {id:"d4",title:"Free Day — Explore at Your Own Pace",location:"Phuket",emoji:"🎪",transfers:[],bulletNotes:["Free day unless add-on purchased.","Stay continues as normal if no add-on.","See add-on brochure for details."],activities:[{id:"ac11",title:"James Bond Island",name:"James Bond Island",description:"",photo:""},{id:"ac12",title:"Yona Beach Club",name:"Yona Beach Club",description:"",photo:""},{id:"ac13",title:"Magic Carnival",name:"Magic Carnival",description:"",photo:""}],stay:null,leisure:"Enjoy the day at your own pace ✨",photos:[],textBlocks:[]},
  {id:"d5",title:"Departure (Dolphin Show & Old Phuket Town)",location:"Airport",emoji:"🛫",transfers:[{id:"t5",from:"Hotel",to:"Phuket International Airport",vehicle:"A/C Vehicle",note:"Pickup from hotel lobby at 1:00 PM"}],bulletNotes:["Check out per hotel standard time.","Pickup at 1:00 PM.","Dolphin Show, Central Phuket Mall, Old Phuket Town.","Drop-off at airport."],activities:[{id:"ac14",title:"Dolphin Show (45 min)",name:"Dolphin Show (45 min)",description:"",photo:""},{id:"ac15",title:"Central Phuket Mall (2 hr)",name:"Central Phuket Mall (2 hr)",description:"",photo:""},{id:"ac16",title:"Old Phuket Town (2 hr)",name:"Old Phuket Town (2 hr)",description:"",photo:""}],stay:null,leisure:"Until the next adventure! Bon Voyage! 🌟",photos:[],textBlocks:[]},
];

function buildItinerary(quote){
  const {pkg,arrivalDate,selAddons,addonQtys,extraHotelStays}=quote;
  if(!pkg) return [];
  const template=(pkg.itineraryDays&&pkg.itineraryDays.length>0)?pkg.itineraryDays:(pkg.id==="pkg1"?DEFAULT_PHUKET_ITINERARY:[]);
  if(!template.length) return [];
  const extraNights=(extraHotelStays||[]).reduce((s,x)=>s+(x.nights||0),0);
  const FREE_KW=["yona","scuba"];
  const isFree=a=>FREE_KW.some(k=>a.name.toLowerCase().includes(k));
  const paidAddons=[];const freeAddons=[];
  (pkg.addons||[]).forEach(a=>{
    const sel=a.hasQty?((addonQtys||{})[a.id]||0)>0:(selAddons||[]).includes(a.id);
    if(!sel)return;
    const qty=a.hasQty?(addonQtys||{})[a.id]:null;
    if(isFree(a))freeAddons.push({...a,qty});else paidAddons.push({...a,qty});
  });
  const selHotelObj=quote.curHotel||quote.defHotel||(quote.selHotel?(pkg.hotels||[]).find(h=>h.id===quote.selHotel):(pkg.hotels||[]).find(h=>h.isDefault));
  const hotelName=selHotelObj?.name||"Hotel";
  const fixed=template.slice(0,3).map((d,i)=>{
    const mapped={...d,day:i+1,date:arrivalDate?fmtShort(addDays(arrivalDate,i))+" "+fmtYear(addDays(arrivalDate,i)):`Day ${i+1}`};
    if(i===0&&mapped.transfers){mapped.transfers=mapped.transfers.map(t=>({...t,to:t.to==="Hotel"||t.to==="Sunshine Patong"||t.to==="hotel"?hotelName:t.to}));}
    if(mapped.stay){mapped.stay={...mapped.stay,name:hotelName,photo:selHotelObj?.photos?.[0]||mapped.stay.photo||""};}
    if(i===0&&mapped.stay){mapped.stay={...mapped.stay,hotelPhotos:(selHotelObj?.photos||[]).filter(Boolean)};}
    return mapped;
  });
  const totalSlots=1+extraNights;const middleDays=[];
  for(let i=0;i<totalSlots;i++){
    const addon=paidAddons[i];const dayNum=4+i;
    const dateStr=arrivalDate?fmtShort(addDays(arrivalDate,dayNum-1))+" "+fmtYear(addDays(arrivalDate,dayNum-1)):`Day ${dayNum}`;
    if(addon){
      const base=DEFAULT_PHUKET_ITINERARY[3]||{};
      const addOnActivities=[{id:"ao"+i,name:addon.name+(addon.qty?` ×${addon.qty} tickets`:""),duration:"Full Day",ticketIncluded:true,notes:[],photo:"",description:""},...freeAddons.map((fa,fi)=>({id:"fa"+fi,name:fa.name+(fa.qty?` ×${fa.qty}`:``),duration:"Included",ticketIncluded:true,notes:[],photo:"",description:""}))];
      middleDays.push({...base,id:"addon_"+i,day:dayNum,date:dateStr,title:addon.name+(addon.qty?` ×${addon.qty}`:""),emoji:"🎪",location:"Phuket",transfers:[],activities:addOnActivities,bulletNotes:[`Enjoy ${addon.name} today.`,...freeAddons.map(fa=>`${fa.name} also included.`)],stay:null,leisure:"Enjoy the evening at your own pace ✨"});
    } else {
      middleDays.push({id:"free_"+i,day:dayNum,date:dateStr,title:"Free Day — Explore at Your Own Pace",emoji:"🌴",location:"Phuket",transfers:[],bulletNotes:["Today is a free day. Explore Phuket at your own pace.","Visit local markets, beaches, or simply relax at the hotel."],activities:i===0&&paidAddons.length===0?freeAddons.map((fa,fi)=>({id:"fa"+fi,name:fa.name+(fa.qty?` ×${fa.qty}`:``),duration:"Included",ticketIncluded:true,notes:[],photo:"",description:""})):[],stay:{name:hotelName,checkInTime:"3:00 PM",checkOutTime:"11:00 AM",nights:1,breakfast:selHotelObj?.breakfast!==false,photo:selHotelObj?.photos?.[0]||"",hotelPhotos:[]},leisure:"Enjoy the day at leisure ✨",photos:[],textBlocks:[]});
    }
  }
  const deptTemplate=template[template.length-1]||{};const lastDayNum=4+totalSlots;
  const departure={...deptTemplate,id:"departure",day:lastDayNum,date:arrivalDate?fmtShort(addDays(arrivalDate,lastDayNum-1))+" "+fmtYear(addDays(arrivalDate,lastDayNum-1)):`Day ${lastDayNum}`,title:deptTemplate.title||"Departure",emoji:deptTemplate.emoji||"🛫"};
  return [...fixed,...middleDays,departure];
}

// ── ICONS ─────────────────────────────────────────────────────────────────────
const Icon={
  ChevronDown:({size=18,color="#6B7280"})=><svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>,
  Car:({size=18,color="#6B7280"})=><svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 17H3a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h2l2-4h8l2 4h2a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2h-2"/><circle cx="7.5" cy="17" r="1.5"/><circle cx="16.5" cy="17" r="1.5"/></svg>,
  Bed:({size=18,color="#6B7280"})=><svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2 4v16"/><path d="M2 8h18a2 2 0 0 1 2 2v10"/><path d="M2 17h20"/><path d="M6 8v9"/></svg>,
  Ticket:({size=18,color="#6B7280"})=><svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"/></svg>,
  MapPin:({size=18,color="#6B7280"})=><svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>,
  WhatsApp:({size=20,color="#fff"})=><svg width={size} height={size} viewBox="0 0 24 24" fill={color}><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/></svg>,
};

// ── ITINERARY THEME ───────────────────────────────────────────────────────────
const IT = {
  bg:"#F3F4F6",card:"#FFFFFF",cardAlt:"#F9FAFB",border:"#E5E7EB",ink:"#111827",sub:"#374151",muted:"#6B7280",faint:"#9CA3AF",teal:"#0496a5",tealLight:"#E0F7FA",accentLight:"#E0F7FA",orange:"#F97316",orangeLight:"#FFF7ED",mint:"#24fbaa",green:"#059669",greenBg:"#ECFDF5",red:"#EF4444",redBg:"#FEF2F2",
};

const itCSS=`
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Playfair+Display:ital,wght@1,400;1,700&display=swap');
  .it-page *{box-sizing:border-box;}
  .it-page{font-family:'Inter',sans-serif;background:${IT.bg};color:${IT.ink};}
  .it-chevron{transition:transform 0.25s ease;}
  .it-chevron.open{transform:rotate(180deg);}
  @media print{.it-noprint{display:none!important;}}
`;

// ── ITINERARY PAGE ────────────────────────────────────────────────────────────
function ItineraryPage({quote,onBack}){
  const [openDay,setOpenDay]=useState(0);
  const cardRefs=useRef({});
  const [lightbox,setLightbox]=useState(null); // {photos:[],idx:0}
  const days=buildItinerary(quote);
  const {T,pax,pkg,clientName,arrivalDate,chosenDiscount,appliedRef}=quote;
  const COUNTRY_NAMES={"th":"Thailand","my":"Malaysia","id":"Indonesia","sg":"Singapore"};
  const countryName=COUNTRY_NAMES[pkg?.countryId]||"Thailand";
  const totalPax=PAX_KEYS.reduce((s,k)=>s+(pax[k]||0),0);
  const nights=pkg?.nights||4;
  const extraNightsTotal=(quote.extraHotelStays||[]).reduce((s,x)=>s+(x.nights||0),0);
  const totalNights=nights+extraNightsTotal;
  const endDate=arrivalDate?addDays(arrivalDate,totalNights):null;
  const IMGS=COUNTRY_PHOTOS[pkg?.countryId]||HERO_PHOTOS;
  const [imgIdx,setImgIdx]=useState(0);
  useEffect(()=>{const t=setInterval(()=>setImgIdx(i=>(i+1)%IMGS.length),4000);return()=>clearInterval(t);},[IMGS.length]);

  function handleToggle(idx){
    const ref=cardRefs.current[idx];
    const nextOpen=openDay===idx?-1:idx;
    if(ref&&nextOpen!==-1){
      // Capture position BEFORE expanding, then scroll after render
      const top=ref.getBoundingClientRect().top+window.scrollY-60;
      setOpenDay(nextOpen);
      // Wait for re-render then scroll so day header is at top
      setTimeout(()=>window.scrollTo({top,behavior:'smooth'}),50);
    } else {
      setOpenDay(nextOpen);
    }
  }

  function shareWA(){
    let msg=`✈️ *${clientName?clientName+"'s ":""}${countryName} Trip — Kairali Trails*\n`;
    msg+=`${pkg?.duration} · ${pkg?.route}\n`;
    if(arrivalDate)msg+=`📅 ${endDate?dateRange(arrivalDate,endDate):formatDate(arrivalDate)}\n`;
    msg+=`👥 ${totalPax} Traveller${totalPax!==1?"s":""} · 💰 ${fmtINR(T.grand)}\n\n━━━━━━━━━━━━━━\n`;
    days.forEach(d=>{msg+=`*Day ${d.day}* ${d.emoji} ${d.title} — ${d.date}\n`;(d.bulletNotes||[]).forEach(n=>{msg+=`• ${n}\n`;});if(d.stay)msg+=`🏨 ${d.stay.name} (${d.stay.nights}N)\n`;msg+="\n";});
    msg+=`━━━━━━━━━━━━━━\n💰 Total: ${fmtINR(T.grand)}\n📞 Kairali Trails | +91 800 800 4016`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`,'_blank');
  }

  const inclusions=[];
  const flight=quote.selFlight?(quote.curFlight||quote.defFlight):null;
  const hotel=quote.selHotel?(quote.curHotel||quote.defHotel):null;
  (pkg?.defaultInclusions||[]).forEach(x=>inclusions.push(x));
  if(flight)inclusions.push(`✈ Return flights — ${flight.airline} (${flight.name})`);
  const hotelNights=totalNights;const hotelName2=hotel?.name||"Hotel";const hasBreakfast=hotel?.breakfast!==false;
  if(hotel)inclusions.push(`🏨 ${hotelName2} — ${hotelNights} nights${hasBreakfast?" (Breakfast included)":""}`);
  (quote.extraHotelStays||[]).forEach(stay=>{const h=(pkg?.hotels||[]).find(x=>x.id===stay.hotelId);if(h&&stay.nights)inclusions.push(`🏨 ${h.name} — ${stay.nights} extra night${stay.nights>1?"s":""}`);});
  (pkg?.transfers||[]).filter(t=>t.isDefault).forEach(t=>inclusions.push(`🚐 ${t.name||"Airport transfer"}`));
  (pkg?.includedActivities||[]).filter(a=>(quote.activeIncActs||[]).includes(a.id)).forEach(a=>inclusions.push(`🎯 ${a.name}`));
  (pkg?.addons||[]).forEach(a=>{if(a.hasQty){const q=(quote.addonQtys||{})[a.id]||0;if(q>0)inclusions.push(`🎪 ${a.name} × ${q} tickets`);}else if((quote.selAddons||[]).includes(a.id))inclusions.push(`🎪 ${a.name}`);});
  const exclusions=[...((pkg?.defaultExclusions)||[])];
  if(!flight)exclusions.push("✈ International/domestic flights");
  if(!exclusions.some(e=>e.toLowerCase().includes("personal")))exclusions.push("Personal expenses & gratuities");
  if(!exclusions.some(e=>e.toLowerCase().includes("visa")))exclusions.push("Visa fees & travel insurance");
  if(!exclusions.some(e=>e.toLowerCase().includes("meal")))exclusions.push("Meals unless specified");

  return(
    <div className="it-page" style={{minHeight:"100vh",paddingBottom:80,maxWidth:480,margin:"0 auto",fontFamily:"'Inter',sans-serif"}}>
      <style>{itCSS}</style>

      {/* HERO */}
      <div style={{position:"relative",height:260,overflow:"hidden",background:"#0a2a3a"}}>
        {IMGS.map((src,i)=><img key={i} src={src} alt="" style={{position:"absolute",inset:0,width:"100%",height:"100%",objectFit:"cover",objectPosition:"center",opacity:i===imgIdx?1:0,transition:"opacity 1.2s ease",display:"block"}}/>)}
        <div style={{position:"absolute",inset:0,background:"linear-gradient(to bottom,rgba(0,0,0,0.25) 0%,rgba(0,0,0,0.65) 100%)"}}/>
        <div style={{position:"absolute",top:0,left:0,right:0,zIndex:3,display:"flex",justifyContent:"space-between",alignItems:"center",padding:"16px"}}>
          <button onClick={onBack} className="it-noprint" style={{display:"flex",alignItems:"center",gap:6,background:"rgba(255,255,255,0.18)",backdropFilter:"blur(8px)",border:"1px solid rgba(255,255,255,0.3)",color:"#fff",padding:"8px 14px",borderRadius:20,fontSize:13,fontWeight:500,cursor:"pointer",fontFamily:"'Inter',sans-serif"}}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg>Back
          </button>
          <div style={{background:"rgba(255,255,255,0.18)",backdropFilter:"blur(8px)",border:"1px solid rgba(255,255,255,0.3)",padding:"5px 12px",borderRadius:20,fontSize:11,fontWeight:600,color:"#fff"}}>{imgIdx+1}/{IMGS.length}</div>
        </div>
        <div style={{position:"absolute",bottom:0,left:0,right:0,zIndex:2,padding:"0 16px 20px"}}>
          <div style={{fontSize:26,fontWeight:400,color:"#fff",lineHeight:1.2,fontFamily:"'Playfair Display',serif",fontStyle:"italic",textShadow:"0 2px 8px rgba(0,0,0,0.5)"}}>{clientName?`${clientName}'s`:"Your"} {countryName} Trip</div>
          <div style={{fontSize:12,color:"rgba(255,255,255,0.85)",marginTop:4,fontFamily:"'Inter',sans-serif"}}>
            <div style={{display:"flex",alignItems:"center",gap:5,marginBottom:3}}><Icon.MapPin size={12} color="rgba(255,255,255,0.85)"/><span>{quote.dynDuration||pkg?.duration||"5 Days / 4 Nights"} · {countryName}</span></div>
            {arrivalDate&&endDate&&<div style={{fontSize:12,fontWeight:600,color:"rgba(255,255,255,0.95)"}}>📅 {dateRange(arrivalDate,endDate)}</div>}
          </div>
          <div style={{display:"flex",gap:5,marginTop:10}}>{IMGS.map((_,i)=><div key={i} onClick={()=>setImgIdx(i)} style={{width:i===imgIdx?18:5,height:5,borderRadius:3,background:i===imgIdx?"#fff":"rgba(255,255,255,0.45)",transition:"all 0.3s",cursor:"pointer"}}/>)}</div>
        </div>
      </div>

      {/* ITINERARY DAYS */}
      <div style={{padding:"10px 12px 0"}}>
        {days.map((d,idx)=>(
          <ItinDayCard key={d.id||idx} d={d} isOpen={openDay===idx} onToggle={()=>handleToggle(idx)} cardRef={el=>cardRefs.current[idx]=el} onOpenLightbox={(photos,startIdx)=>setLightbox({photos,idx:startIdx})}/>
        ))}
      </div>

      {/* INCLUSIONS */}
      <div style={{margin:"8px 12px 0",background:IT.card,borderRadius:12,padding:"14px",border:`1px solid ${IT.border}`,fontFamily:"'Inter',sans-serif"}}>
        <div style={{fontSize:15,fontWeight:700,color:IT.ink,marginBottom:10,display:"flex",alignItems:"center",gap:8}}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={IT.green} strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>What's Included
        </div>
        {inclusions.map((item,i)=>(
          <div key={i} style={{display:"flex",gap:8,padding:"6px 0",borderBottom:i<inclusions.length-1?`1px solid ${IT.border}`:"none",alignItems:"flex-start"}}>
            <div style={{width:18,height:18,borderRadius:9,background:IT.greenBg,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,marginTop:1}}><svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke={IT.green} strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg></div>
            <div style={{fontSize:13,color:IT.sub,lineHeight:1.5}}>{item}</div>
          </div>
        ))}
        {inclusions.length===0&&<div style={{fontSize:13,color:IT.muted}}>Select package options to see inclusions.</div>}
      </div>

      {/* EXCLUSIONS */}
      <div style={{margin:"8px 12px 0",background:IT.card,borderRadius:12,padding:"14px",border:`1px solid ${IT.border}`,fontFamily:"'Inter',sans-serif"}}>
        <div style={{fontSize:15,fontWeight:700,color:IT.ink,marginBottom:10,display:"flex",alignItems:"center",gap:8}}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={IT.red} strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>Not Included
        </div>
        {exclusions.map((item,i)=>(
          <div key={i} style={{display:"flex",gap:8,padding:"6px 0",borderBottom:i<exclusions.length-1?`1px solid ${IT.border}`:"none",alignItems:"flex-start"}}>
            <div style={{width:18,height:18,borderRadius:9,background:IT.redBg,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,marginTop:1}}><svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke={IT.red} strokeWidth="3"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></div>
            <div style={{fontSize:13,color:IT.sub,lineHeight:1.5}}>{item}</div>
          </div>
        ))}
      </div>

      {/* FARE BREAKUP */}
      <div style={{margin:"8px 12px 0",background:IT.card,borderRadius:12,padding:"14px",border:`1px solid ${IT.border}`,fontFamily:"'Inter',sans-serif"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
          <div style={{fontSize:15,fontWeight:700,color:IT.ink}}>💰 Fare Breakup</div>
          {totalPax>0&&<div style={{fontSize:12,color:IT.muted}}>{fmtINR(Math.round(T.grand/totalPax))}/person</div>}
        </div>
        <div style={{background:IT.accentLight,borderRadius:8,padding:"8px 10px",marginBottom:10}}>
          <div style={{fontSize:10,color:IT.teal,fontWeight:700,letterSpacing:1,marginBottom:2}}>PACKAGE</div>
          <div style={{fontSize:13,fontWeight:700,color:IT.teal}}>{pkg?.name}</div>
          <div style={{fontSize:11,color:IT.muted}}>{pkg?.route} · {quote.dynDuration||pkg?.duration}</div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr auto auto",gap:"0 8px",borderBottom:`1px solid ${IT.border}`,paddingBottom:4,marginBottom:2}}>
          <div style={{fontSize:10,color:IT.muted,fontWeight:700,padding:"4px 0"}}>ITEM</div>
          <div style={{fontSize:10,color:IT.muted,fontWeight:700,padding:"4px 0",textAlign:"right"}}>QTY</div>
          <div style={{fontSize:10,color:IT.muted,fontWeight:700,padding:"4px 0",textAlign:"right"}}>AMOUNT</div>
        </div>
        {PAX_KEYS.filter(k=>pax[k]>0).map(k=>(
          <div key={k} style={{display:"grid",gridTemplateColumns:"1fr auto auto",gap:"0 8px",padding:"7px 0",borderBottom:`1px solid ${IT.border}`}}>
            <span style={{fontSize:13,color:IT.sub}}>Package — {PAX_LABELS[k]}</span>
            <span style={{fontSize:13,color:IT.muted,textAlign:"right"}}>{pax[k]}</span>
            <span style={{fontSize:13,fontWeight:600,color:IT.ink,textAlign:"right"}}>{fmtINR(pax[k]*(pkg?.basePrices[k]||0))}</span>
          </div>
        ))}
        {quote.selFlight&&quote.curFlight&&T.flightAdj!==0&&(<div style={{display:"flex",justifyContent:"space-between",padding:"7px 0",borderBottom:`1px solid ${IT.border}`}}><span style={{fontSize:13,color:IT.sub}}>✈ {quote.curFlight.name}</span><span style={{fontSize:13,fontWeight:600,color:T.flightAdj<0?IT.red:IT.ink}}>{T.flightAdj>=0?"+":""}{fmtINR(T.flightAdj)}</span></div>)}
        {T.flightExtraTotal>0&&<div style={{display:"flex",justifyContent:"space-between",padding:"7px 0",borderBottom:`1px solid ${IT.border}`}}><span style={{fontSize:13,color:IT.sub}}>✈ {T.flightExtraLabel||"Flight Extra"}</span><span style={{fontSize:13,fontWeight:600,color:IT.ink}}>{fmtINR(T.flightExtraTotal)}</span></div>}
        {quote.selHotel&&quote.curHotel&&quote.curHotel.id!==quote.defHotel?.id&&T.hotelAdj!==0&&(<div style={{display:"flex",justifyContent:"space-between",padding:"7px 0",borderBottom:`1px solid ${IT.border}`}}><span style={{fontSize:13,color:IT.sub}}>🏨 {quote.curHotel.name}</span><span style={{fontSize:13,fontWeight:600,color:IT.ink}}>{T.hotelAdj>=0?"+":""}{fmtINR(T.hotelAdj)}</span></div>)}
        {(quote.extraHotelStays||[]).map((stay,si)=>{const h=(pkg?.hotels||[]).find(x=>x.id===stay.hotelId);if(!h||!stay.nights)return null;const cost=sp(h.costPerNightINR,h.markup,h.markupType)*stay.nights;return <div key={si} style={{display:"flex",justifyContent:"space-between",padding:"7px 0",borderBottom:`1px solid ${IT.border}`}}><span style={{fontSize:13,color:IT.sub}}>🏨 {h.name} — {stay.nights}N</span><span style={{fontSize:13,fontWeight:600,color:IT.ink}}>{fmtINR(cost)}</span></div>;})}
        {(pkg?.addons||[]).map((a,ai)=>{
          const adultSell=sp(a.costINR,a.markup,a.markupType);const kidSell=a.hasKidPrice?sp(a.kidCostINR||0,a.markup,a.markupType):adultSell;
          if(a.hasQty){const qty=(quote.addonQtys||{})[a.id]||0;if(qty===0)return null;return <div key={ai} style={{display:"grid",gridTemplateColumns:"1fr auto auto",gap:"0 8px",padding:"7px 0",borderBottom:`1px solid ${IT.border}`}}><span style={{fontSize:13,color:IT.sub}}>↳ {a.name}</span><span style={{fontSize:13,color:IT.muted,textAlign:"right"}}>{qty}</span><span style={{fontSize:13,fontWeight:600,textAlign:"right"}}>{fmtINR(adultSell*qty)}</span></div>;}
          if(!(quote.selAddons||[]).includes(a.id))return null;
          const total=adultSell*(pax.adult||0)+kidSell*((pax.child_5_11||0)+(pax.child_2_4||0));
          return <div key={ai} style={{display:"grid",gridTemplateColumns:"1fr auto auto",gap:"0 8px",padding:"7px 0",borderBottom:`1px solid ${IT.border}`}}><span style={{fontSize:13,color:IT.sub}}>↳ {a.name}</span><span style={{fontSize:13,color:IT.muted,textAlign:"right"}}>{(pax.adult||0)+((pax.child_5_11||0)+(pax.child_2_4||0))}</span><span style={{fontSize:13,fontWeight:600,textAlign:"right"}}>{fmtINR(total)}</span></div>;
        })}
        {T.discountAmt>0&&<div style={{display:"flex",justifyContent:"space-between",padding:"7px 0",borderBottom:`1px solid ${IT.border}`}}><span style={{fontSize:13,color:IT.green}}>{chosenDiscount?.name||"Discount"}</span><span style={{fontSize:13,fontWeight:600,color:IT.green}}>−{fmtINR(T.discountAmt)}</span></div>}
        {T.refAmt>0&&appliedRef&&<div style={{display:"flex",justifyContent:"space-between",padding:"7px 0",borderBottom:`1px solid ${IT.border}`}}><span style={{fontSize:13,color:IT.green}}>Referral: {appliedRef.code}</span><span style={{fontSize:13,fontWeight:600,color:IT.green}}>−{fmtINR(T.refAmt)}</span></div>}
        <div style={{display:"flex",justifyContent:"space-between",padding:"7px 0",borderBottom:`1px solid ${IT.border}`}}><span style={{fontSize:13,color:IT.muted}}>GST (5%)</span><span style={{fontSize:13}}>{fmtINR(T.gst)}</span></div>
        <div style={{display:"flex",justifyContent:"space-between",padding:"7px 0",borderBottom:`1px solid ${IT.border}`}}><span style={{fontSize:13,color:IT.muted}}>TCS (2%)</span><span style={{fontSize:13}}>{fmtINR(T.tcs)}</span></div>
        <div style={{display:"flex",justifyContent:"space-between",padding:"12px 0 0"}}><span style={{fontSize:16,fontWeight:800,color:IT.ink}}>Grand Total</span><span style={{fontSize:16,fontWeight:800,color:IT.teal}}>{fmtINR(T.grand)}</span></div>
        {totalPax>0&&<div style={{textAlign:"center",fontSize:11,color:IT.muted,marginTop:6}}>{fmtINR(Math.round(T.grand/totalPax))} per person</div>}
        <div style={{textAlign:"center",fontStyle:"italic",fontSize:11,color:IT.teal,marginTop:4}}>*Prices inclusive of all taxes</div>
      </div>

      {/* TRUST */}
      <div style={{margin:"8px 12px 0",background:IT.card,borderRadius:12,padding:"14px",border:`1px solid ${IT.border}`,fontFamily:"'Inter',sans-serif"}}>
        <div style={{fontSize:14,fontWeight:700,marginBottom:10}}>Why Kairali Trails</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
          {[{icon:"🛡",t:"Trusted Agency",d:"Verified & experienced"},{icon:"🎫",t:"All Tickets",d:"Included & arranged"},{icon:"🚗",t:"Private Transfers",d:"AC vehicle throughout"},{icon:"💬",t:"24/7 Support",d:"Always reachable"}].map((f,i)=>(
            <div key={i} style={{padding:"10px",borderRadius:10,background:IT.cardAlt,textAlign:"center"}}>
              <div style={{fontSize:20,marginBottom:4}}>{f.icon}</div>
              <div style={{fontSize:11,fontWeight:700,color:IT.ink}}>{f.t}</div>
              <div style={{fontSize:10,color:IT.muted,marginTop:2}}>{f.d}</div>
            </div>
          ))}
        </div>
        <div style={{display:"flex",gap:10,alignItems:"center",marginTop:10,padding:"10px",borderRadius:10,background:IT.accentLight}}>
          <div style={{width:36,height:36,borderRadius:18,background:IT.teal,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><span style={{color:"#fff",fontWeight:800,fontSize:13}}>KT</span></div>
          <div><div style={{fontSize:13,fontWeight:700}}>Kairali Trails</div><div style={{fontSize:11,color:IT.muted}}>+91 800 800 4016</div></div>
        </div>
      </div>
      <div style={{height:20}}/>

      {/* STICKY FOOTER */}
      <div className="it-noprint" style={{position:"fixed",bottom:0,left:0,right:0,zIndex:50,background:"#fff",borderTop:`1px solid ${IT.border}`,padding:"10px 16px",display:"flex",justifyContent:"space-between",alignItems:"center",maxWidth:480,margin:"0 auto",fontFamily:"'Inter',sans-serif"}}>
        <div>
          <div style={{fontSize:10,color:IT.muted,fontWeight:500,textTransform:"uppercase",letterSpacing:1}}>Total</div>
          <div style={{fontSize:20,fontWeight:800,color:IT.ink}}>{fmtINR(T.grand)}</div>
        </div>
        <button onClick={shareWA} style={{background:"#25D366",color:"#fff",border:"none",borderRadius:24,padding:"10px 18px",fontWeight:700,fontSize:14,display:"flex",alignItems:"center",gap:8,cursor:"pointer",fontFamily:"'Inter',sans-serif"}}>
          <Icon.WhatsApp size={18}/>Send via WhatsApp
        </button>
      </div>
      {/* LIGHTBOX — renders at root level, not clipped by any overflow:hidden */}
      {lightbox&&<HotelLightbox photos={lightbox.photos} startIndex={lightbox.idx} onClose={()=>setLightbox(null)}/>}
    </div>
  );
}

// ── ITINERARY DAY CARD ────────────────────────────────────────────────────────

// ── HOTEL PHOTO LIGHTBOX ──────────────────────────────────────────────────────
function HotelLightbox({photos, startIndex=0, onClose}){
  const [idx, setIdx] = useState(startIndex);
  const total = photos.length;
  function prev(e){e.stopPropagation();setIdx(i=>(i-1+total)%total);}
  function next(e){e.stopPropagation();setIdx(i=>(i+1)%total);}
  useEffect(()=>{
    function onKey(e){
      if(e.key==="ArrowLeft")setIdx(i=>(i-1+total)%total);
      if(e.key==="ArrowRight")setIdx(i=>(i+1)%total);
      if(e.key==="Escape")onClose();
    }
    window.addEventListener("keydown",onKey);
    return()=>window.removeEventListener("keydown",onKey);
  },[total]);
  return(
    <div onClick={onClose} style={{position:"fixed",inset:0,zIndex:9999,background:"rgba(0,0,0,0.92)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}>
      {/* Close */}
      <button onClick={onClose} style={{position:"absolute",top:16,right:16,background:"rgba(255,255,255,0.15)",border:"none",color:"#fff",width:38,height:38,borderRadius:19,fontSize:18,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",zIndex:10000}}>✕</button>
      {/* Counter */}
      <div style={{position:"absolute",top:18,left:"50%",transform:"translateX(-50%)",color:"rgba(255,255,255,0.7)",fontSize:13,fontFamily:"'Inter',sans-serif",fontWeight:600}}>{idx+1} / {total}</div>
      {/* Main image */}
      <div onClick={e=>e.stopPropagation()} style={{width:"100%",maxWidth:480,padding:"0 48px",position:"relative"}}>
        <img src={photos[idx]} alt="" style={{width:"100%",maxHeight:"70vh",objectFit:"contain",borderRadius:12,display:"block"}}/>
        {/* Prev arrow */}
        {total>1&&<button onClick={prev} style={{position:"absolute",left:4,top:"50%",transform:"translateY(-50%)",background:"rgba(255,255,255,0.18)",border:"none",color:"#fff",width:36,height:36,borderRadius:18,fontSize:18,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>‹</button>}
        {/* Next arrow */}
        {total>1&&<button onClick={next} style={{position:"absolute",right:4,top:"50%",transform:"translateY(-50%)",background:"rgba(255,255,255,0.18)",border:"none",color:"#fff",width:36,height:36,borderRadius:18,fontSize:18,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>›</button>}
      </div>
      {/* Dot indicators */}
      {total>1&&<div style={{display:"flex",gap:6,marginTop:16}}>
        {photos.map((_,i)=><div key={i} onClick={e=>{e.stopPropagation();setIdx(i);}} style={{width:i===idx?22:7,height:7,borderRadius:4,background:i===idx?"#fff":"rgba(255,255,255,0.35)",transition:"all 0.2s",cursor:"pointer"}}/>)}
      </div>}
      {/* Thumbnail strip */}
      {total>1&&<div style={{display:"flex",gap:6,marginTop:10,overflowX:"auto",maxWidth:480,padding:"4px 8px"}}>
        {photos.map((url,i)=>(
          <div key={i} onClick={e=>{e.stopPropagation();setIdx(i);}} style={{width:52,height:40,backgroundImage:`url(${url})`,backgroundSize:"cover",backgroundPosition:"center",borderRadius:6,flexShrink:0,cursor:"pointer",border:i===idx?"2px solid #fff":"2px solid transparent",opacity:i===idx?1:0.6,transition:"all 0.2s"}}/>
        ))}
      </div>}
    </div>
  );
}

function ItinDayCard({d,isOpen,onToggle,cardRef,onOpenLightbox}){
  return(
    <div ref={cardRef} style={{background:IT.card,borderRadius:12,marginBottom:8,border:`1px solid ${IT.border}`,overflow:"hidden",fontFamily:"'Inter',sans-serif"}}>
      {/* Header */}
      <div onClick={onToggle} style={{display:"flex",alignItems:"center",gap:10,padding:"12px 14px",cursor:"pointer",userSelect:"none"}}>
        <div style={{width:48,height:48,borderRadius:10,background:IT.orangeLight,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",flexShrink:0}}>
          <div style={{fontSize:8,fontWeight:700,color:IT.orange,textTransform:"uppercase",letterSpacing:1}}>Day</div>
          <div style={{fontSize:20,fontWeight:800,color:IT.orange,lineHeight:1}}>{String(d.day).padStart(2,"0")}</div>
        </div>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontSize:11,color:IT.muted,marginBottom:2,display:"flex",alignItems:"center",gap:6}}>
            {d.date}
            <span style={{display:"inline-flex",alignItems:"center",gap:3,color:IT.teal}}>
              <Icon.MapPin size={10} color={IT.teal}/>{d.location}
            </span>
          </div>
          <div style={{fontSize:13,fontWeight:700,color:IT.ink,lineHeight:1.3}}>{d.emoji} {d.title}</div>
        </div>
        <div className={`it-chevron ${isOpen?"open":""}`}><Icon.ChevronDown size={16} color={IT.muted}/></div>
      </div>

      {/* Expanded */}
      {isOpen&&(
        <div style={{borderTop:`1px solid ${IT.border}`,padding:"10px 12px",background:IT.cardAlt,fontFamily:"'Inter',sans-serif"}}>

          {/* TRANSFERS — Thrillophilia style */}
          {(d.transfers||[]).map((t,i)=>(
            <div key={i} style={{background:"#fff",borderRadius:10,padding:"10px 12px",marginBottom:8,border:`1px solid ${IT.border}`}}>
              <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:8}}>
                <Icon.Car size={13} color={IT.orange}/>
                <span style={{fontSize:11,color:IT.muted}}>Private Transfer:</span>
                <span style={{fontSize:12,fontWeight:700,color:IT.ink}}>{t.vehicle}</span>
              </div>
              {t.note&&<div style={{fontSize:11,color:IT.muted,marginBottom:8}}>{t.note}</div>}
              <div style={{marginBottom:6}}>
                <div style={{display:"inline-block",background:"#FFF3E0",color:IT.orange,fontSize:10,fontWeight:700,borderRadius:4,padding:"2px 6px",marginBottom:4}}>From</div>
                <div style={{display:"flex",alignItems:"center",gap:8,background:"#fff",border:`1px solid ${IT.border}`,borderRadius:8,padding:"7px 10px"}}>
                  <Icon.MapPin size={11} color={IT.muted}/><span style={{fontSize:13,color:IT.sub}}>{t.from||"—"}</span>
                </div>
              </div>
              <div style={{width:1,height:8,background:IT.border,margin:"0 0 6px 14px"}}/>
              <div>
                <div style={{display:"inline-block",background:"#E8F5E9",color:"#2E7D32",fontSize:10,fontWeight:700,borderRadius:4,padding:"2px 6px",marginBottom:4}}>To</div>
                <div style={{display:"flex",alignItems:"center",gap:8,background:"#fff",border:`1px solid ${IT.border}`,borderRadius:8,padding:"7px 10px"}}>
                  <Icon.MapPin size={11} color={IT.muted}/><span style={{fontSize:13,color:IT.sub}}>{t.to||"—"}</span>
                </div>
              </div>
            </div>
          ))}

          {/* BULLET NOTES */}
          {(d.bulletNotes||[]).length>0&&(
            <div style={{background:"#fff",borderRadius:10,padding:"10px 12px",marginBottom:8,border:`1px solid ${IT.border}`}}>
              <div style={{fontSize:10,fontWeight:700,color:IT.muted,textTransform:"uppercase",letterSpacing:1,marginBottom:8}}>Highlights</div>
              {(d.bulletNotes||[]).map((note,ni)=>(
                <div key={ni} style={{display:"flex",gap:8,marginBottom:ni<d.bulletNotes.length-1?6:0}}>
                  <div style={{width:6,height:6,borderRadius:3,background:IT.teal,flexShrink:0,marginTop:5}}/>
                  <div style={{fontSize:13,color:IT.sub,lineHeight:1.5}} dangerouslySetInnerHTML={{__html:note.replace(/\*\*(.*?)\*\*/g,'<strong>$1</strong>')}}/>
                </div>
              ))}
            </div>
          )}

          {/* ACTIVITY CARDS — white card, photo top, name below */}
          {(()=>{
            const acts=(d.activities||[]).filter(ac=>(ac.name||ac.title)&&(ac.name||ac.title).trim());
            if(acts.length===0) return null;
            return(
              <div style={{marginBottom:8}}>
                <div style={{fontSize:10,fontWeight:700,color:IT.muted,textTransform:"uppercase",letterSpacing:1,marginBottom:8}}>Activities</div>
                <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8}}>
                  {acts.map((ac,ai)=>(
                    <div key={ai} style={{background:"#fff",borderRadius:10,overflow:"hidden",border:`1px solid ${IT.border}`}}>
                      <div style={{width:"100%",aspectRatio:"1",overflow:"hidden",background:IT.cardAlt}}>
                        {ac.photo
                          ?<img src={ac.photo} alt={ac.name||ac.title} style={{width:"100%",height:"100%",objectFit:"cover"}}/>
                          :<div style={{width:"100%",height:"100%",display:"flex",alignItems:"center",justifyContent:"center",background:"#F0F4F8"}}>
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={IT.muted} strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                          </div>
                        }
                      </div>
                      <div style={{padding:"5px 6px 7px"}}>
                        <div style={{fontSize:10,fontWeight:600,color:IT.ink,textAlign:"center",lineHeight:1.3}}>{ac.name||ac.title}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}

          {/* STAY CARD — Thrillophilia style */}
          {d.stay&&(
            <div style={{background:"#fff",borderRadius:10,overflow:"hidden",marginBottom:8,border:`1px solid ${IT.border}`}}>
              {d.day===1&&d.stay.hotelPhotos&&d.stay.hotelPhotos.length>0?(
                <div>
                  <div style={{display:"flex",gap:4,overflowX:"auto",scrollSnapType:"x mandatory",padding:"4px"}}>
                    {d.stay.hotelPhotos.map((url,pi)=>(
                      <div key={pi} onClick={()=>onOpenLightbox&&onOpenLightbox(d.stay.hotelPhotos,pi)} style={{minWidth:"calc(100% - 8px)",height:160,backgroundImage:`url(${url})`,backgroundSize:"cover",backgroundPosition:"center",borderRadius:8,flexShrink:0,scrollSnapAlign:"start",cursor:"pointer",position:"relative"}}>
                        <div style={{position:"absolute",bottom:8,right:8,background:"rgba(0,0,0,0.5)",borderRadius:6,padding:"3px 7px",fontSize:10,color:"#fff",fontFamily:"'Inter',sans-serif"}}>🔍 Tap to expand</div>
                      </div>
                    ))}
                  </div>
                  {d.stay.hotelPhotos.length>1&&(
                    <div style={{display:"flex",gap:4,padding:"4px 8px",overflowX:"auto"}}>
                      {d.stay.hotelPhotos.map((url,pi)=>(
                        <div key={pi} onClick={()=>onOpenLightbox&&onOpenLightbox(d.stay.hotelPhotos,pi)} style={{width:52,height:38,backgroundImage:`url(${url})`,backgroundSize:"cover",backgroundPosition:"center",borderRadius:5,flexShrink:0,border:"2px solid rgba(4,150,165,0.2)",cursor:"pointer"}}/>
                      ))}
                    </div>
                  )}
                </div>
              ):d.stay.photo&&<div style={{height:100,backgroundImage:`url(${d.stay.photo})`,backgroundSize:"cover",backgroundPosition:"center"}}/>}
              <div style={{padding:"10px 12px"}}>
                <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:4}}>
                  <Icon.Bed size={13} color={IT.muted}/><span style={{fontSize:10,color:IT.muted}}>Stay At:</span>
                </div>
                <div style={{fontSize:13,fontWeight:700,color:IT.ink,marginBottom:4}}>Check-In At {d.stay.name}</div>
                <div style={{fontSize:11,color:IT.muted,marginBottom:8}}>Starts At: {d.stay.checkInTime} | Duration: {d.stay.nights} Night{d.stay.nights>1?"s":""}</div>
                <div style={{display:"flex",gap:0,borderRadius:8,overflow:"hidden",border:`1px solid ${IT.border}`}}>
                  <div style={{flex:1,padding:"7px",textAlign:"center",background:d.stay.breakfast?"#F0FDF4":"#fafafa"}}>
                    <div style={{fontSize:13,marginBottom:1}}>🍳</div>
                    <div style={{fontSize:10,fontWeight:600,color:d.stay.breakfast?IT.green:IT.muted}}>Breakfast {d.stay.breakfast?"✓":"✗"}</div>
                  </div>
                  <div style={{flex:1,padding:"7px",textAlign:"center",background:"#fafafa",borderLeft:`1px solid ${IT.border}`}}>
                    <div style={{fontSize:13,marginBottom:1}}>🍱</div>
                    <div style={{fontSize:10,fontWeight:500,color:IT.muted}}>Lunch ✗</div>
                  </div>
                  <div style={{flex:1,padding:"7px",textAlign:"center",background:"#fafafa",borderLeft:`1px solid ${IT.border}`}}>
                    <div style={{fontSize:13,marginBottom:1}}>🌙</div>
                    <div style={{fontSize:10,fontWeight:500,color:IT.muted}}>Dinner ✗</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* PHOTOS */}
          {(d.photos||[]).length>0&&(
            <div style={{marginBottom:8}}>
              <div style={{fontSize:10,fontWeight:700,color:IT.muted,textTransform:"uppercase",letterSpacing:1,marginBottom:6}}>Photos</div>
              <div style={{display:"flex",gap:6,overflowX:"auto",paddingBottom:4}}>
                {(d.photos||[]).map((p,pi)=><div key={pi} style={{width:90,height:68,borderRadius:8,overflow:"hidden",flexShrink:0,background:IT.cardAlt}}><img src={p.url} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/></div>)}
              </div>
            </div>
          )}

          {/* TEXT BLOCKS */}
          {(d.textBlocks||[]).filter(tb=>tb.text).map((tb,ti)=>(
            <div key={ti} style={{padding:"8px 10px",borderRadius:8,background:"#fff",fontSize:12,color:IT.sub,lineHeight:1.6,marginBottom:6,border:`1px solid ${IT.border}`}}>{tb.text}</div>
          ))}

          {/* LEISURE */}
          {d.leisure&&<div style={{padding:"8px 10px",borderRadius:8,background:"linear-gradient(135deg,#E8F7F9,#F0FDF4)",fontSize:12,color:IT.teal,fontWeight:500}}>🌿 {d.leisure}</div>}
        </div>
      )}
    </div>
  );
}

// ── SALES PANEL ───────────────────────────────────────────────────────────────
function SalesPanel({user,data,fxRates,fxError,onLogout}){
  const [screen,setScreen]=useState("country");
  const [cId,setCId]=useState("");
  const [pkgId,setPkgId]=useState("");
  const [selFlight,setSelFlight]=useState(null);
  const [flightExtraLabel,setFlightExtraLabel]=useState("");
  const [flightExtraAmt,setFlightExtraAmt]=useState(0);
  const [selHotel,setSelHotel]=useState(null);
  const [extraHotelStays,setExtraHotelStays]=useState([]);
  const [activeTransfers,setActiveTransfers]=useState([]);
  const [activeIncActs,setActiveIncActs]=useState([]);
  const [addonQtys,setAddonQtys]=useState({});
  const [selAddons,setSelAddons]=useState([]);
  const [pax,setPax]=useState({adult:2,child_5_11:0,child_2_4:0,infant:0});
  const [clientName,setClientName]=useState("");
  const [selDiscount,setSelDiscount]=useState("");
  const [refInput,setRefInput]=useState("");
  const [appliedRef,setAppliedRef]=useState(null);
  const [refError,setRefError]=useState("");
  const [complimentary,setComplimentary]=useState("");
  const [arrivalDate,setArrivalDate]=useState("");
  const activePkgs=data.packages.filter(p=>p.isActive&&p.countryId===cId);
  const pkg=data.packages.find(p=>p.id===pkgId);
  const country=data.countries.find(c=>c.id===cId);
  const defHotel=pkg?.hotels?.find(h=>h.isDefault);
  const curHotel=pkg?.hotels?.find(h=>h.id===selHotel);
  const defFlight=pkg?.flights?.find(f=>f.isDefault);
  const curFlight=pkg?.flights?.find(f=>f.id===selFlight);
  const chosenDiscount=(data.discounts||[]).find(d=>d.id===selDiscount);

  function initPkg(p){
    setSelHotel(p.hotels?.find(h=>h.isDefault)?.id||null);
    setSelFlight(p.flights?.find(f=>f.isDefault)?.id||null);
    setActiveTransfers((p.transfers||[]).filter(t=>t.isDefault).map(t=>t.id));
    setActiveIncActs((p.includedActivities||[]).map(a=>a.id));
    setAddonQtys({});setSelAddons([]);setSelDiscount("");setAppliedRef(null);setRefInput("");setExtraHotelStays([]);
  }
  function applyRef(){
    const code=refInput.trim().toUpperCase();
    const found=(data.referralCodes||[]).find(r=>r.code===code&&r.active);
    if(found){setAppliedRef(found);setRefError("");}else{setRefError("Invalid or inactive referral code.");setAppliedRef(null);}
  }
  function addExtraStay(){setExtraHotelStays(s=>[...s,{id:"es"+uid(),hotelId:pkg?.hotels?.[0]?.id||"",nights:1}]);}
  function updStay(id,field,val){setExtraHotelStays(s=>s.map(x=>x.id===id?{...x,[field]:field==="nights"?Number(val):val}:x));}
  function remStay(id){setExtraHotelStays(s=>s.filter(x=>x.id!==id));}

  const nights=pkg?.nights||4;
  const extraNightsTotal=extraHotelStays.reduce((s,x)=>s+(x.nights||0),0);
  const totalNights=nights+extraNightsTotal;
  const totalDays=totalNights+1;
  const dynDuration=`${totalDays} Days / ${totalNights} Nights`;
  const adults=pax.adult;const kids=pax.child_5_11+pax.child_2_4;
  const payingPax=adults+kids;
  const totalPax=PAX_KEYS.reduce((s,k)=>s+pax[k],0);

  function calcTotal(){
    if(!pkg)return{base:0,flightAdj:0,hotelAdj:0,extraStayCost:0,transferAdj:0,actAdj:0,addonTotal:0,flightExtraTotal:0,subtotal:0,discountAmt:0,refAmt:0,totalDiscount:0,afterDisc:0,gst:0,tcs:0,grand:0};
    const base=PAX_KEYS.reduce((s,k)=>s+pax[k]*(pkg.basePrices[k]||0),0);
    const flightExtraTotal=flightExtraAmt||0;
    let flightAdj=0;
    const defFC=defFlight?.costPerPaxINR||0;
    if(selFlight===null){flightAdj=-(defFC*totalPax);}
    else if(selFlight&&selFlight!==defFlight?.id){flightAdj=((curFlight?.costPerPaxINR||0)-defFC)*totalPax;}
    let hotelAdj=0;
    const defHS=defHotel?sp(defHotel.costPerNightINR,defHotel.markup,defHotel.markupType):0;
    if(selHotel===null){hotelAdj=-(defHS*nights);}
    else if(selHotel!==defHotel?.id){const curHS=curHotel?sp(curHotel.costPerNightINR,curHotel.markup,curHotel.markupType):0;hotelAdj=(curHS-defHS)*nights;}
    let extraStayCost=0;
    extraHotelStays.forEach(stay=>{const h=pkg.hotels?.find(x=>x.id===stay.hotelId);if(h&&stay.nights>0){const hSell=h.isDynamic&&!h.costPerNightINR?0:sp(h.costPerNightINR,h.markup,h.markupType);extraStayCost+=hSell*stay.nights;}});
    let transferAdj=0;
    (pkg.transfers||[]).forEach(t=>{if(!t.isDefault&&activeTransfers.includes(t.id)){const pp=Math.ceil(totalPax/(t.maxPax||8));transferAdj+=t.costPerVanINR*pp;}});
    let actAdj=0;
    (pkg.includedActivities||[]).forEach(a=>{if(!activeIncActs.includes(a.id)){actAdj-=(a.costPerPaxINR*adults)+((a.kidCostPerPaxINR||a.costPerPaxINR)*kids);}});
    let addonTotal=0;
    (pkg.addons||[]).forEach(a=>{const adultSell=sp(a.costINR,a.markup,a.markupType);const kidSell=a.hasKidPrice?sp(a.kidCostINR||0,a.markup,a.markupType):adultSell;if(a.hasQty){const qty=addonQtys[a.id]||0;addonTotal+=adultSell*qty;}else if(selAddons.includes(a.id)){addonTotal+=adultSell*adults+kidSell*kids;}});
    const subtotal=Math.max(0,base+flightAdj+hotelAdj+extraStayCost+transferAdj+actAdj+addonTotal+flightExtraTotal);
    let discountAmt=0;
    if(chosenDiscount){discountAmt=chosenDiscount.type==="percent"?Math.round(subtotal*chosenDiscount.value/100):chosenDiscount.value;}
    let refAmt=0;
    if(appliedRef){const ad=subtotal-discountAmt;refAmt=appliedRef.type==="percent"?Math.round(ad*appliedRef.value/100):appliedRef.value;}
    const totalDiscount=discountAmt+refAmt;
    const afterDisc=subtotal-totalDiscount;
    const gst=Math.round(afterDisc*0.05);
    const tcs=Math.round(afterDisc*0.02);
    const grand=afterDisc+gst+tcs;
    return{base,flightAdj,hotelAdj,extraStayCost,transferAdj,actAdj,addonTotal,flightExtraTotal,subtotal,discountAmt,refAmt,totalDiscount,afterDisc,gst,tcs,grand};
  }
  const T=calcTotal();

  function reset(){setScreen("country");setCId("");setPkgId("");setPax({adult:2,child_5_11:0,child_2_4:0,infant:0});setClientName("");setSelDiscount("");setAppliedRef(null);setRefInput("");setComplimentary("");setArrivalDate("");}

  if(screen==="itinerary") return(
    <ItineraryPage quote={{pkg,pax,selFlight,selHotel,extraHotelStays,activeIncActs,selAddons,addonQtys,activeTransfers,T,clientName,arrivalDate,defFlight,curFlight,defHotel,curHotel,appliedRef,chosenDiscount,dynDuration,flightExtraAmt,flightExtraLabel}} onBack={()=>setScreen("build")}/>
  );

  if(screen==="build") return(
    <Shell user={user} onLogout={onLogout} fxRates={fxRates} rateError={fxError} subtitle={`${country?.flag} ${pkg?.name}`} onBack={()=>setScreen("package")}>
      <Inp label="CLIENT NAME" value={clientName} onChange={e=>setClientName(e.target.value)} placeholder="e.g. Rahul Sharma"/>
      <RangePicker arrivalDate={arrivalDate} setArrivalDate={setArrivalDate} totalNights={nights+extraHotelStays.reduce((s,x)=>s+x.nights,0)}/>

      {/* FLIGHT */}
      <Card accent={B.blue}><SL color={B.blue}>✈ FLIGHT</SL>
        <div onClick={()=>setSelFlight(null)} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 12px",borderRadius:10,background:selFlight===null?B.orangeLight:B.offWhite,marginBottom:6,cursor:"pointer"}}>
          <span style={{fontSize:13,fontWeight:600,color:selFlight===null?B.orange:B.textMid}}>No Flight (Own Arrangement)</span>
          {selFlight===null&&<span style={{fontSize:11,color:B.orange,fontWeight:700}}>Selected ✓</span>}
        </div>
        {(pkg?.flights||[]).map(f=>{const sel=selFlight===f.id;return <div key={f.id} onClick={()=>setSelFlight(f.id)} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 12px",borderRadius:10,background:sel?B.tealLight:B.offWhite,marginBottom:6,cursor:"pointer",border:`1.5px solid ${sel?B.teal:"transparent"}`}}><div><div style={{fontSize:13,fontWeight:700,color:sel?B.teal:B.text}}>{f.name}{f.isDefault&&<DefBadge/>}</div><div style={{fontSize:11,color:B.textLight}}>{f.airline} · {fmtINR(f.costPerPaxINR)}/pax</div></div>{sel&&<span style={{fontSize:11,color:B.teal,fontWeight:700}}>✓</span>}</div>;})}</Card>

      {/* FLIGHT EXTRA */}
      <div style={{background:B.blueLight,border:`1.5px solid ${B.border}`,borderRadius:13,padding:"10px 12px",marginBottom:10}}>
        <div style={{fontSize:11,color:B.blue,fontWeight:700,letterSpacing:1,marginBottom:8}}>✈ EXTRA FLIGHT CHARGE (OPTIONAL)</div>
        <div style={{display:"flex",gap:8}}>
          <input value={flightExtraLabel} onChange={e=>setFlightExtraLabel(e.target.value)} placeholder="Label (e.g. Upgrade)" style={{flex:2,background:B.white,border:`1px solid ${B.border}`,borderRadius:9,padding:"9px 11px",fontSize:12,outline:"none",fontFamily:"'Poppins',sans-serif"}}/>
          <input type="number" value={flightExtraAmt||""} onChange={e=>setFlightExtraAmt(Number(e.target.value))} placeholder="₹ Amount" style={{flex:1,background:B.white,border:`1px solid ${B.border}`,borderRadius:9,padding:"9px 11px",fontSize:12,outline:"none",fontFamily:"'Poppins',sans-serif"}}/>
        </div>
        {flightExtraAmt>0&&<div style={{fontSize:11,color:B.blue,fontWeight:600,marginTop:6}}>+ {fmtINR(flightExtraAmt)} will be added</div>}
      </div>

      {/* HOTEL */}
      <Card accent={STAR_COLOR[curHotel?.star||3]}><SL>🏨 HOTEL (Room Basis)</SL>
        <div style={{fontSize:11,color:B.textLight,marginBottom:10}}>1 room shared. Add extra stays below.</div>
        <div onClick={()=>setSelHotel(null)} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 12px",borderRadius:10,background:selHotel===null?B.orangeLight:B.offWhite,marginBottom:6,cursor:"pointer"}}>
          <span style={{fontSize:13,fontWeight:600,color:selHotel===null?B.orange:B.textMid}}>No Hotel (Own Arrangement)</span>
          {selHotel===null&&<span style={{fontSize:11,color:B.orange,fontWeight:700}}>Selected ✓</span>}
        </div>
        {(pkg?.hotels||[]).map(h=>{const sel=selHotel===h.id;const sell=h.isDynamic&&!h.costPerNightINR?null:sp(h.costPerNightINR,h.markup,h.markupType);return <div key={h.id} onClick={()=>setSelHotel(h.id)} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 12px",borderRadius:10,background:sel?B.tealLight:B.offWhite,marginBottom:6,cursor:"pointer",border:`1.5px solid ${sel?B.teal:"transparent"}`}}><div><div style={{fontSize:13,fontWeight:700,color:sel?B.teal:B.text}}>{h.name}{h.isDefault&&<DefBadge/>}</div><div style={{fontSize:11,color:STAR_COLOR[h.star]}}>{STAR_LABEL[h.star]}{sell?` · ${fmtINR(sell)}/night`:""}{h.isDynamic?" · Daily Rate":""}</div></div>{sel&&<span style={{fontSize:11,color:B.teal,fontWeight:700}}>✓</span>}</div>;})}
        {extraHotelStays.length>0&&<div style={{borderTop:`1px solid ${B.border}`,marginTop:10,paddingTop:10}}>
          <div style={{fontSize:10,color:B.orange,fontWeight:700,letterSpacing:1,marginBottom:8}}>EXTRA HOTEL STAYS</div>
          {extraHotelStays.map((stay,si)=>{
            const h=pkg?.hotels?.find(x=>x.id===stay.hotelId);
            const sell=h&&!(h.isDynamic&&!h.costPerNightINR)?sp(h.costPerNightINR,h.markup,h.markupType):null;
            return <div key={stay.id} style={{background:B.offWhite,borderRadius:12,padding:"10px 12px",marginBottom:8}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}><div style={{fontSize:12,fontWeight:700,color:B.teal}}>Extra Stay #{si+1}</div><DBtn onClick={()=>remStay(stay.id)}>Remove</DBtn></div>
              <Sel label="HOTEL" value={stay.hotelId} onChange={e=>updStay(stay.id,"hotelId",e.target.value)}>{(pkg?.hotels||[]).map(h=><option key={h.id} value={h.id}>{h.name} ({STAR_LABEL[h.star]})</option>)}</Sel>
              <div style={{display:"flex",alignItems:"center",gap:10}}>
                <span style={{fontSize:12,color:B.textMid,fontWeight:600,flexShrink:0}}>Nights:</span>
                <Counter value={stay.nights} onDec={()=>updStay(stay.id,"nights",stay.nights-1)} onInc={()=>updStay(stay.id,"nights",stay.nights+1)} min={1}/>
                {sell>0&&<span style={{fontSize:11,color:B.teal,fontWeight:700}}>{fmtINR(sell*stay.nights)}</span>}
              </div>
            </div>;
          })}
        </div>}
        <SBtn onClick={addExtraStay} style={{width:"100%",marginTop:8}}>+ Add Extra Hotel Stay</SBtn>
      </Card>

      {/* TRANSFERS */}
      <Card accent={B.orange}><SL color={B.orange}>🚌 TRANSFERS</SL>
        <div style={{fontSize:11,color:B.textLight,marginBottom:8}}>Default transfers included. Toggle to add/remove.</div>
        {(pkg?.transfers||[]).map(t=>{const active=activeTransfers.includes(t.id);const pp=Math.ceil(totalPax/(t.maxPax||8));return <div key={t.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 12px",borderRadius:10,background:active?B.tealLight:B.offWhite,marginBottom:6,cursor:"pointer"}} onClick={()=>setActiveTransfers(x=>active?x.filter(id=>id!==t.id):[...x,t.id])}>
          <div style={{flex:1,marginRight:8}}><div style={{fontSize:12,fontWeight:600,color:active?B.teal:B.textMid}}>{t.name}</div><div style={{fontSize:10,color:B.textLight}}>{fmtINR(t.costPerVanINR)}/van · {pp} van{pp>1?"s":""} · {t.isDefault?"Default":"Optional"}</div></div>
          <span style={{fontSize:11,color:active?B.teal:B.textLight,fontWeight:700}}>{active?"Included ✓":"Excluded"}</span>
        </div>;})}
        {(pkg?.transfers||[]).length===0&&<div style={{fontSize:12,color:B.textLight,textAlign:"center",padding:12}}>No transfers configured.</div>}
      </Card>

      {/* INCLUDED ACTIVITIES */}
      <Card accent={B.teal}><SL>🎯 INCLUDED ACTIVITIES</SL>
        {(pkg?.includedActivities||[]).map(a=>{const active=activeIncActs.includes(a.id);return <div key={a.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 12px",borderRadius:10,background:active?B.tealLight:B.offWhite,marginBottom:6,cursor:"pointer"}} onClick={()=>setActiveIncActs(x=>active?x.filter(id=>id!==a.id):[...x,a.id])}>
          <div><div style={{fontSize:12,fontWeight:600,color:active?B.teal:B.orange}}>{active?"✓ ":""}{a.name}</div><div style={{fontSize:10,color:B.textLight}}>Adult: {fmtINR(a.costPerPaxINR)} · Child: {fmtINR(a.kidCostPerPaxINR||0)}</div></div>
          <span style={{fontSize:11,color:active?B.teal:B.orange,fontWeight:700}}>{active?"Included":"Excluded"}</span>
        </div>;})}
      </Card>

      {/* ADD-ONS */}
      <Card accent={B.mint}>
        <SL color={B.tealDark}>🎪 ADD-ON ACTIVITIES</SL>
        {(()=>{
          const FREE_ADDONS=["yona","scuba"];
          const isFree=a=>FREE_ADDONS.some(k=>a.name.toLowerCase().includes(k));
          const extraNights=extraHotelStays.reduce((s,x)=>s+x.nights,0);
          const usedSlots=(pkg?.addons||[]).filter(a=>!isFree(a)&&!a.hasQty&&selAddons.includes(a.id)).length;
          const availableSlots=extraNights;const remaining=availableSlots-usedSlots;
          return(<>
            <div style={{background:remaining>0?B.tealLight:remaining===0&&availableSlots>0?"#fff8ee":B.offWhite,borderRadius:10,padding:"10px 12px",marginBottom:10,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div>
                <div style={{fontSize:12,fontWeight:700,color:remaining>0?B.teal:remaining===0&&availableSlots>0?B.orange:B.textLight}}>{availableSlots===0?"Add extra hotel nights to unlock add-ons":`${availableSlots} slot${availableSlots!==1?"s":""} available`}</div>
                {availableSlots>0&&<div style={{fontSize:11,color:B.textLight,marginTop:2}}>{usedSlots} used · {remaining} remaining</div>}
              </div>
              <div style={{fontSize:20}}>{availableSlots===0?"🔒":remaining>0?"🟢":"🟡"}</div>
            </div>
            <div style={{fontSize:10,color:B.textLight,marginBottom:8,fontStyle:"italic"}}>Free add-ons (Yona, Scuba) don't use slots</div>
            {(pkg?.addons||[]).length===0&&<div style={{fontSize:12,color:B.textLight,textAlign:"center",padding:12}}>No add-ons configured.</div>}
            {(pkg?.addons||[]).map(a=>{
              const adultSell=sp(a.costINR,a.markup,a.markupType);const kidSell=a.hasKidPrice?sp(a.kidCostINR||0,a.markup,a.markupType):adultSell;
              const free=isFree(a);
              if(a.hasQty){
                const qty=addonQtys[a.id]||0;
                return <div key={a.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 12px",background:qty>0?B.tealLight:B.offWhite,borderRadius:10,marginBottom:6}}>
                  <div><div style={{fontSize:13,fontWeight:600,color:qty>0?B.teal:B.text}}>{a.name}</div><div style={{fontSize:11,color:B.textLight}}>{fmtINR(adultSell)}/ticket</div></div>
                  <Counter value={qty} onDec={()=>setAddonQtys(q=>({...q,[a.id]:Math.max(0,(q[a.id]||0)-1)}))} onInc={()=>setAddonQtys(q=>({...q,[a.id]:(q[a.id]||0)+1}))}/>
                </div>;
              }
              const on=selAddons.includes(a.id);const blocked=!free&&!on&&remaining<=0;
              return <div key={a.id} onClick={()=>{if(blocked)return;setSelAddons(x=>on?x.filter(id=>id!==a.id):[...x,a.id]);}} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 12px",background:on?B.tealLight:B.offWhite,borderRadius:10,marginBottom:6,cursor:blocked?"not-allowed":"pointer",opacity:blocked?0.5:1}}>
                <div style={{display:"flex",alignItems:"center",gap:9}}>
                  <div style={{width:19,height:19,borderRadius:5,border:`2px solid ${on?B.teal:B.border}`,background:on?B.teal:"transparent",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                    {on&&<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>}
                  </div>
                  <div>
                    <div style={{fontSize:13,fontWeight:600,color:on?B.teal:B.text}}>{a.name} {free&&<span style={{fontSize:10,background:B.mint+"33",color:B.tealDark,padding:"1px 6px",borderRadius:9,fontWeight:700}}>FREE</span>}</div>
                    <div style={{fontSize:11,color:B.textLight}}>{a.hasKidPrice?`Adult: ${fmtINR(adultSell)} · Child: ${fmtINR(kidSell)}`:fmtINR(adultSell)}</div>
                    {blocked&&<div style={{fontSize:10,color:B.orange,fontWeight:600}}>Add 1 extra hotel night to unlock</div>}
                  </div>
                </div>
                {!blocked&&<span style={{color:on?B.teal:B.textLight,fontSize:13,fontWeight:700}}>{on?"✓":""}</span>}
              </div>;
            })}
          </>);
        })()}
      </Card>

      {/* TRAVELLERS */}
      <Card accent={B.blue}><SL color={B.blue}>👥 TRAVELLERS</SL>
        {PAX_KEYS.map(k=>(
          <div key={k} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 0",borderBottom:`1px solid ${B.border}`}}>
            <div><div style={{fontSize:14,fontWeight:600}}>{PAX_ICONS[k]} {PAX_LABELS[k]}</div><div style={{fontSize:11,color:B.textLight}}>{fmtINR(pkg?.basePrices[k]||0)}/person</div></div>
            <Counter value={pax[k]} onDec={()=>setPax(p=>({...p,[k]:Math.max(0,p[k]-1)}))} onInc={()=>setPax(p=>({...p,[k]:p[k]+1}))}/>
          </div>
        ))}
      </Card>

      {/* DISCOUNT & REFERRAL */}
      <Card accent={B.orange}><SL color={B.orange}>🏷 DISCOUNT & REFERRAL</SL>
        <Sel label="APPLY DISCOUNT" value={selDiscount} onChange={e=>setSelDiscount(e.target.value)}>
          <option value="">— No Discount —</option>
          {(data.discounts||[]).map(d=><option key={d.id} value={d.id}>{d.name} ({d.type==="percent"?`${d.value}%`:`₹${d.value}`} off)</option>)}
        </Sel>
        {T.discountAmt>0&&<div style={{fontSize:12,color:B.teal,fontWeight:700,marginBottom:10}}>Discount: −{fmtINR(T.discountAmt)}</div>}
        <div style={{marginBottom:8}}><div style={{fontSize:10,color:B.textLight,letterSpacing:2,fontWeight:700,marginBottom:6}}>REFERRAL CODE</div>
          <div style={{display:"flex",gap:7}}>
            <input value={refInput} onChange={e=>{setRefInput(e.target.value.toUpperCase());setRefError("");}} placeholder="Enter code" style={{flex:1,background:B.offWhite,border:`1.5px solid ${B.border}`,borderRadius:11,color:B.text,padding:"10px 12px",fontSize:13,outline:"none",fontFamily:"'Poppins',sans-serif"}}/>
            <button onClick={applyRef} style={{background:`linear-gradient(135deg,${B.mint},${B.cyan})`,border:"none",color:B.tealDark,padding:"10px 16px",borderRadius:11,fontSize:13,fontWeight:700,cursor:"pointer"}}>Apply</button>
          </div>
          {appliedRef&&<div style={{fontSize:12,color:B.teal,fontWeight:700,marginTop:6}}>✓ {appliedRef.code}: −{fmtINR(T.refAmt)}</div>}
          {refError&&<div style={{fontSize:12,color:B.orange,fontWeight:600,marginTop:6}}>{refError}</div>}
        </div>
        {T.totalDiscount>0&&<div style={{fontSize:13,color:B.teal,fontWeight:800,padding:"8px 12px",background:B.tealLight,borderRadius:10,marginBottom:8}}>Total savings: −{fmtINR(T.totalDiscount)}</div>}
        <Inp label="COMPLIMENTARY" value={complimentary} onChange={e=>setComplimentary(e.target.value)} placeholder="e.g. Free airport pickup"/>
      </Card>

      {/* LIVE TOTAL */}
      <div style={{background:`linear-gradient(135deg,${B.teal}08,${B.blue}08)`,border:`2px solid ${B.teal}22`,borderRadius:16,padding:"14px",marginBottom:10}}>
        <SL>LIVE TOTAL (INR)</SL>
        <div style={{fontSize:13,display:"flex",flexDirection:"column",gap:7}}>
          <div style={{display:"flex",justifyContent:"space-between"}}><span style={{color:B.textMid}}>Base Package</span><span style={{fontWeight:700}}>{fmtINR(T.base)}</span></div>
          {T.flightAdj!==0&&<div style={{display:"flex",justifyContent:"space-between"}}><span style={{color:B.textMid}}>Flight Adj.</span><span style={{fontWeight:700,color:T.flightAdj<0?B.orange:B.text}}>{T.flightAdj>=0?"+":""}{fmtINR(T.flightAdj)}</span></div>}
          {T.hotelAdj!==0&&<div style={{display:"flex",justifyContent:"space-between"}}><span style={{color:B.textMid}}>Hotel Adj.</span><span style={{fontWeight:700}}>{T.hotelAdj>=0?"+":""}{fmtINR(T.hotelAdj)}</span></div>}
          {T.extraStayCost>0&&<div style={{display:"flex",justifyContent:"space-between"}}><span style={{color:B.textMid}}>Extra Stays</span><span style={{fontWeight:700}}>+{fmtINR(T.extraStayCost)}</span></div>}
          {T.transferAdj!==0&&<div style={{display:"flex",justifyContent:"space-between"}}><span style={{color:B.textMid}}>Transfers</span><span style={{fontWeight:700}}>{T.transferAdj>=0?"+":""}{fmtINR(T.transferAdj)}</span></div>}
          {T.actAdj!==0&&<div style={{display:"flex",justifyContent:"space-between"}}><span style={{color:B.textMid}}>Activities Adj.</span><span style={{fontWeight:700,color:B.orange}}>{fmtINR(T.actAdj)}</span></div>}
          {T.addonTotal>0&&<div style={{display:"flex",justifyContent:"space-between"}}><span style={{color:B.textMid}}>Add-ons</span><span style={{fontWeight:700}}>+{fmtINR(T.addonTotal)}</span></div>}
          {T.flightExtraTotal>0&&<div style={{display:"flex",justifyContent:"space-between"}}><span style={{color:B.textMid}}>Flight Extra</span><span style={{fontWeight:700}}>+{fmtINR(T.flightExtraTotal)}</span></div>}
          {T.discountAmt>0&&<div style={{display:"flex",justifyContent:"space-between"}}><span style={{color:B.teal}}>Discount</span><span style={{fontWeight:700,color:B.teal}}>−{fmtINR(T.discountAmt)}</span></div>}
          {T.refAmt>0&&<div style={{display:"flex",justifyContent:"space-between"}}><span style={{color:B.teal}}>Referral</span><span style={{fontWeight:700,color:B.teal}}>−{fmtINR(T.refAmt)}</span></div>}
          <div style={{borderTop:`1px solid ${B.border}`,paddingTop:6,display:"flex",justifyContent:"space-between"}}><span style={{color:B.textMid}}>Subtotal</span><span style={{fontWeight:700}}>{fmtINR(T.afterDisc)}</span></div>
          <div style={{display:"flex",justifyContent:"space-between"}}><span style={{color:B.textMid}}>GST (5%) + TCS (2%)</span><span style={{fontWeight:700}}>{fmtINR(T.gst+T.tcs)}</span></div>
          <div style={{borderTop:`2px solid ${B.teal}22`,paddingTop:9,display:"flex",justifyContent:"space-between"}}>
            <span style={{color:B.teal,fontWeight:800,fontSize:14}}>GRAND TOTAL</span>
            <span style={{color:B.teal,fontSize:20,fontWeight:800}}>{fmtINR(T.grand)}</span>
          </div>
          {totalPax>0&&<div style={{textAlign:"center",fontSize:11,color:B.textLight}}>{fmtINR(Math.round(T.grand/totalPax))} per person</div>}
        </div>
      </div>
      <div style={{display:"flex",gap:8,marginTop:10}}>
        <button onClick={()=>setScreen("itinerary")} style={{flex:1,background:`linear-gradient(135deg,${B.teal},${B.blue})`,color:"#fff",border:"none",padding:"14px",borderRadius:13,fontSize:14,fontWeight:700,cursor:"pointer"}}>📋 View Itinerary</button>
        <button onClick={()=>window.print()} style={{background:B.tealLight,color:B.teal,border:`1.5px solid ${B.border}`,padding:"14px 18px",borderRadius:13,fontSize:13,fontWeight:600,cursor:"pointer"}}>🖨</button>
      </div>
    </Shell>
  );

  if(screen==="package") return(
    <Shell user={user} onLogout={onLogout} fxRates={fxRates} rateError={fxError} subtitle={`${country?.flag} ${country?.name}`} onBack={()=>setScreen("country")}>
      <PT sub="Choose a package to customise">Select Package</PT>
      {activePkgs.length===0&&<Card><div style={{textAlign:"center",color:B.textLight,padding:20,fontSize:13}}>No active packages for this destination.</div></Card>}
      {activePkgs.map(p=>(
        <div key={p.id} onClick={()=>{setPkgId(p.id);initPkg(p);setScreen("build");}} style={{background:B.white,border:`2px solid ${B.border}`,borderRadius:16,padding:"14px",marginBottom:10,cursor:"pointer"}}>
          <div style={{fontSize:14,fontWeight:800,color:B.teal,marginBottom:3}}>{p.name}</div>
          <div style={{fontSize:12,color:B.textLight,marginBottom:10}}>{p.route} · {p.duration}</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:7,marginBottom:8}}>
            {PAX_KEYS.filter(k=>p.basePrices[k]>0).map(k=><div key={k} style={{background:B.tealLight,borderRadius:10,padding:"7px 10px"}}><div style={{fontSize:9,color:B.teal,fontWeight:700}}>{PAX_LABELS[k].toUpperCase()}</div><div style={{fontSize:14,fontWeight:800,color:B.teal}}>{fmtINR(p.basePrices[k])}</div></div>)}
          </div>
          <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
            <Tag color={B.blue}>{p.flights?.length||0} flights</Tag>
            <Tag color={B.teal}>{p.hotels?.length||0} hotels</Tag>
            <Tag color={B.orange}>{p.transfers?.length||0} transfers</Tag>
            <Tag color={B.mint}>{p.addons?.length||0} add-ons</Tag>
          </div>
        </div>
      ))}
    </Shell>
  );

  return(
    <Shell user={user} onLogout={onLogout} fxRates={fxRates} rateError={fxError} subtitle="Custom Quote">
      <div style={{background:`linear-gradient(135deg,${B.teal},${B.blue})`,borderRadius:18,padding:"20px 18px",marginBottom:16,position:"relative",overflow:"hidden"}}>
        <div style={{position:"absolute",top:-18,right:-18,width:65,height:65,borderRadius:"50%",background:"rgba(255,255,255,0.12)"}}/>
        <div style={{fontSize:9,color:B.mint,letterSpacing:3,fontWeight:700,marginBottom:4}}>KAIRALI TRAILS</div>
        <div style={{fontWeight:800,fontSize:19,color:"#fff",marginBottom:2}}>Build a Quote</div>
        <div style={{fontSize:12,color:"rgba(255,255,255,0.7)"}}>Select destination to get started</div>
      </div>
      <SL>CHOOSE DESTINATION</SL>
      {data.countries.map(c=>{const cnt=data.packages.filter(p=>p.countryId===c.id&&p.isActive).length;return <div key={c.id} onClick={()=>{setCId(c.id);setScreen("package");}} style={{background:B.white,border:`2px solid ${B.border}`,borderRadius:14,padding:"14px 16px",marginBottom:9,cursor:"pointer",display:"flex",alignItems:"center",gap:12}}>
        <span style={{fontSize:36}}>{c.flag}</span>
        <div style={{flex:1}}><div style={{fontSize:15,fontWeight:800,color:B.text,marginBottom:2}}>{c.name}</div><div style={{fontSize:11,color:B.textLight}}>{cnt} package{cnt!==1?"s":""} available</div></div>
        <div style={{width:32,height:32,borderRadius:"50%",background:B.tealLight,display:"flex",alignItems:"center",justifyContent:"center"}}><span style={{color:B.teal,fontSize:14}}>›</span></div>
      </div>;})}
    </Shell>
  );
}

// ── RANGE PICKER ──────────────────────────────────────────────────────────────
function RangePicker({arrivalDate, setArrivalDate, totalNights}){
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [open, setOpen] = useState(false);
  const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  const DAYS = ["Su","Mo","Tu","We","Th","Fr","Sa"];
  const startDate = arrivalDate ? new Date(arrivalDate) : null;
  const endDate = startDate ? new Date(startDate) : null;
  if(endDate) endDate.setDate(endDate.getDate() + totalNights);
  function isSameDay(a, b){return a && b && a.getDate()===b.getDate() && a.getMonth()===b.getMonth() && a.getFullYear()===b.getFullYear();}
  function isInRange(d){if(!startDate || !endDate) return false;return d > startDate && d < endDate;}
  function toDateStr(d){const y = d.getFullYear();const m = String(d.getMonth()+1).padStart(2,'0');const day = String(d.getDate()).padStart(2,'0');return `${y}-${m}-${day}`;}
  function handleSelect(d){setArrivalDate(toDateStr(d));setOpen(false);}
  function prevMonth(){if(viewMonth===0){setViewMonth(11);setViewYear(y=>y-1);}else setViewMonth(m=>m-1);}
  function nextMonth(){if(viewMonth===11){setViewMonth(0);setViewYear(y=>y+1);}else setViewMonth(m=>m+1);}
  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth+1, 0).getDate();
  const cells = [];
  for(let i=0;i<firstDay;i++) cells.push(null);
  for(let d=1;d<=daysInMonth;d++) cells.push(new Date(viewYear, viewMonth, d));
  const displayLabel = startDate && endDate ? dateRange(toDateStr(startDate), endDate) : "Select travel date";
  return(
    <div style={{marginBottom:14}}>
      <div style={{fontSize:10,color:B.textLight,letterSpacing:2,fontWeight:700,marginBottom:4}}>TRAVEL DATES</div>
      <div onClick={()=>setOpen(!open)} style={{background:B.offWhite,border:`1.5px solid ${open?B.teal:B.border}`,borderRadius:11,padding:"11px 13px",cursor:"pointer",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <span style={{fontSize:14,color:startDate?B.teal:B.textLight,fontWeight:startDate?700:400}}>
          {startDate?"📅 "+displayLabel:"📅 Choose start date"}
        </span>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={B.teal} strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
      </div>
      {open&&(
        <div style={{background:B.white,border:`1.5px solid ${B.border}`,borderRadius:14,padding:"14px",marginTop:6,boxShadow:"0 8px 24px rgba(4,150,165,0.12)"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
            <button onClick={prevMonth} style={{background:B.tealLight,border:"none",color:B.teal,width:32,height:32,borderRadius:8,fontSize:16,cursor:"pointer",fontWeight:700}}>‹</button>
            <span style={{fontSize:14,fontWeight:700,color:B.text}}>{MONTHS[viewMonth]} {viewYear}</span>
            <button onClick={nextMonth} style={{background:B.tealLight,border:"none",color:B.teal,width:32,height:32,borderRadius:8,fontSize:16,cursor:"pointer",fontWeight:700}}>›</button>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",marginBottom:4}}>
            {DAYS.map(d=><div key={d} style={{textAlign:"center",fontSize:11,fontWeight:700,color:B.textLight,padding:"4px 0"}}>{d}</div>)}
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:2}}>
            {cells.map((d,i)=>{
              if(!d) return <div key={i}/>;
              const isStart = isSameDay(d, startDate);
              const isEnd = isSameDay(d, endDate);
              const inRange = isInRange(d);
              const isPast = d < new Date(today.getFullYear(), today.getMonth(), today.getDate());
              let bg = "transparent";let color = isPast ? B.textLight : B.text;let borderRadius = "8px";
              if(isStart){ bg=B.teal; color="#fff"; borderRadius="8px 0 0 8px"; }
              else if(isEnd){ bg=B.teal; color="#fff"; borderRadius="0 8px 8px 0"; }
              else if(inRange){ bg=B.tealLight; color=B.teal; borderRadius="0"; }
              return(
                <div key={i} onClick={()=>!isPast&&handleSelect(d)} style={{height:36,display:"flex",alignItems:"center",justifyContent:"center",background:bg,color,borderRadius,fontSize:13,cursor:isPast?"default":"pointer",fontWeight:isStart||isEnd?700:400}}>
                  {d.getDate()}
                </div>
              );
            })}
          </div>
          {startDate&&<div style={{marginTop:12,padding:"10px 12px",background:B.tealLight,borderRadius:10,fontSize:13,color:B.teal,fontWeight:600,textAlign:"center"}}>
            📅 {displayLabel} · {totalNights} night{totalNights!==1?"s":""}
          </div>}
        </div>
      )}
    </div>
  );
}

// ── INCL/EXCL EDITOR ─────────────────────────────────────────────────────────
function InclExclEditor({form, setForm}){
  const incls = form.defaultInclusions || [];
  const excls = form.defaultExclusions || [];
  function addIncl(){ setForm(f=>({...f,defaultInclusions:[...(f.defaultInclusions||[]),""]})); }
  function updIncl(i,v){ setForm(f=>({...f,defaultInclusions:(f.defaultInclusions||[]).map((x,j)=>j===i?v:x)})); }
  function delIncl(i){ setForm(f=>({...f,defaultInclusions:(f.defaultInclusions||[]).filter((_,j)=>j!==i)})); }
  function addExcl(){ setForm(f=>({...f,defaultExclusions:[...(f.defaultExclusions||[]),""]})); }
  function updExcl(i,v){ setForm(f=>({...f,defaultExclusions:(f.defaultExclusions||[]).map((x,j)=>j===i?v:x)})); }
  function delExcl(i){ setForm(f=>({...f,defaultExclusions:(f.defaultExclusions||[]).filter((_,j)=>j!==i)})); }
  return(
    <div>
      <div style={{background:B.tealLight,borderRadius:11,padding:"10px 13px",marginBottom:14,fontSize:12,color:B.teal,fontWeight:600}}>📋 Set default inclusions & exclusions. Sales selections (hotel, flights, addons) are added automatically.</div>
      <div style={{marginBottom:18}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
          <div style={{fontSize:13,fontWeight:700,color:B.teal}}>✓ Default Inclusions</div>
          <button onClick={addIncl} style={{background:B.tealLight,border:"none",color:B.teal,padding:"5px 12px",borderRadius:8,fontSize:11,fontWeight:700,cursor:"pointer"}}>+ Add</button>
        </div>
        {incls.length===0&&<div style={{fontSize:12,color:B.textLight,padding:10,background:B.offWhite,borderRadius:9,textAlign:"center"}}>No inclusions yet</div>}
        {incls.map((item,i)=>(
          <div key={i} style={{display:"flex",gap:8,marginBottom:8,alignItems:"center"}}>
            <div style={{color:B.teal,fontSize:16}}>✓</div>
            <input value={item} onChange={e=>updIncl(i,e.target.value)} placeholder="e.g. Return flight tickets" style={{flex:1,background:B.offWhite,border:`1.5px solid ${B.border}`,borderRadius:9,color:B.text,padding:"9px 11px",fontSize:13,outline:"none",fontFamily:"'Poppins',sans-serif"}}/>
            <button onClick={()=>delIncl(i)} style={{background:"none",border:"none",color:B.orange,fontSize:16,cursor:"pointer"}}>✕</button>
          </div>
        ))}
      </div>
      <div>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
          <div style={{fontSize:13,fontWeight:700,color:B.orange}}>✗ Default Exclusions</div>
          <button onClick={addExcl} style={{background:B.orangeLight,border:"none",color:B.orange,padding:"5px 12px",borderRadius:8,fontSize:11,fontWeight:700,cursor:"pointer"}}>+ Add</button>
        </div>
        {excls.length===0&&<div style={{fontSize:12,color:B.textLight,padding:10,background:B.offWhite,borderRadius:9,textAlign:"center"}}>No exclusions yet</div>}
        {excls.map((item,i)=>(
          <div key={i} style={{display:"flex",gap:8,marginBottom:8,alignItems:"center"}}>
            <div style={{color:B.orange,fontSize:16}}>✗</div>
            <input value={item} onChange={e=>updExcl(i,e.target.value)} placeholder="e.g. Visa fees" style={{flex:1,background:B.offWhite,border:`1.5px solid ${B.border}`,borderRadius:9,color:B.text,padding:"9px 11px",fontSize:13,outline:"none",fontFamily:"'Poppins',sans-serif"}}/>
            <button onClick={()=>delExcl(i)} style={{background:"none",border:"none",color:B.orange,fontSize:16,cursor:"pointer"}}>✕</button>
          </div>
        ))}
      </div>
    </div>
  );
}
