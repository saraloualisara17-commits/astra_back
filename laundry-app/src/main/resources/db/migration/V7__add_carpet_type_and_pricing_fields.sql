-- V7: Add carpet_type catalogue table and pricing dimension fields to commande_tapis

CREATE TABLE carpet_type (
    id          BIGINT AUTO_INCREMENT PRIMARY KEY,
    nom         VARCHAR(100) NOT NULL,
    prix_par_m2 DECIMAL(10, 2) NOT NULL,
    actif       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at  DATETIME,
    updated_at  DATETIME
);

-- Add size-based pricing fields to commande_tapis
ALTER TABLE commande_tapis
    ADD COLUMN largeur         DECIMAL(10, 2)  NULL COMMENT 'Largeur du tapis en mètres',
    ADD COLUMN hauteur         DECIMAL(10, 2)  NULL COMMENT 'Hauteur du tapis en mètres',
    ADD COLUMN prix_calcule    DECIMAL(10, 2)  NULL COMMENT 'Prix calculé automatiquement (largeur × hauteur × priceParM2)',
    ADD COLUMN prix_final      DECIMAL(10, 2)  NULL COMMENT 'Prix final après éventuelle modification manuelle',
    ADD COLUMN mode_tarification VARCHAR(20)   NULL COMMENT 'SIZE_BASED ou MANUAL';
