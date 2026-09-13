"use client";

import { FormEvent, useState } from "react";
import { AlertTriangle, CheckCircle2, Clock3, Database, RefreshCw, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type DiagnosticRow = Record<string, unknown>;
type Snapshot = {
  order: DiagnosticRow;
  generationTasks: DiagnosticRow[];
  generationOutputs: DiagnosticRow[];
  versions: DiagnosticRow[];
  adjustments: DiagnosticRow[];
  selections: DiagnosticRow[];
  payments: DiagnosticRow[];
  deliveries: DiagnosticRow[];
  costs: DiagnosticRow[];
  recommendations: string[];
  auditedAt: string;
};

export function SupportConsole() {
  const [orderId, setOrderId] = useState("");
  const [reason, setReason] = useState("");
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [reconcilingId, setReconcilingId] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState("");

  const search = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    setActionMessage("");
    setSnapshot(null);
    const response = await fetch(`/api/support/orders/${encodeURIComponent(orderId.trim())}`, {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify({ reason: reason.trim() }),
    }).catch(() => null);
    setBusy(false);
    if (!response?.ok) {
      setError(response?.status === 404 ? "Pedido não encontrado ou acesso indisponível." : "Não foi possível consultar o diagnóstico.");
      return;
    }
    setSnapshot(await response.json() as Snapshot);
  };

  const reconcilePayment = async (payment: DiagnosticRow) => {
    const paymentId = typeof payment.id === "string" ? payment.id : "";
    if (!snapshot || !paymentId || reason.trim().length < 12) {
      setError("Informe um motivo com pelo menos 12 caracteres antes de conciliar.");
      return;
    }
    setReconcilingId(paymentId);
    setError("");
    setActionMessage("");
    const response = await fetch(`/api/support/orders/${encodeURIComponent(String(snapshot.order.id))}/payments/${encodeURIComponent(paymentId)}/reconcile`, {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify({ reason: reason.trim() }),
    }).catch(() => null);
    const data = response ? await response.json().catch(() => null) as { error?: string; storedStatus?: string; duplicate?: boolean; deliveryChangedAutomatically?: boolean } | null : null;
    setReconcilingId(null);
    if (!response?.ok || !data?.storedStatus) {
      setError(data?.error === "payment_provider_not_active"
        ? "O provedor desta cobrança não está ativo neste ambiente. Nenhum estado foi alterado."
        : "Não foi possível conciliar a cobrança. A tentativa ficou registrada na auditoria quando o banco estava disponível.");
      return;
    }
    setSnapshot((current) => current ? {
      ...current,
      payments: current.payments.map((item) => item.id === paymentId ? { ...item, status: data.storedStatus } : item),
    } : current);
    setActionMessage(data.deliveryChangedAutomatically
      ? `Pagamento confirmado e entrega criada com segurança. Consulte novamente o pedido para atualizar toda a linha do tempo.`
      : `Conciliação concluída: estado persistido “${data.storedStatus}”${data.duplicate ? " (evento já processado)" : ""}.`);
  };

  return (
    <div className="mt-9 space-y-6">
      <form onSubmit={(event) => void search(event)} className="grid gap-5 rounded-[28px] border bg-card p-5 shadow-sm sm:p-7 lg:grid-cols-[1fr_1.2fr_auto] lg:items-end">
        <label className="space-y-2 text-sm font-semibold">ID do pedido<Input value={orderId} onChange={(event) => setOrderId(event.target.value)} required placeholder="00000000-0000-0000-0000-000000000000" className="h-12 font-mono text-sm" /></label>
        <label className="space-y-2 text-sm font-semibold">Motivo da consulta<Textarea value={reason} onChange={(event) => setReason(event.target.value)} required minLength={8} maxLength={300} placeholder="Ex.: cliente informou que a prévia não ficou disponível" className="min-h-12 resize-y" /></label>
        <Button type="submit" size="lg" disabled={busy} className="h-12 rounded-full px-6"><Search /> {busy ? "Consultando" : "Consultar"}</Button>
      </form>

      {error && <p role="alert" className="rounded-2xl bg-destructive/10 p-5 text-destructive"><AlertTriangle className="mr-2 inline size-5" />{error}</p>}
      {actionMessage && <p role="status" className="rounded-2xl bg-emerald-100 p-5 text-emerald-900"><CheckCircle2 className="mr-2 inline size-5" />{actionMessage}</p>}

      {snapshot && (
        <div className="space-y-6">
          <section className="rounded-[28px] bg-[#351426] p-6 text-white sm:p-8">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div><p className="text-xs uppercase tracking-widest text-white/55">Pedido</p><p className="mt-2 break-all font-mono text-sm">{String(snapshot.order.id)}</p></div>
              <Badge className="bg-white/10 text-white hover:bg-white/10">{String(snapshot.order.status)}</Badge>
            </div>
            <dl className="mt-7 grid gap-5 border-t border-white/10 pt-6 sm:grid-cols-3">
              <Summary label="Destinatário" value={snapshot.order.recipient_name} />
              <Summary label="Estilo" value={snapshot.order.style} />
              <Summary label="Ajuste" value={snapshot.order.adjustment_status} />
            </dl>
          </section>

          <section className="rounded-[28px] border bg-card p-6 sm:p-8">
            <h2 className="flex items-center gap-2 font-display text-2xl font-semibold"><CheckCircle2 className="size-5 text-primary" /> Próximas verificações seguras</h2>
            <ul className="mt-5 space-y-3">{snapshot.recommendations.map((item) => <li key={item} className="flex gap-3 rounded-xl bg-muted/60 p-4 text-sm leading-6"><Clock3 className="mt-0.5 size-4 shrink-0 text-primary" />{item}</li>)}</ul>
          </section>

          <div className="grid gap-5 lg:grid-cols-2">
            <DataSection title="Gerações" rows={snapshot.generationTasks} />
            <DataSection title="Arquivos" rows={snapshot.generationOutputs} />
            <DataSection title="Versões" rows={snapshot.versions} />
            <DataSection title="Ajustes" rows={snapshot.adjustments} />
            <PaymentSection rows={snapshot.payments} reason={reason} reconcilingId={reconcilingId} onReconcile={reconcilePayment} />
            <DataSection title="Entregas" rows={snapshot.deliveries} />
            <DataSection title="Seleção" rows={snapshot.selections} />
            <DataSection title="Custos" rows={snapshot.costs} />
          </div>
          <p className="text-xs text-muted-foreground">Consulta registrada em {formatValue(snapshot.auditedAt)}. História, pronúncia, letra, tokens e chaves de arquivos não são retornados.</p>
        </div>
      )}
    </div>
  );
}

function PaymentSection({
  rows,
  reason,
  reconcilingId,
  onReconcile,
}: {
  rows: DiagnosticRow[];
  reason: string;
  reconcilingId: string | null;
  onReconcile: (payment: DiagnosticRow) => Promise<void>;
}) {
  return (
    <section className="min-w-0 rounded-[24px] border bg-card p-5">
      <h2 className="flex items-center gap-2 font-display text-xl font-semibold"><Database className="size-4 text-primary" />Pagamentos</h2>
      {rows.length === 0 ? <p className="mt-4 text-sm text-muted-foreground">Nenhum registro.</p> : <div className="mt-4 space-y-3">{rows.map((row, index) => {
        const paymentId = String(row.id ?? index);
        const canReconcile = (row.provider === "efi" || row.provider === "mercado_pago") && typeof row.external_payment_id === "string";
        return <div key={paymentId} className="rounded-xl bg-muted/55 p-4"><dl className="min-w-0 text-xs">{Object.entries(row).map(([key, value]) => <div key={key} className="grid min-w-0 grid-cols-[8rem_minmax(0,1fr)] gap-3 py-1"><dt className="truncate text-muted-foreground">{key}</dt><dd className="min-w-0 break-all font-mono">{formatValue(value)}</dd></div>)}</dl>{canReconcile && <Button type="button" size="sm" variant="outline" className="mt-3 rounded-full" disabled={Boolean(reconcilingId) || reason.trim().length < 12} onClick={() => void onReconcile(row)}>{reconcilingId === paymentId ? <RefreshCw className="animate-spin" /> : <RefreshCw />} Conciliar no provedor</Button>}</div>;
      })}</div>}
      <p className="mt-3 text-xs leading-5 text-muted-foreground">A conciliação apenas consulta a cobrança existente. Ela não cria outro Pix, não reembolsa e não libera áudio manualmente.</p>
    </section>
  );
}

function Summary({ label, value }: { label: string; value: unknown }) {
  return <div><dt className="text-xs uppercase tracking-widest text-white/50">{label}</dt><dd className="mt-1 font-semibold">{formatValue(value)}</dd></div>;
}

function DataSection({ title, rows }: { title: string; rows: DiagnosticRow[] }) {
  return (
    <section className="min-w-0 rounded-[24px] border bg-card p-5">
      <h2 className="flex items-center gap-2 font-display text-xl font-semibold"><Database className="size-4 text-primary" />{title}</h2>
      {rows.length === 0 ? <p className="mt-4 text-sm text-muted-foreground">Nenhum registro.</p> : <div className="mt-4 space-y-3">{rows.map((row, index) => <dl key={String(row.id ?? row.version_id ?? index)} className="min-w-0 rounded-xl bg-muted/55 p-4 text-xs">{Object.entries(row).map(([key, value]) => <div key={key} className="grid min-w-0 grid-cols-[8rem_minmax(0,1fr)] gap-3 py-1"><dt className="truncate text-muted-foreground">{key}</dt><dd className="min-w-0 break-all font-mono">{formatValue(value)}</dd></div>)}</dl>)}</div>}
    </section>
  );
}

function formatValue(value: unknown) {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}T/.test(value)) {
    return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
  }
  return String(value);
}
