import {authorize,json,modelList,upstreamHeadersForOpenAI,upstreamUrl} from "../_lib.js";
export default async function handler(request){
 const denied=authorize(request);if(denied)return denied;
 if(request.method!=="GET")return json({error:{message:"Method not allowed"}},405);
 if(!process.env.YUVRAJ_API_KEY)return json(modelList());
 try{
  const r=await fetch(upstreamUrl("/models"),{headers:upstreamHeadersForOpenAI()});
  const raw=await r.text();let data=null;try{data=JSON.parse(raw)}catch{}
  if(r.ok&&data?.data)return json(data);
 }catch{}
 return json(modelList());
}
