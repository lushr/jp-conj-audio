let allCards=[],sets=[],currentSet=0,currentIndex=0;
const promptEl=document.getElementById("englishPrompt"),answerEl=document.getElementById("japaneseAnswer"),answerCard=document.getElementById("answerCard"),revealButton=document.getElementById("revealButton"),nextButton=document.getElementById("nextButton"),progressText=document.getElementById("progressText"),progressBar=document.getElementById("progressBar"),modeLabel=document.getElementById("modeLabel"),setPicker=document.getElementById("setPicker"),helpButton=document.getElementById("helpButton"),helpPanel=document.getElementById("helpPanel"),closeHelp=document.getElementById("closeHelp");
const SIZE=30;
function shuffle(items){const a=[...items];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
function word(c){return c.english.split(" — ")[0]}
function makeSets(cards){
 const kuru=cards.find(c=>word(c)==="くる");
 if(!kuru)throw Error("Missing くる");
 const others=cards.filter(c=>c!==kuru);
 const count=Math.ceil(others.length/(SIZE-1));
 const groups=Array.from({length:count},()=>[]);
 // Spread verbs and both adjective types throughout every set.
 for(const type of ["verb","i-adj","na-adj"]){
   const candidates=shuffle(others.filter(c=>c.type===type));
   candidates.forEach((card,i)=>groups[i%count].push(card));
 }
 const tricky=["いい","かっこいい","たかい","つまらない","なる","つく","おくる"];
 const extras=shuffle(others.filter(c=>tricky.includes(word(c))));
 return groups.map((group,i)=>{
   const deck=[...group];
   let offset=i;
   while(deck.length<SIZE-1){
     const options=extras.filter(c=>!deck.includes(c));
     if(!options.length)break;
     deck.push(options[offset%options.length]);offset++;
   }
   return shuffle([kuru,...deck]);
 });
}
function showCard(){
 stopSpeech();
 const deck=sets[currentSet];if(!deck)return;
 const finished=currentIndex>=deck.length;
 modeLabel.textContent=`Set ${currentSet+1} of ${sets.length}`;
 setPicker.querySelectorAll("button").forEach((b,i)=>{b.classList.toggle("active",i===currentSet);b.setAttribute("aria-pressed",String(i===currentSet))});
 progressText.textContent=`${Math.min(currentIndex+1,deck.length)}/${deck.length}`;
 progressBar.style.width=`${(Math.min(currentIndex+1,deck.length)/deck.length)*100}%`;
 answerCard.classList.add("hidden");
 if(finished){
   promptEl.textContent="Set complete!";
   answerEl.textContent="";
   revealButton.classList.add("hidden");
   if(currentSet<sets.length-1){answerCard.classList.remove("hidden");nextButton.textContent="Next set →"}
   return;
 }
 const c=deck[currentIndex];promptEl.textContent=c.english;renderAnswer(c);
 revealButton.classList.remove("hidden");nextButton.textContent=currentIndex===deck.length-1?"Finish set":"Next";
}
function chooseSet(n){if(n<0||n>=sets.length)return;currentSet=n;currentIndex=0;showCard();window.scrollTo({top:0,behavior:"smooth"})}
revealButton.addEventListener("click",()=>{answerCard.classList.remove("hidden");revealButton.classList.add("hidden")});
nextButton.addEventListener("click",()=>{if(currentIndex>=sets[currentSet].length){chooseSet(currentSet+1);return}currentIndex++;showCard();window.scrollTo({top:0,behavior:"smooth"})});

helpButton.addEventListener("click",()=>helpPanel.classList.remove("hidden"));closeHelp.addEventListener("click",()=>helpPanel.classList.add("hidden"));helpPanel.addEventListener("click",e=>{if(e.target===helpPanel)helpPanel.classList.add("hidden")});
async function loadDeck(){try{const r=await fetch("conjugations.json");if(!r.ok)throw Error();allCards=await r.json();sets=makeSets(allCards);setPicker.replaceChildren(...sets.map((_,i)=>{const b=document.createElement("button");b.type="button";b.className="level-button";b.textContent=String.fromCharCode(65+i);b.setAttribute("aria-label",`Set ${i+1}`);b.addEventListener("click",()=>chooseSet(i));return b}));showCard()}catch(e){promptEl.textContent="Error loading conjugation deck";progressText.textContent="0/0"}}
if("serviceWorker"in navigator){
 window.addEventListener("load",async()=>{
   try{
     const registration=await navigator.serviceWorker.register("service-worker.js",{updateViaCache:"none"});
     await registration.update();
   }catch(e){}
 });
}loadDeck();

// Native Japanese TTS: individual line playback or a paced sequence.
const pronounceButton=document.getElementById("pronounceButton");
const ttsStatus=document.getElementById("ttsStatus");
const rates=[0.65,0.75,0.85];let rateIndex=1,rate=rates[rateIndex],sequence=0,pauseTimer=null;
function stopSpeech(){sequence++;if(pauseTimer!==null){clearTimeout(pauseTimer);pauseTimer=null;}if("speechSynthesis" in window)speechSynthesis.cancel();}
function japaneseVoice(){return speechSynthesis.getVoices().find(v=>v.lang.startsWith("ja"));}
function speakLine(line,token,onDone){
 if(token!==sequence)return;
 const utterance=new SpeechSynthesisUtterance(line);utterance.lang="ja-JP";utterance.rate=rate;
 const voice=japaneseVoice();if(voice)utterance.voice=voice;
 utterance.onend=()=>{if(token===sequence)onDone();};
 utterance.onerror=e=>{if(token===sequence){ttsStatus.textContent="Speech error: "+e.error;}};
 speechSynthesis.speak(utterance);
}
function renderAnswer(card){
 answerEl.replaceChildren();
 for(const line of card.japanese.split("\\n").filter(Boolean)){
  const row=document.createElement("div");row.className="speech-line";
  const label=document.createElement("span");label.textContent=line;
  row.append(label);answerEl.append(row);
 }
}
pronounceButton.addEventListener("click",()=>{
 const card=sets[currentSet]?.[currentIndex];if(!card)return;
 if(!("speechSynthesis" in window)){ttsStatus.textContent="Speech synthesis unavailable.";return;}
 stopSpeech();const token=sequence;
 const phrase=card.japanese.split("\\n").filter(Boolean).join("。 ")+"。";
 ttsStatus.textContent="";
 speakLine(phrase,token,()=>{ttsStatus.textContent="";});
});
function setRate(delta){rateIndex=Math.max(0,Math.min(rates.length-1,rateIndex+delta));rate=rates[rateIndex];stopSpeech();ttsStatus.textContent="";document.getElementById("slowerButton").disabled=rateIndex===0;document.getElementById("fasterButton").disabled=rateIndex===rates.length-1;}
document.getElementById("slowerButton").addEventListener("click",()=>setRate(-1));
document.getElementById("fasterButton").addEventListener("click",()=>setRate(1));
