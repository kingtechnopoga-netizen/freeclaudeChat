const DEFAULT_BASE_URL="https://api.yuvraj.pro/v1";
export const MODELS=["composer-2.5","grok","grok-4.5","grok-4.5-latest","grok-4.6","grok-4.7","grok-build-latest","grok-composer","grok-composer-2.5-fast","grok-latest"];
export function json(data,status=200,extraHeaders={}){return new Response(JSON.stringify(data),{status,headers:{"content-type":"application/json; charset=utf-8",...extraHeaders}})}
export function getProxyKey(r){const a=r.headers.get("authorization")||"";if(a.toLowerCase().startsWith("bearer "))return a.slice(7).trim();return r.headers.get("x-api-key")||""}
export function authorize(r){const expected=process.env.PROXY_API_KEY;if(!expected)return null;const supplied=getProxyKey(r);return !supplied||supplied!==expected?json({error:{type:"authentication_error",message:"Invalid proxy API key"}},401):null}
export function upstreamUrl(path){const base=(process.env.UPSTREAM_BASE_URL||DEFAULT_BASE_URL).replace(/\/+$/,"").trim();return `${base}${path}`}
export function validateModel(body){if(!body?.model)return json({error:{type:"invalid_request_error",message:"model is required"}},400);if(!MODELS.includes(body.model))return json({error:{type:"invalid_request_error",message:`Unsupported model. Available models: ${MODELS.join(", ")}`}},400);return null}
export async function readJson(r){try{return await r.json()}catch{return null}}
export function upstreamHeadersForOpenAI(){return {"content-type":"application/json","authorization":`Bearer ${process.env.YUVRAJ_API_KEY}`}}
export function upstreamHeadersForAnthropic(r){return {"content-type":"application/json","x-api-key":process.env.YUVRAJ_API_KEY,"anthropic-version":r.headers.get("anthropic-version")||"2023-06-01"}}
export function modelList(){const now=Math.floor(Date.now()/1000);return {object:"list",data:MODELS.map(id=>({id,object:"model",created:now,owned_by:"upstream"}))}}
