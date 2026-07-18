-- Repair get_public_waste_map after environment_reports.status became the
-- report_status enum. The public map should omit rejected reports.

create or replace function public.get_public_waste_map(
  min_lng double precision,
  min_lat double precision,
  max_lng double precision,
  max_lat double precision,
  requested_zoom double precision,
  observed_since timestamptz,
  requested_waste_type text default null
)
returns table (
  mode text,
  feature_id text,
  geometry jsonb,
  properties jsonb
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  viewport extensions.geometry;
begin
  if min_lng >= max_lng or min_lat >= max_lat
    or min_lng < -180 or max_lng > 180
    or min_lat < -90 or max_lat > 90
    or requested_zoom < 0 or requested_zoom > 22 then
    raise exception 'Invalid map viewport';
  end if;

  viewport := extensions.st_makeenvelope(min_lng, min_lat, max_lng, max_lat, 4326);

  if requested_zoom < 12 then
    return query
    select
      'heatmap'::text,
      concat(round(report.longitude, 2), ':', round(report.latitude, 2)),
      jsonb_build_object(
        'type', 'Point',
        'coordinates', jsonb_build_array(
          avg(report.longitude)::double precision,
          avg(report.latitude)::double precision
        )
      ),
      jsonb_build_object(
        'count', count(*)::integer,
        'averageScore', round(avg(report.dirtiness_score), 2)
      )
    from public.environment_reports report
    where report.observed_at >= observed_since
      and report.location OPERATOR(extensions.&&) viewport
      and report.status <> 'REJECTED'::public.report_status
      and (requested_waste_type is null or report.waste_type::text = requested_waste_type)
    group by round(report.longitude, 2), round(report.latitude, 2);
  else
    return query
    select
      'reports'::text,
      report.id::text,
      jsonb_build_object(
        'type', 'Point',
        'coordinates', jsonb_build_array(
          round(report.longitude, 3)::double precision,
          round(report.latitude, 3)::double precision
        )
      ),
      jsonb_build_object(
        'score', report.dirtiness_score,
        'wasteType', report.waste_type::text,
        'status', report.status,
        'observedAt', report.observed_at
      )
    from public.environment_reports report
    where report.observed_at >= observed_since
      and report.location OPERATOR(extensions.&&) viewport
      and report.status <> 'REJECTED'::public.report_status
      and (requested_waste_type is null or report.waste_type::text = requested_waste_type);
  end if;
end;
$$;

revoke all on function public.get_public_waste_map(
  double precision,
  double precision,
  double precision,
  double precision,
  double precision,
  timestamptz,
  text
) from public;

grant execute on function public.get_public_waste_map(
  double precision,
  double precision,
  double precision,
  double precision,
  double precision,
  timestamptz,
  text
) to anon, authenticated;
