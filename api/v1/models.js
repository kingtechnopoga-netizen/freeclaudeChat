import {authorize,json,modelList} from "../_lib.js";
export default async function handler(request){const denied=authorize(request);if(denied)return denied;if(request.method!=="GET")return json({error:{message:"Method not allowed"}},405);return json(modelList())}
