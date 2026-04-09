package com.wash.laundry_app.carpettype;

import java.math.BigDecimal;

public class CarpetTypeDTO {

    private Long id;
    private String nom;
    private BigDecimal prixParM2;
    private Boolean actif;

    public CarpetTypeDTO() {}

    public CarpetTypeDTO(Long id, String nom, BigDecimal prixParM2, Boolean actif) {
        this.id = id;
        this.nom = nom;
        this.prixParM2 = prixParM2;
        this.actif = actif;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getNom() { return nom; }
    public void setNom(String nom) { this.nom = nom; }
    public BigDecimal getPrixParM2() { return prixParM2; }
    public void setPrixParM2(BigDecimal prixParM2) { this.prixParM2 = prixParM2; }
    public Boolean getActif() { return actif; }
    public void setActif(Boolean actif) { this.actif = actif; }
}
