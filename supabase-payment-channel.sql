-- "Jenis closing" — how a payment (mainly seat-lock/closing) actually
-- happened: 'web' (paid through the online portal), 'danacita' (financed
-- via Dana Cita), or 'manual' (CRO recorded it manually, e.g. bank
-- transfer). Was previously a free-text payment_method column that only
-- ever held 'Transfer' — normalize existing rows before constraining it,
-- otherwise a dropdown that doesn't list 'Transfer' would silently reset
-- it to the first option on the next edit (the same class of bug already
-- fixed once in lead-form.tsx's status dropdown).

update public.payments
set payment_method = 'manual'
where payment_method is null or payment_method not in ('web', 'danacita', 'manual');

alter table public.payments
drop constraint if exists payments_payment_method_check;

alter table public.payments
add constraint payments_payment_method_check check (payment_method in ('web', 'danacita', 'manual'));
