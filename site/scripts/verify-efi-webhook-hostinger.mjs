import assert from "node:assert/strict";
import { register } from "node:module";

const routeUrl = new URL("../app/api/payments/webhooks/efi/route.ts", import.meta.url).href;
const settingsUrl = new URL("../lib/admin/settings.ts", import.meta.url).href;
const moduleUrl = source => `data:text/javascript,${encodeURIComponent(source)}`;
const aliases = {
  "next/server": moduleUrl("export class NextResponse extends Response {static json(body,init){return Response.json(body,init);}}"),
  "@/lib/admin/secrets": moduleUrl("export const PAYMENT_SECRET_NAMES={efiWebhookToken:'token',efiWebhookMtlsGatewaySecret:'gateway'}; export async function getPaymentSecret(_admin,name){return name==='token'?globalThis.__efiWebhookTest.token:null;}"),
  "@/lib/admin/settings": moduleUrl("export async function getApplicationSettings(){return {efiEnvironment:'production'};}"),
  "@/lib/payment/env": moduleUrl("export function assertPaymentLiveEnabled(){}"),
  "@/lib/payment/provider-persistence": moduleUrl("export async function applyVerifiedProviderCharge(_admin,charge,eventId){return globalThis.__efiWebhookTest.apply(charge,eventId);}"),
  "@/lib/payment/providers/configured-provider": moduleUrl("export async function createConfiguredPixProvider(){return globalThis.__efiWebhookTest.provider;}"),
  "@/lib/payment/providers/efi-webhook": new URL("../lib/payment/providers/efi-webhook.ts", import.meta.url).href,
  "@/lib/supabase/admin": moduleUrl("export function createSupabaseAdminClient(){return {};}"),
};
const readinessAliases = {
  "server-only": moduleUrl("export {};"),
  "@/lib/music/kie-env": moduleUrl("export function getKieGenerationMode(){return 'live';} export function getKieModel(){return 'V6';}"),
  "@/lib/payment/env": moduleUrl("export function getPaymentMode(){return 'live';} export function getPaymentProvider(){return 'efi';}"),
  "@/lib/admin/secrets": moduleUrl("export const PAYMENT_SECRET_NAMES={efiWebhookMtlsGatewaySecret:'gateway'}; export async function getKieApiKey(){return 'configured';} export async function getKieWebhookHmacKey(){return 'configured';} export async function getPaymentSecret(_admin,name){return name==='gateway'?null:'configured';}"),
};
register(moduleUrl(`
 let fixture;
 export function initialize(data){fixture=data;}
 export function resolve(specifier,context,next){
  if(decodeURIComponent(context.parentURL??'')===decodeURIComponent(fixture.routeUrl)&&fixture.aliases[specifier])return {url:fixture.aliases[specifier],shortCircuit:true};
  if(decodeURIComponent(context.parentURL??'')===decodeURIComponent(fixture.settingsUrl)&&fixture.readinessAliases[specifier])return {url:fixture.readinessAliases[specifier],shortCircuit:true};
  return next(specifier,context);
 }
`), {parentURL:import.meta.url,data:{routeUrl,aliases,settingsUrl,readinessAliases}});

const token="token-secreto-de-teste-com-24-caracteres";
let queries=0,events=0;
const verifiedCharge={provider:"efi",externalId:"txid12345678901234567890123456",status:"pending",amountCents:1990,currency:"BRL"};
globalThis.__efiWebhookTest={token,provider:{async getPixCharge(id){queries++;assert.equal(id,verifiedCharge.externalId);return verifiedCharge;}},async apply(charge,eventId){events++;assert.deepEqual(charge,verifiedCharge);assert.match(eventId,/^pix:/);return {found:true};}};
const previous=process.env.EFI_WEBHOOK_MTLS_TERMINATION;
try{
 const {POST}=await import(routeUrl);
 const call=(source,providedToken=token,body="",extraHeaders={})=>POST(new Request(`https://www.tecantei.site/api/payments/webhooks/efi?hmac=${providedToken}&ignorar=`,{method:"POST",headers:{...(source?{"x-forwarded-for":source}:{}),...extraHeaders},body}));
 process.env.EFI_WEBHOOK_MTLS_TERMINATION="hostinger";
 const {integrationReadiness}=await import(settingsUrl);
 const readiness=await integrationReadiness({});
 assert.equal(readiness.efiConfigured,true,"Hostinger must not require an unused mTLS gateway secret");
 assert.equal(readiness.efiHostingerWebhookEnabled,true);
 assert.equal((await call("34.193.116.226, 198.51.100.8")).status,403);
 assert.equal((await call("34.193.116.226, 198.51.100.8",token,"",{"x-real-ip":"34.193.116.226"})).status,403);
 assert.equal((await call("198.51.100.8, 34.193.116.226","incorreto")).status,401);
 assert.equal((await call(null)).status,403);
 assert.equal((await call("198.51.100.8, 34.193.116.226")).status,200);
 assert.equal(queries,0);assert.equal(events,0,"empty Efí registration probe must not change payments");
 const notification=JSON.stringify({pix:[{endToEndId:"E12345678202610061200abcdefghijk",txid:verifiedCharge.externalId,valor:"0.01",horario:"2026-10-06T12:00:00-03:00"}]});
 assert.equal((await call("34.193.116.226",token,notification)).status,503,"pending provider charge must request retry");
 assert.equal(queries,1);assert.equal(events,1);
 assert.equal((await call("34.193.116.226",token,notification,{"content-length":"65537"})).status,413);
 assert.equal(queries,1);
 process.env.EFI_WEBHOOK_MTLS_TERMINATION="direct";
 assert.equal((await call("34.193.116.226")).status,200,"Vercel compatibility");
 process.env.EFI_WEBHOOK_MTLS_TERMINATION="unconfigured";
 assert.equal((await call("34.193.116.226")).status,403);
}finally{
 if(previous===undefined)delete process.env.EFI_WEBHOOK_MTLS_TERMINATION;else process.env.EFI_WEBHOOK_MTLS_TERMINATION=previous;
 delete globalThis.__efiWebhookTest;
}
console.log("PASS: rota Efí Hostinger rejeita IP forjado e token inválido, aceita sondagem vazia e consulta o provedor antes de aplicar pagamento");
