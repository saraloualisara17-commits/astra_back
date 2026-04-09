package com.wash.laundry_app.users;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;
import lombok.Getter;
import lombok.Setter;

@Data

public class UsersChangePassword {
    @NotBlank(message = "password is required ")
    @Size(min = 6 ,max = 15,message = "password must be between 6 and 15 character")
    private String password;

    public String getPassword() {
        return password;
    }

    public void setPassword(String password) {
        this.password = password;
    }
}
