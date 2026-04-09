package com.wash.laundry_app.command;

import com.wash.laundry_app.tapis.Tapis;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "commande_tapis")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class CommandeTapis {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "commande_id", nullable = false)
    private Commande commande;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "tapis_id", nullable = false)
    private Tapis tapis;

    @Column(nullable = false)
    private Integer quantite = 1;

    @Column(name = "prix_unitaire", nullable = false, precision = 10, scale = 2)
    private BigDecimal prixUnitaire;

    @Column(name = "sous_total", nullable = false, precision = 10, scale = 2)
    private BigDecimal sousTotal;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private TapisEtat etat = TapisEtat.en_attente;

    // ── Dimension-based pricing fields ──────────────────────────────────────

    @Column(precision = 10, scale = 2)
    private BigDecimal largeur;

    @Column(precision = 10, scale = 2)
    private BigDecimal hauteur;

    @Column(name = "prix_calcule", precision = 10, scale = 2)
    private BigDecimal prixCalcule;

    @Column(name = "prix_final", precision = 10, scale = 2)
    private BigDecimal prixFinal;

    @Enumerated(EnumType.STRING)
    @Column(name = "mode_tarification", length = 20)
    private ModeTarification modeTarification;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    // Explicit Getters/Setters to bypass Lombok failures
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Commande getCommande() { return commande; }
    public void setCommande(Commande commande) { this.commande = commande; }
    public Tapis getTapis() { return tapis; }
    public void setTapis(Tapis tapis) { this.tapis = tapis; }
    public Integer getQuantite() { return quantite; }
    public void setQuantite(Integer quantite) { this.quantite = quantite; }
    public BigDecimal getPrixUnitaire() { return prixUnitaire; }
    public void setPrixUnitaire(BigDecimal prixUnitaire) { this.prixUnitaire = prixUnitaire; }
    public BigDecimal getSousTotal() { return sousTotal; }
    public void setSousTotal(BigDecimal sousTotal) { this.sousTotal = sousTotal; }
    public TapisEtat getEtat() { return etat; }
    public void setEtat(TapisEtat etat) { this.etat = etat; }
    public BigDecimal getLargeur() { return largeur; }
    public void setLargeur(BigDecimal largeur) { this.largeur = largeur; }
    public BigDecimal getHauteur() { return hauteur; }
    public void setHauteur(BigDecimal hauteur) { this.hauteur = hauteur; }
    public BigDecimal getPrixCalcule() { return prixCalcule; }
    public void setPrixCalcule(BigDecimal prixCalcule) { this.prixCalcule = prixCalcule; }
    public BigDecimal getPrixFinal() { return prixFinal; }
    public void setPrixFinal(BigDecimal prixFinal) { this.prixFinal = prixFinal; }
    public ModeTarification getModeTarification() { return modeTarification; }
    public void setModeTarification(ModeTarification modeTarification) { this.modeTarification = modeTarification; }

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
        calculateSousTotal();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
        calculateSousTotal();
    }

    // Calculate subtotal — uses prixFinal if set, otherwise falls back to prixUnitaire
    public void calculateSousTotal() {
        BigDecimal basePrice = (prixFinal != null) ? prixFinal : prixUnitaire;
        if (basePrice != null && quantite != null) {
            this.sousTotal = basePrice.multiply(new BigDecimal(quantite));
        }
    }
}
