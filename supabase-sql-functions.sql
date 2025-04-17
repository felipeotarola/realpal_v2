-- Funktion för att hämta kolumninformation
CREATE OR REPLACE FUNCTION get_columns_info(table_name text)
RETURNS TABLE (
  column_name text,
  data_type text
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    columns.column_name::text,
    columns.data_type::text
  FROM 
    information_schema.columns
  WHERE 
    table_name = get_columns_info.table_name
    AND table_schema = 'public';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Funktion för att köra SQL
CREATE OR REPLACE FUNCTION run_sql(sql text)
RETURNS void AS $$
BEGIN
  EXECUTE sql;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
