-- O autor sempre pode consultar seu próprio comunicado, mesmo se o público-alvo
-- da categoria não incluir seu perfil. Os demais usuários continuam sujeitos
-- às regras de visibilidade por categoria.
drop policy if exists ann_read on public.announcements;

create policy ann_read on public.announcements for select to authenticated using (
  author_id = auth.uid()
  or case public.my_role()
      when 'diretor' then true
      when 'coordenador' then true
      when 'professor' then category in ('geral','professores')
      else category = 'geral' or (category = 'turma' and turma = (select turma from public.profiles where id = auth.uid()))
    end
);
