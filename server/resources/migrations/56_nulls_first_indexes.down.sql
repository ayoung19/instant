create index if not exists triples_number_type_idx_no_e on triples (
    app_id,
    attr_id,
    triples_extract_number_value(value)
  )
  where ave and checked_data_type = 'number';
drop index triples_number_type_idx;
alter index triples_number_type_idx_no_e rename to triples_number_type_idx;

create index if not exists triples_boolean_type_idx_no_e on triples (
    app_id,
    attr_id,
    triples_extract_boolean_value(value)
  )
  where ave and checked_data_type = 'boolean';
drop index triples_boolean_type_idx;
alter index triples_boolean_type_idx_no_e rename to triples_boolean_type_idx;

create index if not exists triples_date_type_idx_no_e on triples (
    app_id,
    attr_id,
    triples_extract_date_value(value)
  )
  where ave and checked_data_type = 'date';
drop index triples_date_type_idx;
alter index triples_date_type_idx_no_e rename to triples_date_type_idx;
