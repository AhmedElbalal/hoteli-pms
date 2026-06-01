const API = '/api';
export function getToken(){ return localStorage.getItem('hoteli_token'); }
export function setSession(data){ localStorage.setItem('hoteli_token', data.token); localStorage.setItem('hoteli_user', JSON.stringify(data.user)); }
export function getUser(){ try { return JSON.parse(localStorage.getItem('hoteli_user')); } catch { return null; } }
export function clearSession(){ localStorage.removeItem('hoteli_token'); localStorage.removeItem('hoteli_user'); }
export async function api(path, options={}){
 const res = await fetch(API+path,{...options,headers:{'Content-Type':'application/json',...(getToken()?{Authorization:`Bearer ${getToken()}`}:{}),...(options.headers||{})}});
 const body = await res.json().catch(()=>({})); if(!res.ok) throw new Error(body.error || 'Request failed'); return body;
}
export const auth = { login:(email,password)=>api('/auth/login',{method:'POST',body:JSON.stringify({email,password})}) };
