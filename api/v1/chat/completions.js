import {authorize,json,readJson,validateModel,upstreamHeadersForOpenAI} from "../../_lib.js";
function input(messages=[]){return messages.map(m=>({role:m.role,content:typeof m.content==="string"?[{type:"input_text",text:m.content}]:m.content}))}
function textOf(d){if(typeof d?.output_text==="string")return d.output_text;const out=[];for(const item of d?.output||[])for(const c of item?.content||[])if(typeof c?.text==="string")out.push(c.text);return out.join("")}
async function read(res){const raw=await res.text();let data=null;try{data=JSON.parse(raw)}catch{}return {raw,data}}
function errResponse(res,raw,data){return json({error:{type:"upstream_error",message:data?.error?.message||data?.message||raw.replace(/\s+/g," ").slice(0,800)||("Upstream HTTP "+res.status)}},502)}
export default async function handler(request){
 const denied=authorize(request);if(denied)return denied;
 if(request.method!=="POST")return json({error:{message:"Method not allowed"}},405);
 if(!process.env.YUVRAJ_API_KEY)return json({error:{message:"YUVRAJ_API_KEY is not configured"}},500);
 const body=await readJson(request);if(!body)return json({error:{type:"invalid_request_error",message:"Invalid JSON body"}},400);
 const e=validateModel(body);if(e)return e;
 if(body.stream)return json({error:{type:"invalid_request_error",message:"Streaming is not implemented yet."}},400);
 const base=(process.env.UPSTREAM_BASE_URL||"https://api.yuvraj.pro/v1").replace(/\/+$/,"");
 const headers=upstreamHeadersForOpenAI();

 // First try OpenAI-compatible Chat Completions for model pools that expose it.
 const chatBody={model:body.model,messages:body.messages,stream:false};
 for(const k of ["temperature","max_tokens","top_p","tools","tool_choice"])if(body[k]!==undefined)chatBody[k]=body[k];
 let res=await fetch(base+"/chat/completions",{method:"POST",headers,body:JSON.stringify(chatBody)});
 let {raw,data}=await read(res);
 if(res.ok&&data?.choices?.[0]){
  const c=data.choices[0];
  return json({id:data.id||("chatcmpl-"+crypto.randomUUID()),object:"chat.completion",created:data.created||Math.floor(Date.now()/1000),model:data.model||body.model,choices:[{index:0,message:{role:"assistant",content:typeof c.message?.content==="string"?c.message.content:JSON.stringify(c.message?.content??"")},finish_reason:c.finish_reason||"stop"}],usage:data.usage});
 }

 // Fallback to Responses for providers/models that only expose that interface.
 const rb={model:body.model,input:input(body.messages),temperature:body.temperature,max_output_tokens:body.max_tokens,top_p:body.top_p,tools:body.tools,tool_choice:body.tool_choice,stream:false};
 Object.keys(rb).forEach(k=>rb[k]===undefined&&delete rb[k]);
 res=await fetch(base+"/responses",{method:"POST",headers,body:JSON.stringify(rb)});
 ({raw,data}=await read(res));
 if(!res.ok||!data)return errResponse(res,raw,data);
 if(data?.error)return errResponse(res,raw,data);
 const answer=textOf(data);
 return json({id:data.id||("chatcmpl-"+crypto.randomUUID()),object:"chat.completion",created:data.created_at||Math.floor(Date.now()/1000),model:data.model||body.model,choices:[{index:0,message:{role:"assistant",content:answer||"No text response returned."},finish_reason:"stop"}],usage:data.usage});
}
