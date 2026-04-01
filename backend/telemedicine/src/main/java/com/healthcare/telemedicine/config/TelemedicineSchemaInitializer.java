package com.healthcare.telemedicine.config;

import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Component
public class TelemedicineSchemaInitializer {

    private static final Logger LOGGER = LoggerFactory.getLogger(TelemedicineSchemaInitializer.class);
    private final JdbcTemplate jdbcTemplate;

    public TelemedicineSchemaInitializer(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @PostConstruct
    public void ensureConsultationStatusConstraint() {
        try {
            String tableExists = "SELECT to_regclass('telemedicine_schema.telemedicine_consultation')";
            String tableName = jdbcTemplate.queryForObject(tableExists, String.class);
            if (tableName == null) {
                LOGGER.warn("Telemedicine consultation table does not exist yet; status constraint cannot be verified.");
                return;
            }

            String constraintExists = "SELECT conname FROM pg_constraint c "
                    + "JOIN pg_class t ON t.oid = c.conrelid "
                    + "JOIN pg_namespace n ON n.oid = t.relnamespace "
                    + "WHERE n.nspname = 'telemedicine_schema' "
                    + "AND t.relname = 'telemedicine_consultation' "
                    + "AND c.contype = 'c' "
                    + "AND c.conname = 'telemedicine_consultation_status_check'";
            var constraintNames = jdbcTemplate.query(constraintExists, (rs, rowNum) -> rs.getString("conname"));
            if (constraintNames.isEmpty()) {
                createStatusConstraint();
                return;
            }

            String checkDefSql = "SELECT pg_get_constraintdef(c.oid) FROM pg_constraint c "
                    + "JOIN pg_class t ON t.oid = c.conrelid "
                    + "JOIN pg_namespace n ON n.oid = t.relnamespace "
                    + "WHERE n.nspname = 'telemedicine_schema' "
                    + "AND t.relname = 'telemedicine_consultation' "
                    + "AND c.conname = 'telemedicine_consultation_status_check'";
            var defs = jdbcTemplate.query(checkDefSql, (rs, rowNum) -> rs.getString(1));
            String checkDef = defs.isEmpty() ? null : defs.get(0);
            if (checkDef == null || !checkDef.contains("'SCHEDULED'")) {
                LOGGER.info("Updating telemedicine_consultation_status_check constraint to include current ConsultationStatus values.");
                recreateStatusConstraint();
            } else {
                LOGGER.info("Telemedicine consultation status constraint is up to date.");
            }
        } catch (Exception ex) {
            LOGGER.warn("Unable to verify or update telemedicine consultation status constraint.", ex);
        }
    }

    private void createStatusConstraint() {
        String sql = "ALTER TABLE telemedicine_schema.telemedicine_consultation "
                + "ADD CONSTRAINT telemedicine_consultation_status_check "
                + "CHECK (status IN ('CREATED','SCHEDULED','LIVE','ENDED','CANCELLED'))";
        jdbcTemplate.execute(sql);
        LOGGER.info("Created telemedicine_consultation_status_check constraint.");
    }

    private void recreateStatusConstraint() {
        String dropSql = "ALTER TABLE telemedicine_schema.telemedicine_consultation "
                + "DROP CONSTRAINT IF EXISTS telemedicine_consultation_status_check";
        jdbcTemplate.execute(dropSql);
        createStatusConstraint();
    }
}
