const sqlCreateFunction = (channel, schema, fn) => {
    return `
        CREATE OR REPLACE FUNCTION ${schema}.${fn}() RETURNS trigger AS $$
        DECLARE
          data json;
          prev json;
          notification json;
        BEGIN

          CASE TG_OP
            WHEN 'INSERT' THEN
              data = row_to_json(NEW);

            WHEN 'UPDATE' THEN
              prev = row_to_json(OLD);
              data = row_to_json(NEW);
              
            WHEN 'DELETE' THEN
              prev = row_to_json(OLD);
          END

          notification = json_build_object(
            'type', TG_OP,
            'dateTime', clock_timestamp(),
            'table', TG_TABLE_NAME::text,
            'schema', TG_TABLE_SCHEMA::text,
            'data', data,
            'prev', prev
          );

          PERFORM pg_notify('${channel}', notification::text);
          RETURN NULL;
        END;
        $$ LANGUAGE plpgsql;
        `;
};

module.exports = (channel, schema, functionName) => async client => {
    await client.query(sqlCreateFunction(channel, schema, functionName));
};