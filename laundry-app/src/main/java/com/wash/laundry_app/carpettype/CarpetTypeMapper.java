package com.wash.laundry_app.carpettype;

import org.mapstruct.Mapper;
import org.mapstruct.ReportingPolicy;

@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.IGNORE)
public interface CarpetTypeMapper {
    CarpetTypeDTO toDto(CarpetType carpetType);
    CarpetType toEntity(CarpetTypeRequest request);
}
