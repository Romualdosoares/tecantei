-- Um ajuste reservado também é uma nova geração. Mantém o pedido no estado
-- correto até que a prévia da versão ajustada seja publicada.

create or replace function public.mark_order_generating_for_reserved_adjustment()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'reserved' and (tg_op = 'INSERT' or old.status is distinct from 'reserved') then
    update public.orders
    set status = 'generating', updated_at = now()
    where id = new.order_id
      and status = 'preview_ready';
  end if;
  return new;
end;
$$;

revoke all on function public.mark_order_generating_for_reserved_adjustment() from public, anon, authenticated;

drop trigger if exists adjustment_request_marks_generation on public.adjustment_requests;
create trigger adjustment_request_marks_generation
after insert or update of status on public.adjustment_requests
for each row execute function public.mark_order_generating_for_reserved_adjustment();

-- Corrige ajustes já reservados antes desta migração, sem tocar em falhas ou
-- tarefas concluídas.
update public.orders as order_record
set status = 'generating', updated_at = now()
from public.adjustment_requests as adjustment
join public.generation_tasks as task on task.id = adjustment.generation_task_id
where order_record.id = adjustment.order_id
  and order_record.status = 'preview_ready'
  and adjustment.status in ('reserved', 'reconciling')
  and task.status in ('created', 'submitting', 'submitted', 'processing', 'reconciling');
