"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  Activity, Bot, CircleDollarSign, CreditCard, Download, Gauge, Headphones, History, KeyRound, LayoutDashboard,
  LoaderCircle, LogOut, Music2, Plus, RefreshCw, Search, Settings2, ShieldCheck,
  Sparkles, Trash2, UserCog, Users, WandSparkles,
} from "lucide-react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { BrandLogo } from "@/components/brand-logo";

type UserRow = { id: string; email: string; displayName: string; role: "user" | "support" | "admin"; status: "active" | "suspended" | "deleted"; createdAt: string; lastSignInAt: string | null };
type GenerationRow = { id: string; order_id: string; provider: string; model: string; status: string; error_code: string | null; reserved_credits_millis: number; created_at: string; completed_at: string | null; recipientName: string; ownerEmail: string };
type GenerationAsset = { versionId: string; label: string; title: string; durationSeconds: number | null; previewUrl: string | null; previewDownloadUrl: string | null; fullDownloadUrl: string | null };
type SaleRow = { id: string; order_id: string; provider: string; amount_cents: number; currency: string; status: string; created_at: string; updated_at: string; recipientName: string };
type Settings = { lyricsMode: "mock" | "kie"; lyricsModel: "gpt-5-6-sol" | "gpt-5-6-terra" | "gpt-5-6-luna" | "gpt-6-astra"; lyricsReasoningEffort: "low" | "medium" | "high" | "xhigh"; musicMode: "mock" | "live"; musicModel: string; productPriceCents: number; paymentProvider: "mercado_pago" | "efi"; efiEnvironment: "homologation" | "production" };
type PeriodRange = "today" | "yesterday" | "7d" | "15d" | "30d" | "custom";
type AdminTab = "overview" | "users" | "generations" | "sales" | "finance" | "integrations" | "audit";
type DashboardData = {
  generatedAt: string;
  period: { range: PeriodRange; from: string; to: string; label: string };
  currentAdminId: string;
  metrics: { users: number; activeUsers: number; visitors: number; pageViews: number; orders: number; paidOrders: number; revenueCents: number; pendingRevenueCents: number; conversionRate: number; generationSuccessRate: number; creditsUsed: number };
  series: Array<{ date: string; visits: number; visitors: number; sales: number; revenueCents: number }>;
  users: UserRow[];
  generations: GenerationRow[];
  sales: SaleRow[];
  settings: Settings;
  readiness: { kieKeyConfigured: boolean; kieWebhookHmacConfigured: boolean; kieLyricsLiveGateEnabled: boolean; kieLiveGateEnabled: boolean; mercadoPagoConfigured: boolean; efiConfigured: boolean; paymentMode: "mock" | "live"; paymentLiveGateEnabled: boolean; efiMtlsGatewayEnabled: boolean; efiDirectWebhookEnabled: boolean };
  audit: Array<{ id: string; action: string; target_type: string; target_id: string | null; reason: string; created_at: string }>;
};

type UserForm = { email: string; password: string; displayName: string; role: "user" | "support" | "admin"; status: "active" | "suspended"; reason: string };
const emptyUser: UserForm = { email: "", password: "", displayName: "", role: "user", status: "active", reason: "" };
const adminNavigation: Array<{ value: AdminTab; label: string; icon: typeof LayoutDashboard }> = [
  { value: "overview", label: "Resumo", icon: LayoutDashboard },
  { value: "users", label: "Usuários", icon: Users },
  { value: "generations", label: "Gerações", icon: Music2 },
  { value: "sales", label: "Vendas", icon: CreditCard },
  { value: "finance", label: "Financeiro", icon: CircleDollarSign },
  { value: "integrations", label: "Integrações", icon: Bot },
  { value: "audit", label: "Auditoria", icon: History },
];

export function AdminDashboard({ adminEmail }: { adminEmail: string }) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [userDialog, setUserDialog] = useState<"create" | "edit" | null>(null);
  const [selectedUser, setSelectedUser] = useState<UserRow | null>(null);
  const [userForm, setUserForm] = useState<UserForm>(emptyUser);
  const [deleteUser, setDeleteUser] = useState<UserRow | null>(null);
  const [deleteReason, setDeleteReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [settingsReason, setSettingsReason] = useState("");
  const [testing, setTesting] = useState<"kie" | null>(null);
  const [periodRange, setPeriodRange] = useState<PeriodRange>("30d");
  const [customFrom, setCustomFrom] = useState(() => relativeDate(29));
  const [customTo, setCustomTo] = useState(() => relativeDate(0));
  const [periodBusy, setPeriodBusy] = useState(false);
  const [activeTab, setActiveTab] = useState<AdminTab>("overview");
  const [signingOut, setSigningOut] = useState(false);
  const [kieApiKey, setKieApiKey] = useState("");
  const [secretReason, setSecretReason] = useState("");
  const [secretBusy, setSecretBusy] = useState(false);
  const [removeSecretOpen, setRemoveSecretOpen] = useState(false);
  const [webhookHmacKey, setWebhookHmacKey] = useState("");
  const [webhookReason, setWebhookReason] = useState("");
  const [webhookBusy, setWebhookBusy] = useState(false);
  const [removeWebhookOpen, setRemoveWebhookOpen] = useState(false);
  const [assetGeneration, setAssetGeneration] = useState<GenerationRow | null>(null);
  const [assetReason, setAssetReason] = useState("");
  const [generationAssets, setGenerationAssets] = useState<GenerationAsset[]>([]);
  const [assetBusy, setAssetBusy] = useState(false);
  const [assetError, setAssetError] = useState("");
  const [priceValue, setPriceValue] = useState("19,90");
  const [financialReason, setFinancialReason] = useState("");
  const [financialBusy, setFinancialBusy] = useState(false);
  const [mercadoPagoSecrets, setMercadoPagoSecrets] = useState({ accessToken: "", webhookSecret: "" });
  const [efiSecrets, setEfiSecrets] = useState({ clientId: "", clientSecret: "", pixKey: "", certificateP12Base64: "", certificatePassphrase: "", webhookToken: "", webhookMtlsGatewaySecret: "" });

  const load = async (range: PeriodRange = periodRange, from = customFrom, to = customTo, initial = false) => {
    if (initial) setLoading(true);
    else setPeriodBusy(true);
    setError("");
    const response = await fetch(dashboardUrl(range, from, to), { headers: { Accept: "application/json" } }).catch(() => null);
    if (!response?.ok) {
      setError(response?.status === 400
        ? "Selecione um período válido de até 366 dias."
        : response?.status === 404
          ? "Sua sessão administrativa expirou. Recarregue a página e entre novamente."
          : "Não foi possível carregar os dados administrativos.");
      setLoading(false);
      setPeriodBusy(false);
      return;
    }
    const next = await response.json() as DashboardData;
    setData(next);
    setSettings(next.settings);
    setPriceValue((next.settings.productPriceCents / 100).toFixed(2).replace(".", ","));
    setPeriodRange(next.period.range);
    setLoading(false);
    setPeriodBusy(false);
  };

  useEffect(() => {
    const controller = new AbortController();
    void fetch("/api/admin/dashboard?range=30d", {
      headers: { Accept: "application/json" },
      signal: controller.signal,
    }).then(async (response) => {
      if (!response.ok) throw new Error("admin_unavailable");
      const next = await response.json() as DashboardData;
      setData(next);
      setSettings(next.settings);
      setPriceValue((next.settings.productPriceCents / 100).toFixed(2).replace(".", ","));
      setLoading(false);
    }).catch((requestError: unknown) => {
      if (requestError instanceof DOMException && requestError.name === "AbortError") return;
      setError("Não foi possível carregar os dados administrativos.");
      setLoading(false);
    });
    return () => controller.abort();
  }, []);

  const selectPeriod = (range: PeriodRange) => {
    setPeriodRange(range);
    setError("");
    if (range !== "custom") void load(range, customFrom, customTo);
  };

  const applyCustomPeriod = () => {
    if (!customFrom || !customTo || customFrom > customTo) {
      setError("Informe uma data inicial anterior ou igual à data final.");
      return;
    }
    void load("custom", customFrom, customTo);
  };

  const filteredUsers = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("pt-BR");
    if (!query) return data?.users ?? [];
    return (data?.users ?? []).filter((user) => `${user.displayName} ${user.email} ${user.role}`.toLocaleLowerCase("pt-BR").includes(query));
  }, [data?.users, search]);

  const openCreate = () => { setUserForm(emptyUser); setSelectedUser(null); setUserDialog("create"); setMessage(""); setError(""); };
  const openEdit = (user: UserRow) => {
    setSelectedUser(user);
    setUserForm({ email: user.email, password: "", displayName: user.displayName || "Cliente Te Cantei", role: user.role, status: user.status === "suspended" ? "suspended" : "active", reason: "" });
    setUserDialog("edit"); setMessage(""); setError("");
  };

  const saveUser = async (event: FormEvent) => {
    event.preventDefault(); setBusy(true); setError("");
    const editing = userDialog === "edit" && selectedUser;
    const response = await fetch(editing ? `/api/admin/users/${selectedUser.id}` : "/api/admin/users", {
      method: editing ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(userForm),
    }).catch(() => null);
    setBusy(false);
    if (!response?.ok) {
      const payload = response ? await response.json().catch(() => null) as { error?: string } | null : null;
      setError(response?.status === 404
        ? "Sua sessão administrativa expirou. Recarregue a página e entre novamente."
        : payload?.error === "cannot_lock_current_admin"
          ? "Você não pode remover o próprio acesso administrativo."
          : payload?.error === "cannot_change_current_admin_credentials"
            ? "Altere o e-mail ou a senha da sua própria conta pelo fluxo de segurança da conta."
            : "Não foi possível salvar este usuário.");
      return;
    }
    setUserDialog(null); setMessage(editing ? "Usuário atualizado e ação auditada." : "Usuário criado com sucesso."); await load();
  };

  const confirmDelete = async () => {
    if (!deleteUser) return;
    setBusy(true); setError("");
    const response = await fetch(`/api/admin/users/${deleteUser.id}`, {
      method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reason: deleteReason }),
    }).catch(() => null);
    setBusy(false);
    if (!response?.ok) { setError("Não foi possível excluir a conta. Nenhum histórico foi apagado."); return; }
    setDeleteUser(null); setDeleteReason(""); setMessage("Conta excluída. Pedidos, pagamentos e gerações foram preservados para auditoria."); await load();
  };

  const saveSettings = async () => {
    if (!settings) return;
    setBusy(true); setError("");
    const response = await fetch("/api/admin/settings", {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...settings, reason: settingsReason }),
    }).catch(() => null);
    setBusy(false);
    if (!response?.ok) { setError("Não foi possível salvar as configurações. Confira o motivo da alteração."); return; }
    setMessage("Configurações de IA atualizadas e registradas na auditoria."); setSettingsReason(""); await load();
  };

  const saveFinancialSettings = async () => {
    if (!settings) return;
    const productPriceCents = currencyInputToCents(priceValue);
    if (!productPriceCents) { setError("Informe um valor entre R$ 1,00 e R$ 10.000,00."); return; }
    setFinancialBusy(true); setError(""); setMessage("");
    const response = await fetch("/api/admin/finance/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productPriceCents, paymentProvider: settings.paymentProvider, efiEnvironment: settings.efiEnvironment, reason: financialReason }),
    }).catch(() => null);
    setFinancialBusy(false);
    if (!response?.ok) { setError("Não foi possível salvar o preço e o gateway. Confira o motivo informado."); return; }
    setFinancialReason("");
    setMessage(`Financeiro atualizado. Novos pedidos usarão ${money(productPriceCents)}.`);
    await load();
  };

  const savePaymentSecrets = async (provider: "mercado_pago" | "efi") => {
    const credentials = provider === "mercado_pago" ? mercadoPagoSecrets : efiSecrets;
    const hasValue = Object.values(credentials).some((value) => value.trim());
    if (!hasValue || financialReason.trim().length < 8) return;
    const changedCredentials = Object.fromEntries(
      Object.entries(credentials).filter(([, value]) => value.trim().length > 0),
    );
    setFinancialBusy(true); setError(""); setMessage("");
    const response = await fetch("/api/admin/finance/secrets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider, ...changedCredentials, reason: financialReason }),
    }).catch(() => null);
    setFinancialBusy(false);
    if (!response?.ok) { setError(`Não foi possível salvar as credenciais do ${provider === "efi" ? "Efí Bank" : "Mercado Pago"}.`); return; }
    if (provider === "mercado_pago") setMercadoPagoSecrets({ accessToken: "", webhookSecret: "" });
    else setEfiSecrets({ clientId: "", clientSecret: "", pixKey: "", certificateP12Base64: "", certificatePassphrase: "", webhookToken: "", webhookMtlsGatewaySecret: "" });
    setFinancialReason("");
    setMessage(`Credenciais do ${provider === "efi" ? "Efí Bank" : "Mercado Pago"} atualizadas no cofre criptografado.`);
    await load();
  };

  const removePaymentSecrets = async (provider: "mercado_pago" | "efi") => {
    if (financialReason.trim().length < 8) return;
    setFinancialBusy(true); setError(""); setMessage("");
    const response = await fetch("/api/admin/finance/secrets", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider, reason: financialReason }),
    }).catch(() => null);
    setFinancialBusy(false);
    if (!response?.ok) { setError("Não foi possível remover as credenciais selecionadas."); return; }
    setFinancialReason(""); setMessage("Credenciais removidas do cofre. Variáveis do servidor, se existirem, continuam como fallback."); await load();
  };

  const testIntegration = async (provider: "kie") => {
    const reason = settingsReason.trim() || `Teste manual da integração ${provider}`;
    setTesting(provider); setError(""); setMessage("");
    const response = await fetch("/api/admin/integrations/test", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ provider, reason }),
    }).catch(() => null);
    const result = response ? await response.json().catch(() => null) as { message?: string; credits?: number } | null : null;
    setTesting(null);
    if (!response?.ok) { setError(result?.message ?? "A integração não respondeu ao teste."); return; }
    setMessage(`${result?.message ?? "Integração conectada."}${typeof result?.credits === "number" ? ` Saldo: ${result.credits} créditos.` : ""}`);
  };

  const saveKieSecret = async () => {
    setSecretBusy(true); setError(""); setMessage("");
    const response = await fetch("/api/admin/secrets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider: "kie", apiKey: kieApiKey, reason: secretReason }),
    }).catch(() => null);
    setSecretBusy(false);
    if (!response?.ok) { setError("Não foi possível guardar a chave da Kie.ai com segurança."); return; }
    setKieApiKey(""); setSecretReason(""); setMessage("Chave da Kie.ai salva no cofre criptografado e pronta para teste."); await load();
  };

  const removeKieSecret = async () => {
    setSecretBusy(true); setError(""); setMessage("");
    const response = await fetch("/api/admin/secrets", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider: "kie", reason: secretReason }),
    }).catch(() => null);
    setSecretBusy(false);
    if (!response?.ok) { setError("Não foi possível remover a chave da Kie.ai."); return; }
    setRemoveSecretOpen(false); setKieApiKey(""); setSecretReason(""); setMessage("Chave cadastrada pelo painel removida do cofre. Uma chave definida no ambiente do servidor, se existir, continua ativa."); await load();
  };

  const saveWebhookSecret = async () => {
    setWebhookBusy(true); setError(""); setMessage("");
    const response = await fetch("/api/admin/secrets/webhook", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider: "kie", hmacKey: webhookHmacKey, reason: webhookReason }),
    }).catch(() => null);
    setWebhookBusy(false);
    if (!response?.ok) { setError("Não foi possível guardar o HMAC da Kie.ai com segurança."); return; }
    setWebhookHmacKey(""); setWebhookReason(""); setMessage("HMAC dos callbacks salvo no cofre e pronto para validação."); await load();
  };

  const removeWebhookSecret = async () => {
    setWebhookBusy(true); setError(""); setMessage("");
    const response = await fetch("/api/admin/secrets/webhook", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider: "kie", reason: webhookReason }),
    }).catch(() => null);
    setWebhookBusy(false);
    if (!response?.ok) { setError("Não foi possível remover o HMAC da Kie.ai."); return; }
    setRemoveWebhookOpen(false); setWebhookHmacKey(""); setWebhookReason(""); setMessage("HMAC cadastrado pelo painel removido do cofre."); await load();
  };

  const openGenerationAssets = (generation: GenerationRow) => {
    setAssetGeneration(generation);
    setAssetReason("");
    setGenerationAssets([]);
    setAssetError("");
  };

  const closeGenerationAssets = () => {
    setAssetGeneration(null);
    setAssetReason("");
    setGenerationAssets([]);
    setAssetError("");
  };

  const loadGenerationAssets = async () => {
    if (!assetGeneration) return;
    setAssetBusy(true);
    setAssetError("");
    const response = await fetch(`/api/admin/generations/${assetGeneration.id}/assets`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: assetReason }),
      cache: "no-store",
    }).catch(() => null);
    const payload = response
      ? await response.json().catch(() => null) as { assets?: GenerationAsset[]; error?: string } | null
      : null;
    setAssetBusy(false);
    if (!response?.ok || !payload?.assets) {
      setAssetError(response?.status === 404
        ? "Sua sessão administrativa expirou. Entre novamente."
        : "Não foi possível localizar os arquivos desta geração no armazenamento privado.");
      return;
    }
    setGenerationAssets(payload.assets);
    if (payload.assets.length === 0) {
      setAssetError("Esta tarefa ainda não possui arquivos armazenados e prontos para reprodução.");
    }
  };

  const signOut = async () => {
    setSigningOut(true);
    setError("");
    const supabase = getSupabaseBrowserClient();
    const result = supabase ? await supabase.auth.signOut() : { error: null };
    if (result.error) {
      setSigningOut(false);
      setError("Não foi possível encerrar a sessão. Tente novamente.");
      return;
    }
    window.location.replace("/");
  };

  return (
    <main className="min-h-screen bg-[#f6f3f4] text-[#2a1720]">
      <header className="sticky top-0 z-30 border-b border-black/5 bg-[#f6f3f4]/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-[1500px] items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3"><BrandLogo compact priority className="size-10 rounded-xl" /><div><p className="font-display text-xl font-bold leading-none">Te Cantei</p><p className="mt-1 text-xs text-muted-foreground">Central administrativa</p></div></div>
          <div className="flex items-center gap-2"><Badge variant="outline" className="hidden rounded-full px-3 sm:flex"><ShieldCheck /> {adminEmail}</Badge><Button type="button" variant="ghost" size="sm" className="rounded-full" disabled={signingOut} onClick={() => void signOut()}>{signingOut ? <LoaderCircle className="animate-spin" /> : <LogOut />} {signingOut ? "Saindo" : "Sair do painel"}</Button></div>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1500px] gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[230px_minmax(0,1fr)]">
        <aside className="hidden h-fit rounded-[24px] bg-[#321421] p-4 text-white shadow-xl shadow-[#321421]/10 lg:block">
          <p className="px-3 pb-3 text-xs font-bold uppercase tracking-[0.18em] text-white/45">Visão da operação</p>
          <nav aria-label="Seções do painel administrativo" className="space-y-1">
            {adminNavigation.map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                type="button"
                aria-current={activeTab === value ? "page" : undefined}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 ${activeTab === value ? "bg-white/15 text-white" : "text-white/70 hover:bg-white/10 hover:text-white"}`}
                onClick={() => setActiveTab(value)}
              >
                <Icon className="size-4" />{label}
              </button>
            ))}
          </nav>
          <div className="mt-5 rounded-2xl border border-white/10 bg-white/5 p-4"><p className="text-xs font-bold text-white/50">SEGURANÇA</p><p className="mt-2 text-sm leading-6 text-white/75">Chaves não aparecem no painel. Toda ação sensível exige motivo e fica registrada.</p></div>
        </aside>

        <section className="min-w-0">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
            <div><p className="text-sm font-bold text-[#9a315d]">Operação em tempo real</p><h1 className="mt-1 font-display text-3xl font-bold tracking-tight sm:text-4xl">Tudo o que move o Te Cantei.</h1><p className="mt-2 text-sm text-muted-foreground">Acessos, conversão, vendas, gerações, usuários e fornecedores em um só lugar.</p></div>
            <Button variant="outline" className="rounded-full bg-white" disabled={loading || periodBusy} onClick={() => void load()}><RefreshCw className={loading || periodBusy ? "animate-spin" : ""} /> Atualizar</Button>
          </div>

          {error && <div role="alert" className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-semibold text-red-800">{error}</div>}
          {message && <div role="status" className="mb-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm font-semibold text-emerald-900">{message}</div>}
          {loading || !data || !settings ? <DashboardSkeleton /> : (
            <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as AdminTab)} className="gap-6">
              <TabsList className="h-auto w-full justify-start gap-1 overflow-x-auto rounded-2xl border bg-white p-1.5 sm:w-fit">
                <Tab value="overview" icon={LayoutDashboard} label="Resumo" /><Tab value="users" icon={Users} label="Usuários" /><Tab value="generations" icon={Music2} label="Gerações" /><Tab value="sales" icon={CreditCard} label="Vendas" /><Tab value="finance" icon={CircleDollarSign} label="Financeiro" /><Tab value="integrations" icon={Bot} label="Integrações" /><Tab value="audit" icon={History} label="Auditoria" />
              </TabsList>

              <TabsContent value="overview" className="space-y-6">
                <PeriodFilter
                  range={periodRange}
                  from={customFrom}
                  to={customTo}
                  maxDate={relativeDate(0)}
                  label={data.period.label}
                  busy={periodBusy}
                  onSelect={selectPeriod}
                  onFromChange={setCustomFrom}
                  onToChange={setCustomTo}
                  onApply={applyCustomPeriod}
                />
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  <Metric icon={CircleDollarSign} label="Receita confirmada" value={money(data.metrics.revenueCents)} detail={`${data.metrics.paidOrders} vendas`} accent />
                  <Metric icon={Activity} label="Visitantes no período" value={number(data.metrics.visitors)} detail={`${number(data.metrics.pageViews)} visualizações`} />
                  <Metric icon={Gauge} label="Conversão estimada" value={`${data.metrics.conversionRate}%`} detail="vendas ÷ visitantes" />
                  <Metric icon={Sparkles} label="Gerações concluídas" value={`${data.metrics.generationSuccessRate}%`} detail={`${data.metrics.creditsUsed.toLocaleString("pt-BR")} créditos registrados`} />
                </div>
                <div className="grid gap-5 xl:grid-cols-[1.35fr_1fr]">
                  <Card className="rounded-[24px] border-black/5 shadow-none"><CardHeader><CardTitle className="font-display text-xl">Acessos · {data.period.label}</CardTitle><CardDescription>Visitantes únicos por sessão e visualizações de páginas.</CardDescription></CardHeader><CardContent><ChartContainer className="h-[280px] w-full aspect-auto" config={{ visits: { label: "Visualizações", color: "#D4AF55" }, visitors: { label: "Visitantes", color: "#F5D77E" } }}><AreaChart data={data.series}><defs><linearGradient id="visitsFill" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#D4AF55" stopOpacity={0.35}/><stop offset="95%" stopColor="#D4AF55" stopOpacity={0.02}/></linearGradient></defs><CartesianGrid vertical={false} /><XAxis dataKey="date" tickFormatter={shortDate} minTickGap={28}/><YAxis allowDecimals={false} width={28}/><ChartTooltip content={<ChartTooltipContent />} /><Area dataKey="visits" type="monotone" stroke="#D4AF55" fill="url(#visitsFill)" strokeWidth={2}/><Area dataKey="visitors" type="monotone" stroke="#F5D77E" fill="transparent" strokeWidth={2}/></AreaChart></ChartContainer></CardContent></Card>
                  <Card className="rounded-[24px] border-black/5 shadow-none"><CardHeader><CardTitle className="font-display text-xl">Vendas · {data.period.label}</CardTitle><CardDescription>Receita confirmada com base na atualização do pagamento.</CardDescription></CardHeader><CardContent><ChartContainer className="h-[280px] w-full aspect-auto" config={{ revenueCents: { label: "Receita", color: "#D4AF55" } }}><BarChart data={data.series}><CartesianGrid vertical={false}/><XAxis dataKey="date" tickFormatter={shortDate} minTickGap={28}/><YAxis tickFormatter={(value) => `R$${Number(value)/100}`} width={52}/><ChartTooltip content={<ChartTooltipContent formatter={(value) => money(Number(value))} />} /><Bar dataKey="revenueCents" fill="#D4AF55" radius={[6,6,0,0]}/></BarChart></ChartContainer></CardContent></Card>
                </div>
                <div className="grid gap-4 sm:grid-cols-3"><MiniStat label="Usuários cadastrados" value={number(data.metrics.users)} detail={`${number(data.metrics.activeUsers)} ativos`} /><MiniStat label="Pedidos criados" value={number(data.metrics.orders)} detail="últimos 500 no painel" /><MiniStat label="Receita pendente" value={money(data.metrics.pendingRevenueCents)} detail="aguardando confirmação" /></div>
              </TabsContent>

              <TabsContent value="users" className="space-y-5">
                <SectionTitle title="Usuários" description="Crie contas, ajuste permissões, suspenda acessos ou exclua sem apagar o histórico financeiro." action={<Button className="rounded-full bg-[#7e2148]" onClick={openCreate}><Plus /> Novo usuário</Button>} />
                <Card className="rounded-[24px] border-black/5 shadow-none"><CardContent className="px-4 sm:px-6"><div className="mb-4 flex items-center gap-2 rounded-xl border bg-white px-3"><Search className="size-4 text-muted-foreground"/><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por nome ou e-mail" className="border-0 shadow-none focus-visible:ring-0" /></div><Table><TableHeader><TableRow><TableHead>Usuário</TableHead><TableHead>Perfil</TableHead><TableHead>Status</TableHead><TableHead>Último acesso</TableHead><TableHead className="text-right">Ações</TableHead></TableRow></TableHeader><TableBody>{filteredUsers.map((user) => <TableRow key={user.id}><TableCell><p className="font-semibold">{user.displayName || "Sem nome"}</p><p className="text-xs text-muted-foreground">{user.email}</p></TableCell><TableCell><StatusBadge value={user.role} /></TableCell><TableCell><StatusBadge value={user.status} /></TableCell><TableCell>{user.lastSignInAt ? dateTime(user.lastSignInAt) : "Nunca"}</TableCell><TableCell><div className="flex justify-end gap-2"><Button size="sm" variant="outline" className="rounded-full" onClick={() => openEdit(user)}><UserCog /> Editar</Button><Button size="icon-sm" variant="ghost" className="rounded-full text-destructive" disabled={user.id === data.currentAdminId} onClick={() => { setDeleteUser(user); setDeleteReason(""); }} aria-label={`Excluir ${user.displayName || user.email}`}><Trash2 /></Button></div></TableCell></TableRow>)}</TableBody></Table>{filteredUsers.length === 0 && <Empty label="Nenhum usuário encontrado." />}</CardContent></Card>
              </TabsContent>

              <TabsContent value="generations" className="space-y-5"><SectionTitle title="Histórico de gerações" description="Acompanhe cada tarefa enviada à Kie.ai e abra os áudios que já foram copiados para o armazenamento privado." /><DataTable headers={["Cliente / música","Fornecedor","Modelo","Status","Créditos","Criada em","Arquivos"]} empty={data.generations.length === 0} emptyLabel="Nenhuma geração registrada neste período.">{data.generations.map((row) => <TableRow key={row.id}><TableCell><p className="font-semibold">{row.recipientName}</p><p className="text-xs text-muted-foreground">{row.ownerEmail}</p></TableCell><TableCell>{row.provider}</TableCell><TableCell><Badge variant="outline">{row.model}</Badge></TableCell><TableCell><StatusBadge value={row.status} />{row.error_code && <p className="mt-1 text-xs text-destructive">{row.error_code}</p>}</TableCell><TableCell>{Number(row.reserved_credits_millis || 0) / 1_000}</TableCell><TableCell>{dateTime(row.created_at)}</TableCell><TableCell><Button type="button" size="sm" variant="outline" className="rounded-full" onClick={() => openGenerationAssets(row)}><Headphones /> Áudios</Button></TableCell></TableRow>)}</DataTable></TabsContent>

              <TabsContent value="sales" className="space-y-5"><SectionTitle title="Vendas e pagamentos" description="Receita confirmada, cobranças pendentes, falhas e reembolsos por provedor." /><div className="grid gap-4 sm:grid-cols-3"><MiniStat label="Receita confirmada" value={money(data.metrics.revenueCents)} detail={`${data.metrics.paidOrders} pagamentos`} /><MiniStat label="Pendente" value={money(data.metrics.pendingRevenueCents)} detail="ainda não libera entrega" /><MiniStat label="Conversão estimada" value={`${data.metrics.conversionRate}%`} detail="venda por visitante" /></div><DataTable headers={["Presente","Provedor","Valor","Status","Criado","Atualizado"]} empty={data.sales.length === 0} emptyLabel="Nenhuma venda registrada neste período.">{data.sales.map((row) => <TableRow key={row.id}><TableCell className="font-semibold">{row.recipientName}</TableCell><TableCell>{providerLabel(row.provider)}</TableCell><TableCell>{money(row.amount_cents)}</TableCell><TableCell><StatusBadge value={row.status}/></TableCell><TableCell>{dateTime(row.created_at)}</TableCell><TableCell>{dateTime(row.updated_at)}</TableCell></TableRow>)}</DataTable></TabsContent>

              <TabsContent value="finance" className="space-y-5">
                <SectionTitle title="Financeiro" description="Defina o preço da oferta, escolha o gateway Pix e gerencie credenciais protegidas sem expor chaves no navegador." />
                <div className="grid gap-5 xl:grid-cols-[.8fr_1.2fr]">
                  <Card className="rounded-[24px] border-black/5 shadow-none"><CardHeader><CardTitle className="flex items-center gap-2 font-display text-xl"><CircleDollarSign className="size-5 text-primary" /> Oferta e cobrança</CardTitle><CardDescription>O novo valor aparece no site em até 15 segundos e vale para novas intenções de pagamento. Cobranças já abertas preservam o valor anterior.</CardDescription></CardHeader><CardContent className="space-y-4"><Field label="Valor da música (R$)"><Input inputMode="decimal" value={priceValue} onChange={(event) => setPriceValue(event.target.value)} placeholder="19,90" /></Field><Field label="Gateway Pix ativo"><NativeSelect className="h-11 w-full" value={settings.paymentProvider} onChange={(event) => setSettings({ ...settings, paymentProvider: event.target.value as Settings["paymentProvider"] })}><NativeSelectOption value="mercado_pago">Mercado Pago</NativeSelectOption><NativeSelectOption value="efi">Efí Bank</NativeSelectOption></NativeSelect></Field><Field label="Ambiente Efí"><NativeSelect className="h-11 w-full" value={settings.efiEnvironment} onChange={(event) => setSettings({ ...settings, efiEnvironment: event.target.value as Settings["efiEnvironment"] })}><NativeSelectOption value="homologation">Homologação</NativeSelectOption><NativeSelectOption value="production">Produção</NativeSelectOption></NativeSelect></Field><div className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm"><p className="font-semibold">Modo do servidor: {data.readiness.paymentMode === "live" && data.readiness.paymentLiveGateEnabled ? "Cobrança real" : "Simulação protegida"}</p><p className="mt-1 text-xs leading-5 text-muted-foreground">A seleção no painel não remove a trava de produção configurada no servidor.</p></div><Button type="button" className="w-full rounded-full" disabled={financialBusy || financialReason.trim().length < 8} onClick={() => void saveFinancialSettings()}>{financialBusy ? <LoaderCircle className="animate-spin" /> : <Settings2 />} Salvar preço e gateway</Button></CardContent></Card>
                  <Card className="rounded-[24px] border-black/5 shadow-none"><CardHeader><CardTitle className="font-display text-xl">Segurança e webhooks</CardTitle><CardDescription>As credenciais são write-only e armazenadas no Supabase Vault. A confirmação do cliente sempre consulta o gateway antes de liberar a entrega.</CardDescription></CardHeader><CardContent className="grid gap-4 sm:grid-cols-2"><MiniStat label="Mercado Pago" value={data.readiness.mercadoPagoConfigured ? "Configurado" : "Incompleto"} detail="Access Token + assinatura do webhook" /><MiniStat label="Efí Bank" value={data.readiness.efiConfigured ? "Configurado" : "Incompleto"} detail={data.readiness.efiDirectWebhookEnabled ? "HMAC + IP oficial + consulta ativa" : data.readiness.efiMtlsGatewayEnabled ? "mTLS declarado no gateway" : "Proteção do webhook pendente"} /><div className="rounded-xl border p-4 text-xs leading-6 sm:col-span-2"><p><strong>Mercado Pago:</strong> <code>/api/payments/webhooks/mercado-pago</code></p><p><strong>Efí Bank:</strong> <code>/api/payments/webhooks/efi?hmac=SEU_TOKEN</code></p><p className="mt-2 text-muted-foreground">Na Vercel, o callback direto da Efí usa skip-mTLS com HMAC e validação do IP oficial; antes de liberar a entrega, o servidor consulta novamente a cobrança na API Pix.</p></div></CardContent></Card>
                </div>
                <div className="grid gap-5 xl:grid-cols-2">
                  <Card className="rounded-[24px] border-black/5 shadow-none"><CardHeader><div className="flex items-start justify-between gap-3"><div><CardTitle className="font-display text-xl">API Pix · Mercado Pago</CardTitle><CardDescription className="mt-2">Deixe campos vazios para manter os valores já cadastrados.</CardDescription></div><StatusBadge value={data.readiness.mercadoPagoConfigured ? "configured" : "missing"} /></div></CardHeader><CardContent className="space-y-4"><Field label="Access Token"><Input type="password" autoComplete="new-password" value={mercadoPagoSecrets.accessToken} onChange={(event) => setMercadoPagoSecrets({ ...mercadoPagoSecrets, accessToken: event.target.value })} placeholder="APP_USR-..." /></Field><Field label="Segredo de assinatura do webhook"><Input type="password" autoComplete="new-password" value={mercadoPagoSecrets.webhookSecret} onChange={(event) => setMercadoPagoSecrets({ ...mercadoPagoSecrets, webhookSecret: event.target.value })} placeholder="Assinatura secreta do webhook" /></Field><div className="flex flex-wrap justify-end gap-2"><Button type="button" variant="outline" className="rounded-full text-destructive" disabled={financialBusy || !data.readiness.mercadoPagoConfigured || financialReason.trim().length < 8} onClick={() => void removePaymentSecrets("mercado_pago")}><Trash2 /> Remover</Button><Button type="button" className="rounded-full" disabled={financialBusy || financialReason.trim().length < 8 || !Object.values(mercadoPagoSecrets).some((value) => value.trim())} onClick={() => void savePaymentSecrets("mercado_pago")}><KeyRound /> Salvar credenciais</Button></div></CardContent></Card>
                  <Card className="rounded-[24px] border-black/5 shadow-none"><CardHeader><div className="flex items-start justify-between gap-3"><div><CardTitle className="font-display text-xl">API Pix · Efí Bank</CardTitle><CardDescription className="mt-2">OAuth, chave Pix, certificado P12 e proteção do webhook.</CardDescription></div><StatusBadge value={data.readiness.efiConfigured ? "configured" : "missing"} /></div></CardHeader><CardContent className="grid gap-4 sm:grid-cols-2"><Field label="Client ID"><Input type="password" value={efiSecrets.clientId} onChange={(event) => setEfiSecrets({ ...efiSecrets, clientId: event.target.value })} /></Field><Field label="Client Secret"><Input type="password" value={efiSecrets.clientSecret} onChange={(event) => setEfiSecrets({ ...efiSecrets, clientSecret: event.target.value })} /></Field><Field label="Chave Pix"><Input type="password" value={efiSecrets.pixKey} onChange={(event) => setEfiSecrets({ ...efiSecrets, pixKey: event.target.value })} /></Field><Field label="Senha do certificado (se houver)"><Input type="password" value={efiSecrets.certificatePassphrase} onChange={(event) => setEfiSecrets({ ...efiSecrets, certificatePassphrase: event.target.value })} /></Field><div className="sm:col-span-2"><Field label="Certificado P12 em Base64"><Textarea value={efiSecrets.certificateP12Base64} onChange={(event) => setEfiSecrets({ ...efiSecrets, certificateP12Base64: event.target.value })} className="min-h-24 font-mono text-xs" placeholder="Cole somente o conteúdo Base64 do certificado" /></Field></div><Field label="Token adicional do webhook"><Input type="password" value={efiSecrets.webhookToken} onChange={(event) => setEfiSecrets({ ...efiSecrets, webhookToken: event.target.value })} /></Field><Field label="Segredo do gateway mTLS"><Input type="password" value={efiSecrets.webhookMtlsGatewaySecret} onChange={(event) => setEfiSecrets({ ...efiSecrets, webhookMtlsGatewaySecret: event.target.value })} /></Field><div className="flex flex-wrap justify-end gap-2 sm:col-span-2"><Button type="button" variant="outline" className="rounded-full text-destructive" disabled={financialBusy || !data.readiness.efiConfigured || financialReason.trim().length < 8} onClick={() => void removePaymentSecrets("efi")}><Trash2 /> Remover</Button><Button type="button" className="rounded-full" disabled={financialBusy || financialReason.trim().length < 8 || !Object.values(efiSecrets).some((value) => value.trim())} onClick={() => void savePaymentSecrets("efi")}><KeyRound /> Salvar credenciais</Button></div></CardContent></Card>
                </div>
                <Card className="rounded-[24px] border-black/5 shadow-none"><CardHeader><CardTitle className="font-display text-xl">Motivo da alteração financeira</CardTitle><CardDescription>Obrigatório para preço, gateway e credenciais. O texto fica registrado na auditoria.</CardDescription></CardHeader><CardContent><Textarea value={financialReason} onChange={(event) => setFinancialReason(event.target.value)} minLength={8} maxLength={300} placeholder="Ex.: atualizar o preço da oferta e ativar o Mercado Pago em produção" /></CardContent></Card>
              </TabsContent>

              <TabsContent value="integrations" className="space-y-5">
                <SectionTitle title="APIs e modelos de geração" description="A Kie.ai fornece o GPT para a letra e o Suno para a música. A chave fica criptografada e nunca volta ao navegador." />
                <div className="grid gap-5 xl:grid-cols-2">
                  <IntegrationCard icon={WandSparkles} title="Letra da música" provider="GPT através da Kie.ai" ready={data.readiness.kieKeyConfigured} gate={data.readiness.kieLyricsLiveGateEnabled} onTest={() => void testIntegration("kie")} testing={testing === "kie"}>
                    <Field label="Modo"><NativeSelect className="h-11 w-full" value={settings.lyricsMode} onChange={(event) => setSettings({ ...settings, lyricsMode: event.target.value as Settings["lyricsMode"] })}><NativeSelectOption value="mock">Simulação local</NativeSelectOption><NativeSelectOption value="kie">Kie.ai GPT ao vivo</NativeSelectOption></NativeSelect></Field>
                    <Field label="Modelo GPT"><NativeSelect className="h-11 w-full" value={settings.lyricsModel} onChange={(event) => setSettings({ ...settings, lyricsModel: event.target.value as Settings["lyricsModel"] })}><NativeSelectOption value="gpt-5-6-luna">GPT-5.6 Luna · econômico</NativeSelectOption><NativeSelectOption value="gpt-5-6-terra">GPT-5.6 Terra · equilibrado</NativeSelectOption><NativeSelectOption value="gpt-5-6-sol">GPT-5.6 Sol · premium</NativeSelectOption><NativeSelectOption value="gpt-6-astra">GPT-6 Astra · máxima qualidade</NativeSelectOption></NativeSelect></Field>
                    <Field label="Raciocínio"><NativeSelect className="h-11 w-full" value={settings.lyricsReasoningEffort} onChange={(event) => setSettings({ ...settings, lyricsReasoningEffort: event.target.value as Settings["lyricsReasoningEffort"] })}><NativeSelectOption value="low">Baixo · recomendado</NativeSelectOption><NativeSelectOption value="medium">Médio</NativeSelectOption><NativeSelectOption value="high">Alto</NativeSelectOption><NativeSelectOption value="xhigh">Muito alto</NativeSelectOption></NativeSelect></Field>
                  </IntegrationCard>
                  <IntegrationCard icon={Music2} title="Música completa" provider="Suno através da Kie.ai" ready={data.readiness.kieKeyConfigured} gate={data.readiness.kieLiveGateEnabled} onTest={() => void testIntegration("kie")} testing={testing === "kie"}>
                    <Field label="Modo"><NativeSelect className="h-11 w-full" value={settings.musicMode} onChange={(event) => setSettings({ ...settings, musicMode: event.target.value as Settings["musicMode"] })}><NativeSelectOption value="mock">Simulação local</NativeSelectOption><NativeSelectOption value="live">Kie.ai ao vivo</NativeSelectOption></NativeSelect></Field>
                    <Field label="Modelo Suno"><NativeSelect className="h-11 w-full" value={settings.musicModel} onChange={(event) => setSettings({ ...settings, musicModel: event.target.value })}><NativeSelectOption value="V6">Suno V6 · recomendado</NativeSelectOption><NativeSelectOption value="V6_MINI">Suno V6 Mini</NativeSelectOption><NativeSelectOption value="V6_WILD">Suno V6 Wild</NativeSelectOption><NativeSelectOption value="V5_5">Suno V5.5 · legado</NativeSelectOption><NativeSelectOption value="V5">Suno V5 · legado</NativeSelectOption></NativeSelect></Field>
                    <div className="rounded-xl bg-[#f6f3f4] p-4 text-sm leading-6 text-muted-foreground">A voz masculina ou feminina escolhida pelo cliente é enviada como parâmetro vocal, junto com o estilo musical e a letra aprovada.</div>
                  </IntegrationCard>
                </div>
                <Card className="rounded-[24px] border-black/5 shadow-none">
                  <CardHeader><div className="flex items-start justify-between gap-4"><div><CardTitle className="flex items-center gap-2 font-display text-xl"><KeyRound className="size-5 text-[#8f2854]" /> Chave API da Kie.ai</CardTitle><CardDescription className="mt-2">Uma única chave atende à criação da letra com GPT e à geração musical com Suno.</CardDescription></div><StatusBadge value={data.readiness.kieKeyConfigured ? "configured" : "missing"} /></div></CardHeader>
                  <CardContent className="space-y-4">
                    <Field label={data.readiness.kieKeyConfigured ? "Substituir chave atual" : "Inserir chave API"}><Input type="password" autoComplete="new-password" value={kieApiKey} onChange={(event) => setKieApiKey(event.target.value)} maxLength={512} placeholder={data.readiness.kieKeyConfigured ? "Cole uma nova chave para substituir" : "Cole aqui a chave criada em kie.ai/api-key"} /></Field>
                    <Field label="Motivo da alteração"><Textarea value={secretReason} onChange={(event) => setSecretReason(event.target.value)} minLength={8} maxLength={300} placeholder="Ex.: configurar a chave de produção da Kie.ai" /></Field>
                    <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4"><p className="max-w-2xl text-xs leading-5 text-muted-foreground">A chave é enviada apenas ao servidor, guardada no Supabase Vault com criptografia autenticada e nunca é exibida novamente.</p><div className="flex gap-2">{data.readiness.kieKeyConfigured && <Button type="button" variant="outline" className="rounded-full text-destructive" disabled={secretBusy || secretReason.trim().length < 8} onClick={() => setRemoveSecretOpen(true)}>Remover chave</Button>}<Button type="button" className="rounded-full bg-[#7e2148]" disabled={secretBusy || kieApiKey.trim().length < 16 || secretReason.trim().length < 8} onClick={() => void saveKieSecret()}>{secretBusy ? <LoaderCircle className="animate-spin" /> : <KeyRound />} Salvar chave</Button></div></div>
                  </CardContent>
                </Card>
                <Card className="rounded-[24px] border-black/5 shadow-none">
                  <CardHeader><div className="flex items-start justify-between gap-4"><div><CardTitle className="flex items-center gap-2 font-display text-xl"><ShieldCheck className="size-5 text-[#8f2854]" /> HMAC dos callbacks da Kie.ai</CardTitle><CardDescription className="mt-2">Protege o recebimento das músicas contra callbacks falsos. Gere o webhookHmacKey nas configurações oficiais da Kie.ai.</CardDescription></div><StatusBadge value={data.readiness.kieWebhookHmacConfigured ? "configured" : "missing"} /></div></CardHeader>
                  <CardContent className="space-y-4">
                    <Field label={data.readiness.kieWebhookHmacConfigured ? "Substituir HMAC atual" : "Inserir webhookHmacKey"}><Input type="password" autoComplete="new-password" value={webhookHmacKey} onChange={(event) => setWebhookHmacKey(event.target.value)} maxLength={512} placeholder="Cole o webhookHmacKey gerado nas configurações da Kie.ai" /></Field>
                    <Field label="Motivo da alteração"><Textarea value={webhookReason} onChange={(event) => setWebhookReason(event.target.value)} minLength={8} maxLength={300} placeholder="Ex.: proteger os callbacks da geração musical em produção" /></Field>
                    <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4"><p className="max-w-2xl text-xs leading-5 text-muted-foreground">O HMAC fica criptografado no Supabase Vault, nunca é exibido novamente e precisa ser o mesmo configurado pela Kie.ai.</p><div className="flex gap-2">{data.readiness.kieWebhookHmacConfigured && <Button type="button" variant="outline" className="rounded-full text-destructive" disabled={webhookBusy || webhookReason.trim().length < 8} onClick={() => setRemoveWebhookOpen(true)}>Remover HMAC</Button>}<Button type="button" className="rounded-full bg-[#7e2148]" disabled={webhookBusy || webhookHmacKey.trim().length < 32 || webhookReason.trim().length < 8} onClick={() => void saveWebhookSecret()}>{webhookBusy ? <LoaderCircle className="animate-spin" /> : <ShieldCheck />} Salvar HMAC</Button></div></div>
                  </CardContent>
                </Card>
                <Card className="rounded-[24px] border-black/5 shadow-none"><CardHeader><CardTitle className="font-display text-xl">Confirmar alteração operacional</CardTitle><CardDescription>O motivo protege a operação e aparece na trilha de auditoria.</CardDescription></CardHeader><CardContent className="space-y-4"><Textarea value={settingsReason} onChange={(event) => setSettingsReason(event.target.value)} minLength={8} maxLength={300} placeholder="Ex.: usar GPT-5.6 Terra para equilibrar qualidade e custo no piloto" /><div className="flex justify-end"><Button className="rounded-full bg-[#7e2148]" disabled={busy || settingsReason.trim().length < 8} onClick={() => void saveSettings()}>{busy ? <LoaderCircle className="animate-spin"/> : <Settings2 />} Salvar configurações</Button></div></CardContent></Card>
              </TabsContent>

              <TabsContent value="audit" className="space-y-5"><SectionTitle title="Trilha de auditoria" description="Últimas ações sensíveis realizadas por administradores." /><DataTable headers={["Ação","Destino","Motivo","Data"]} empty={data.audit.length === 0} emptyLabel="Nenhuma ação administrativa registrada.">{data.audit.map((row) => <TableRow key={row.id}><TableCell><Badge variant="outline">{humanAction(row.action)}</Badge></TableCell><TableCell><p>{row.target_type}</p><p className="max-w-44 truncate font-mono text-xs text-muted-foreground">{row.target_id ?? "—"}</p></TableCell><TableCell className="max-w-md whitespace-normal leading-6">{row.reason}</TableCell><TableCell>{dateTime(row.created_at)}</TableCell></TableRow>)}</DataTable></TabsContent>
            </Tabs>
          )}
        </section>
      </div>

      <Dialog open={Boolean(assetGeneration)} onOpenChange={(open) => !open && closeGenerationAssets()}>
        <DialogContent className="max-h-[88vh] overflow-y-auto rounded-[24px] sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">Áudios da geração</DialogTitle>
            <DialogDescription>
              {assetGeneration ? `${assetGeneration.recipientName} · ${assetGeneration.provider} · ${statusLabel(assetGeneration.status)}` : ""}. O acesso é temporário e fica registrado na auditoria.
            </DialogDescription>
          </DialogHeader>

          {generationAssets.length === 0 && (
            <div className="mt-5 space-y-4">
              <Field label="Motivo do acesso">
                <Textarea minLength={8} maxLength={300} value={assetReason} onChange={(event) => setAssetReason(event.target.value)} placeholder="Ex.: conferir qualidade e preparar a entrega do pedido" />
              </Field>
              {assetError && <p role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">{assetError}</p>}
              <Button type="button" className="w-full rounded-full bg-[#7e2148]" disabled={assetBusy || assetReason.trim().length < 8} onClick={() => void loadGenerationAssets()}>
                {assetBusy ? <LoaderCircle className="animate-spin" /> : <Headphones />} Localizar e abrir áudios
              </Button>
            </div>
          )}

          {generationAssets.length > 0 && (
            <div className="mt-5 space-y-4">
              <p className="rounded-xl bg-[#f6f3f4] px-4 py-3 text-xs leading-5 text-muted-foreground">Os links abaixo expiram em 10 minutos. Atualize o acesso caso um player ou download expire.</p>
              {generationAssets.map((asset) => (
                <article key={asset.versionId} className="rounded-2xl border border-[#ead9df] bg-[#fffaf8] p-4 sm:p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div><Badge variant="outline">{asset.label}</Badge><h3 className="mt-2 font-display text-xl font-bold">{asset.title}</h3><p className="mt-1 text-xs text-muted-foreground">{asset.durationSeconds ? `${Math.floor(asset.durationSeconds / 60)}:${String(asset.durationSeconds % 60).padStart(2, "0")} de duração total` : "Duração não informada"}</p></div>
                    <Music2 className="size-7 text-[#8f2854]" />
                  </div>
                  {asset.previewUrl ? <audio controls preload="metadata" src={asset.previewUrl} className="mt-4 h-12 w-full">Seu navegador não oferece suporte a áudio.</audio> : <p className="mt-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-950">Prévia ainda não armazenada.</p>}
                  <div className="mt-4 flex flex-wrap gap-2">
                    {asset.previewDownloadUrl && <Button asChild size="sm" variant="outline" className="rounded-full"><a href={asset.previewDownloadUrl}><Download /> Baixar prévia</a></Button>}
                    {asset.fullDownloadUrl && <Button asChild size="sm" className="rounded-full bg-[#7e2148]"><a href={asset.fullDownloadUrl}><Download /> Baixar música completa</a></Button>}
                  </div>
                </article>
              ))}
              {assetError && <p role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">{assetError}</p>}
              <div className="flex flex-wrap justify-end gap-2">
                <Button type="button" variant="outline" className="rounded-full" onClick={() => { setGenerationAssets([]); setAssetError(""); }}>Atualizar acesso</Button>
                <Button type="button" className="rounded-full bg-[#7e2148]" onClick={closeGenerationAssets}>Fechar</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(userDialog)} onOpenChange={(open) => !open && setUserDialog(null)}><DialogContent className="rounded-[24px] sm:max-w-xl"><form onSubmit={(event) => void saveUser(event)}><DialogHeader><DialogTitle className="font-display text-2xl">{userDialog === "create" ? "Criar usuário" : "Editar usuário"}</DialogTitle><DialogDescription>Permissões administrativas e de suporte só podem ser alteradas aqui por outro administrador.</DialogDescription></DialogHeader><div className="mt-6 grid gap-4 sm:grid-cols-2"><Field label="Nome"><Input value={userForm.displayName} onChange={(event) => setUserForm({ ...userForm, displayName: event.target.value })} required /></Field><Field label="E-mail"><Input type="email" value={userForm.email} onChange={(event) => setUserForm({ ...userForm, email: event.target.value })} disabled={userDialog === "edit" && selectedUser?.id === data?.currentAdminId} required /></Field><Field label={userDialog === "create" ? "Senha provisória" : "Nova senha (opcional)"}><Input type="password" minLength={8} value={userForm.password} onChange={(event) => setUserForm({ ...userForm, password: event.target.value })} disabled={userDialog === "edit" && selectedUser?.id === data?.currentAdminId} required={userDialog === "create"} /></Field><Field label="Perfil"><NativeSelect className="w-full" value={userForm.role} onChange={(event) => setUserForm({ ...userForm, role: event.target.value as typeof userForm.role })} disabled={userDialog === "edit" && selectedUser?.id === data?.currentAdminId}><NativeSelectOption value="user">Cliente</NativeSelectOption><NativeSelectOption value="support">Suporte</NativeSelectOption><NativeSelectOption value="admin">Administrador</NativeSelectOption></NativeSelect></Field>{userDialog === "edit" && <Field label="Status"><NativeSelect className="w-full" value={userForm.status} onChange={(event) => setUserForm({ ...userForm, status: event.target.value as typeof userForm.status })} disabled={selectedUser?.id === data?.currentAdminId}><NativeSelectOption value="active">Ativo</NativeSelectOption><NativeSelectOption value="suspended">Suspenso</NativeSelectOption></NativeSelect></Field>}{userDialog === "edit" && selectedUser?.id === data?.currentAdminId && <p className="sm:col-span-2 rounded-xl bg-[#f6f3f4] p-3 text-xs leading-5 text-muted-foreground">Para manter esta sessão segura, altere aqui somente o nome. E-mail, senha, perfil e status da sua própria conta ficam protegidos.</p>}<div className="sm:col-span-2"><Field label="Motivo da ação"><Textarea minLength={8} maxLength={300} value={userForm.reason} onChange={(event) => setUserForm({ ...userForm, reason: event.target.value })} placeholder="Ex.: cadastro solicitado pelo atendimento" required /></Field></div></div><DialogFooter className="mt-6"><Button type="button" variant="outline" onClick={() => setUserDialog(null)}>Cancelar</Button><Button type="submit" className="bg-[#7e2148]" disabled={busy}>{busy && <LoaderCircle className="animate-spin"/>} Salvar usuário</Button></DialogFooter></form></DialogContent></Dialog>

      <AlertDialog open={Boolean(deleteUser)} onOpenChange={(open) => !open && setDeleteUser(null)}><AlertDialogContent className="rounded-[24px]"><AlertDialogHeader><AlertDialogTitle>Excluir a conta de {deleteUser?.displayName || deleteUser?.email}?</AlertDialogTitle><AlertDialogDescription>O login será invalidado e os dados pessoais da autenticação serão removidos. Pedidos, pagamentos e gerações permanecerão no histórico operacional.</AlertDialogDescription></AlertDialogHeader><Textarea value={deleteReason} onChange={(event) => setDeleteReason(event.target.value)} minLength={12} maxLength={300} placeholder="Informe o motivo da exclusão" /><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction variant="destructive" disabled={busy || deleteReason.trim().length < 12} onClick={() => void confirmDelete()}>{busy ? <LoaderCircle className="animate-spin"/> : <Trash2 />} Excluir conta</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
      <AlertDialog open={removeSecretOpen} onOpenChange={setRemoveSecretOpen}><AlertDialogContent className="rounded-[24px]"><AlertDialogHeader><AlertDialogTitle>Remover a chave da Kie.ai?</AlertDialogTitle><AlertDialogDescription>A criação real de letras e músicas ficará indisponível até que outra chave seja cadastrada. A simulação local continuará funcionando.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction variant="destructive" disabled={secretBusy || secretReason.trim().length < 8} onClick={() => void removeKieSecret()}>{secretBusy ? <LoaderCircle className="animate-spin" /> : <Trash2 />} Remover chave</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
      <AlertDialog open={removeWebhookOpen} onOpenChange={setRemoveWebhookOpen}><AlertDialogContent className="rounded-[24px]"><AlertDialogHeader><AlertDialogTitle>Remover o HMAC da Kie.ai?</AlertDialogTitle><AlertDialogDescription>Callbacks reais serão bloqueados até que o webhookHmacKey correto seja cadastrado novamente.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction variant="destructive" disabled={webhookBusy || webhookReason.trim().length < 8} onClick={() => void removeWebhookSecret()}>{webhookBusy ? <LoaderCircle className="animate-spin" /> : <Trash2 />} Remover HMAC</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    </main>
  );
}

const periodOptions: Array<{ value: PeriodRange; label: string }> = [
  { value: "today", label: "Hoje" },
  { value: "yesterday", label: "Ontem" },
  { value: "7d", label: "7 dias" },
  { value: "15d", label: "15 dias" },
  { value: "30d", label: "30 dias" },
  { value: "custom", label: "Personalizado" },
];

function PeriodFilter({ range, from, to, maxDate, label, busy, onSelect, onFromChange, onToChange, onApply }: {
  range: PeriodRange;
  from: string;
  to: string;
  maxDate: string;
  label: string;
  busy: boolean;
  onSelect: (range: PeriodRange) => void;
  onFromChange: (value: string) => void;
  onToChange: (value: string) => void;
  onApply: () => void;
}) {
  return (
    <Card className="rounded-[22px] border-black/5 bg-white shadow-none">
      <CardContent className="flex flex-col gap-4 px-5 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-sm font-bold">Período dos indicadores</p>
            <p className="mt-1 text-xs text-muted-foreground">Exibindo: {label}</p>
          </div>
          {busy && <span className="inline-flex items-center gap-2 text-xs font-semibold text-[#8f2854]"><LoaderCircle className="size-4 animate-spin" /> Atualizando dados</span>}
        </div>
        <div role="group" aria-label="Selecionar período dos gráficos" className="flex flex-wrap gap-2">
          {periodOptions.map((option) => (
            <Button
              key={option.value}
              type="button"
              size="sm"
              variant={range === option.value ? "default" : "outline"}
              aria-pressed={range === option.value}
              className={range === option.value ? "rounded-full bg-[#7e2148] hover:bg-[#681a3b]" : "rounded-full"}
              disabled={busy}
              onClick={() => onSelect(option.value)}
            >
              {option.label}
            </Button>
          ))}
        </div>
        {range === "custom" && (
          <div className="grid gap-3 rounded-2xl border border-[#ead9df] bg-[#fbf8f9] p-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
            <Field label="Data inicial"><Input type="date" value={from} max={to || maxDate} onChange={(event) => onFromChange(event.target.value)} /></Field>
            <Field label="Data final"><Input type="date" value={to} min={from} max={maxDate} onChange={(event) => onToChange(event.target.value)} /></Field>
            <Button type="button" className="bg-[#7e2148] sm:h-9" disabled={busy || !from || !to || from > to} onClick={onApply}>{busy ? <LoaderCircle className="animate-spin" /> : <RefreshCw />} Aplicar</Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Tab({ value, icon: Icon, label }: { value: AdminTab; icon: typeof LayoutDashboard; label: string }) { return <TabsTrigger value={value} className="rounded-xl px-3 py-2"><Icon /> {label}</TabsTrigger>; }
function Metric({ icon: Icon, label, value, detail, accent = false }: { icon: typeof Activity; label: string; value: string; detail: string; accent?: boolean }) { return <Card className={`rounded-[22px] border-black/5 shadow-none ${accent ? "bg-[#351521] text-white" : "bg-white"}`}><CardContent className="px-5"><div className={`grid size-10 place-items-center rounded-xl ${accent ? "bg-white/10" : "bg-[#f7e7ed] text-[#8f2854]"}`}><Icon className="size-5" /></div><p className={`mt-5 text-sm font-semibold ${accent ? "text-white/60" : "text-muted-foreground"}`}>{label}</p><p className="mt-1 font-display text-3xl font-bold">{value}</p><p className={`mt-1 text-xs ${accent ? "text-white/50" : "text-muted-foreground"}`}>{detail}</p></CardContent></Card>; }
function MiniStat({ label, value, detail }: { label: string; value: string; detail: string }) { return <div className="rounded-[20px] border border-black/5 bg-white p-5"><p className="text-sm text-muted-foreground">{label}</p><p className="mt-2 font-display text-2xl font-bold">{value}</p><p className="mt-1 text-xs text-muted-foreground">{detail}</p></div>; }
function SectionTitle({ title, description, action }: { title: string; description: string; action?: React.ReactNode }) { return <div className="flex flex-wrap items-end justify-between gap-4"><div><h2 className="font-display text-2xl font-bold">{title}</h2><p className="mt-1 max-w-3xl text-sm text-muted-foreground">{description}</p></div>{action}</div>; }
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="block space-y-2 text-sm font-semibold"><span>{label}</span>{children}</label>; }
function DataTable({ headers, children, empty = false, emptyLabel = "Nenhum registro encontrado." }: { headers: string[]; children: React.ReactNode; empty?: boolean; emptyLabel?: string }) { return <Card className="rounded-[24px] border-black/5 shadow-none"><CardContent className="px-4 sm:px-6"><Table><TableHeader><TableRow>{headers.map((header) => <TableHead key={header}>{header}</TableHead>)}</TableRow></TableHeader><TableBody>{empty ? <TableRow><TableCell colSpan={headers.length} className="h-28 text-center text-muted-foreground">{emptyLabel}</TableCell></TableRow> : children}</TableBody></Table></CardContent></Card>; }
function IntegrationCard({ icon: Icon, title, provider, ready, gate, testing, onTest, children }: { icon: typeof Bot; title: string; provider: string; ready: boolean; gate: boolean; testing: boolean; onTest: () => void; children: React.ReactNode }) { return <Card className="rounded-[24px] border-black/5 shadow-none"><CardHeader><div className="flex items-start justify-between gap-4"><div className="flex gap-3"><div className="grid size-11 place-items-center rounded-xl bg-[#f7e7ed] text-[#8f2854]"><Icon className="size-5"/></div><div><CardTitle className="font-display text-xl">{title}</CardTitle><CardDescription className="mt-1">{provider}</CardDescription></div></div><StatusBadge value={ready && gate ? "ready" : ready ? "configured" : "missing"} /></div></CardHeader><CardContent className="space-y-4">{children}<div className="flex items-center justify-between gap-3 border-t pt-4"><p className="text-xs leading-5 text-muted-foreground">{!ready ? "Cadastre a chave da Kie.ai abaixo." : !gate ? "Chave presente; uso ao vivo bloqueado pelo ambiente." : "Credencial pronta para uso."}</p><Button variant="outline" size="sm" className="shrink-0 rounded-full" disabled={testing || !ready} onClick={onTest}>{testing ? <LoaderCircle className="animate-spin"/> : <RefreshCw/>} Testar</Button></div></CardContent></Card>; }
function StatusBadge({ value }: { value: string }) { const good = ["active","admin","support","confirmed","succeeded","ready","configured"].includes(value); const bad = ["deleted","failed","cancelled","refunded","missing"].includes(value); return <Badge variant={bad ? "destructive" : good ? "default" : "secondary"} className={good ? "bg-emerald-100 text-emerald-900 hover:bg-emerald-100" : ""}>{statusLabel(value)}</Badge>; }
function Empty({ label }: { label: string }) { return <div className="py-12 text-center text-sm text-muted-foreground">{label}</div>; }
function DashboardSkeleton() { return <div className="space-y-6"><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-44 rounded-[22px]" />)}</div><div className="grid gap-5 xl:grid-cols-2"><Skeleton className="h-[380px] rounded-[24px]"/><Skeleton className="h-[380px] rounded-[24px]"/></div></div>; }
function money(cents: number) { return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100); }
function currencyInputToCents(value: string) { const clean = value.trim().replace(/\s/g, "").replace(/^R\$/i, ""); const normalized = clean.includes(",") ? clean.replace(/\./g, "").replace(",", ".") : clean; const amount = Number(normalized); if (!Number.isFinite(amount)) return null; const cents = Math.round(amount * 100); return cents >= 100 && cents <= 1_000_000 ? cents : null; }
function number(value: number) { return new Intl.NumberFormat("pt-BR").format(value); }
function dateTime(value: string) { return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value)); }
function shortDate(value: string) { const [, month, day] = value.split("-"); return `${day}/${month}`; }
function relativeDate(daysAgo: number) { const date = new Date(); date.setHours(12, 0, 0, 0); date.setDate(date.getDate() - daysAgo); return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`; }
function dashboardUrl(range: PeriodRange, from: string, to: string) { const query = new URLSearchParams({ range }); if (range === "custom") { query.set("from", from); query.set("to", to); } return `/api/admin/dashboard?${query.toString()}`; }
function providerLabel(value: string) { return value === "mercado_pago" ? "Mercado Pago" : value === "efi" ? "Efí Bank" : value; }
function statusLabel(value: string) { return ({ user: "Cliente", support: "Suporte", admin: "Administrador", active: "Ativo", suspended: "Suspenso", deleted: "Excluído", created: "Criada", submitted: "Enviada", processing: "Processando", reconciling: "Conciliação", succeeded: "Concluída", failed: "Falhou", pending: "Pendente", confirmed: "Confirmado", cancelled: "Cancelado", refunded: "Reembolsado", ready: "Conectada", configured: "Configurada", missing: "Sem chave", live: "Ao vivo", mock: "Simulação" } as Record<string,string>)[value] ?? value; }
function humanAction(value: string) { return ({ create_user: "Criou usuário", update_user_requested: "Alterou usuário", soft_delete_user_requested: "Excluiu usuário", update_ai_settings_requested: "Alterou modelos", update_financial_settings: "Alterou financeiro", test_integration: "Testou integração", update_api_secret: "Atualizou chave API", delete_api_secret: "Removeu chave API", access_generation_audio: "Acessou áudios da geração" } as Record<string,string>)[value] ?? value; }
