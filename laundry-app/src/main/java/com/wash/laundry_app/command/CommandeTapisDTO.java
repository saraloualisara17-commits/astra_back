package com.wash.laundry_app.command;

import com.wash.laundry_app.tapis.TapisDTO;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CommandeTapisDTO {

    private Long id;
    private TapisDTO tapis;
    private Integer quantite;
    private BigDecimal prixUnitaire;
    private BigDecimal sousTotal;
    private TapisEtat etat;
    private BigDecimal largeur;
    private BigDecimal hauteur;
    private BigDecimal prixCalcule;
    private BigDecimal prixFinal;
    private ModeTarification modeTarification;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private java.util.List<com.wash.laundry_app.tapis.TapisImageDTO> tapisImages;
}
