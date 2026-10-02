const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const form=$("#chat-form"),input=$("#input"),send=$("#send"),messagesEl=$("#messages"),modelMenu=$("#modelMenu"),modelBtn=$("#modelBtn"),modelName=$("#modelName"),sidebar=$("#sidebar"),overlay=$("#overlay"),toastEl=$("#toast");
let selectedModel=localStorage.getItem("selectedModel")||"grok-4.5";
let messages=[], attached=[], chats=JSON.parse(localStorage.getItem("claudeChats")||"[]"), currentId=crypto.randomUUID(), aborter=null;
const labels={};
modelName.textContent=labels[selectedModel]||selectedModel;
function toast(t){toastEl.textContent=t;toastEl.classList.add("show");setTimeout(()=>toastEl.classList.remove("show"),1800)}
function save(){localStorage.setItem("claudeChats",JSON.stringify(chats.slice(-30)))}
function renderHistory(filter=""){const h=$("#chatHistory");h.innerHTML="";chats.slice().reverse().filter(c=>c.title.toLowerCase().includes(filter.toLowerCase())).forEach(c=>{const b=document.createElement("button");b.className="history-item";b.innerHTML='<span>'+esc(c.title)+'</span><span class="delete" title="Delete">×</span>';b.onclick=e=>{if(e.target.classList.contains("delete")){chats=chats.filter(x=>x.id!==c.id);save();renderHistory(filter);return}loadChat(c.id)};h.appendChild(b)})}
function esc(s){return String(s).replace(/[&<>"]/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[m]))}
function newChat(){messages=[];currentId=crypto.randomUUID();messagesEl.innerHTML='<div class="welcome" id="welcome"><div class="claude-orb">✦</div><h1>How can I help you today?</h1><p>Ask anything, brainstorm ideas, analyze files, or write code.</p><div class="suggestions"><button data-prompt="Help me plan a project from scratch">Plan a project <span>→</span></button><button data-prompt="Explain a complex topic in simple terms">Explain something <span>→</span></button><button data-prompt="Write a polished professional message">Write for me <span>→</span></button><button data-prompt="Help me debug my code">Debug code <span>→</span></button></div></div>';bindSuggestions();input.focus();closeSide()}
function loadChat(id){const c=chats.find(x=>x.id===id);if(!c)return;currentId=c.id;messages=c.messages||[];messagesEl.innerHTML="";messages.forEach(m=>addMessage(m.role,m.content,false));closeSide()}
function bindSuggestions(){$$(".suggestions button").forEach(b=>b.onclick=()=>{input.value=b.dataset.prompt;resize();input.focus();form.requestSubmit()})}
function format(t){let x=esc(t);x=x.replace(/\`\`\`([\s\S]*?)\`\`\`/g,"<pre><code>$1</code></pre>");x=x.replace(/\`([^\`]+)\`/g,"<code>$1</code>");x=x.replace(/\*\*([^*]+)\*\*/g,"<strong>$1</strong>");x=x.replace(/\n/g,"<br>");return x}
function addMessage(role,content,scroll=true){$("#welcome")?.remove();const row=document.createElement("div");row.className="message "+role;const av=document.createElement("div");av.className="msg-avatar";av.textContent=role==="user"?"V":"✦";const body=document.createElement("div");body.className="message-body";const bubble=document.createElement("div");bubble.className="bubble";bubble.innerHTML=format(content);body.appendChild(bubble);if(role==="assistant"){const actions=document.createElement("div");actions.className="msg-actions";actions.innerHTML='<button data-act="copy">Copy</button><button data-act="regen">↻ Regenerate</button><button data-act="up">♡</button>';actions.onclick=e=>{const a=e.target.dataset.act;if(a==="copy")navigator.clipboard?.writeText(content).then(()=>toast("Copied"));if(a==="regen")regenerate();if(a==="up")toast("Thanks for the feedback")};body.appendChild(actions)}row.append(av,body);messagesEl.appendChild(row);if(scroll)window.scrollTo({top:document.body.scrollHeight,behavior:"smooth"})}
function typing(){const row=document.createElement("div");row.id="typing";row.className="message assistant";row.innerHTML='<div class="msg-avatar">✦</div><div class="bubble typing-dots">Thinking <span>•</span><span>•</span><span>•</span></div>';messagesEl.appendChild(row);window.scrollTo({top:document.body.scrollHeight,behavior:"smooth"})}
function resize(){input.style.height="auto";input.style.height=Math.min(input.scrollHeight,180)+"px"}
async function ask(text){messages.push({role:"user",content:text});addMessage("user",text);typing();send.disabled=true;aborter=new AbortController();try{const r=await fetch("/api/v1/chat/completions",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:selectedModel,messages}),signal:aborter.signal});const raw=await r.text();let d;try{d=JSON.parse(raw)}catch{throw Error("Server returned non-JSON (HTTP "+r.status+"). "+raw.replace(/\s+/g," ").slice(0,180))}if(!r.ok)throw Error(d?.error?.message||d?.message||"Request failed (HTTP "+r.status+")");const a=d?.choices?.[0]?.message?.content??d?.output_text??"No response returned.";$("#typing")?.remove();messages.push({role:"assistant",content:a});addMessage("assistant",a);persistChat()}catch(e){$("#typing")?.remove();if(e.name!=="AbortError")addMessage("assistant","I couldn't complete that request. "+e.message)}finally{send.disabled=false;aborter=null;input.focus()}}
function persistChat(){if(!messages.length)return;let c=chats.find(x=>x.id===currentId);const first=messages.find(x=>x.role==="user");if(!c){c={id:currentId,title:(first?.content||"New chat").slice(0,42),messages:[]};chats.push(c)}c.messages=messages;save();renderHistory($("#searchChats").value)}
async function regenerate(){const last=messages.at(-1);if(last?.role==="assistant")messages.pop();const u=messages.at(-1);if(!u)return;messages.pop();messagesEl.lastElementChild?.remove();await ask(u.content)}
form.onsubmit=e=>{e.preventDefault();const t=input.value.trim();if(t&&!send.disabled){input.value="";resize();ask(t)}};
input.oninput=resize;input.onkeydown=e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();form.requestSubmit()}};
$("#attachBtn").onclick=()=>$("#fileInput").click();$("#fileInput").onchange=e=>{[...e.target.files].forEach(f=>{attached.push(f);const a=document.createElement("div");a.className="attachment";a.innerHTML=esc(f.name)+' <button>×</button>';a.querySelector("button").onclick=()=>{attached=attached.filter(x=>x!==f);a.remove()};$("#attachmentTray").appendChild(a)});e.target.value=""};
$("#newChat").onclick=newChat;$("#brandBtn").onclick=newChat;$("#searchChats").oninput=e=>renderHistory(e.target.value);
modelBtn.onclick=e=>{e.stopPropagation();modelMenu.classList.toggle("open")};document.onclick=e=>{if(!modelMenu.contains(e.target)&&e.target!==modelBtn)modelMenu.classList.remove("open")};
function addModelButton(id){
  const list=$("#modelList"); if(!list)return;
  const b=document.createElement("button"); b.dataset.model=id;
  const name=document.createElement("b"); name.textContent=id;
  const small=document.createElement("small"); small.textContent="Upstream model";
  b.append(name,small);
  b.onclick=()=>{selectedModel=id;localStorage.setItem("selectedModel",selectedModel);modelName.textContent=labels[selectedModel]||selectedModel;modelMenu.classList.remove("open");toast("Model changed")};
  list.appendChild(b);
}
async function loadModels(){
  const list=$("#modelList"); if(!list)return;
  try{
    const r=await fetch("/api/v1/models");
    const d=await r.json();
    const ids=(d.data||[]).map(x=>x.id).filter(Boolean);
    list.innerHTML="";
    if(!ids.length)throw Error("No models returned");
    ids.forEach(id=>{labels[id]=id;addModelButton(id)});
    if(!ids.includes(selectedModel))selectedModel=ids[0];
    modelName.textContent=labels[selectedModel]||selectedModel;
  }catch(e){
    list.innerHTML='<div class="model-heading">Unable to load models</div>';
    ["grok-4.7","grok-4.6","grok-4.5","grok-4.5-latest","grok-latest","grok","composer-2.5","grok-composer","grok-composer-2.5-fast","grok-build-latest"].forEach(id=>{labels[id]=id;addModelButton(id)});
  }
}
$("#webBtn").onclick=e=>{e.currentTarget.classList.toggle("on");toast(e.currentTarget.classList.contains("on")?"Web search enabled":"Web search disabled")};
$("#thinkBtn").onclick=e=>{e.currentTarget.classList.toggle("on");toast(e.currentTarget.classList.contains("on")?"Extended thinking enabled":"Extended thinking disabled")};
$("#shareBtn").onclick=()=>{navigator.clipboard?.writeText(location.href);toast("Chat link copied")};
$("#moreBtn").onclick=()=>toast("More options coming soon");
$("#themeBtn").onclick=()=>{document.body.classList.toggle("dark");const d=document.body.classList.contains("dark");localStorage.setItem("dark",d);$("#themeLabel").textContent=d?"Dark":"Light"};
if(localStorage.getItem("dark")==="true"){$("body").classList.add("dark");$("#themeLabel").textContent="Dark"}
$("#openSide").onclick=()=>{sidebar.classList.add("open");overlay.classList.add("show")};$("#closeSide").onclick=closeSide;overlay.onclick=closeSide;function closeSide(){sidebar.classList.remove("open");overlay.classList.remove("show")}
document.addEventListener("keydown",e=>{if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==="k"){e.preventDefault();newChat()}});
renderHistory();bindSuggestions();loadModels();