package com.wash.laundry_app.auth;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.AllArgsConstructor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import java.io.IOException;
import java.util.List;

import com.wash.laundry_app.users.UserRepository;
import org.springframework.web.filter.OncePerRequestFilter;

@Component
@AllArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {
    private final JwtService jwtService;
    private final UserRepository userRepository;

//    this method is for filtering the Authorization of a user
    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain) throws ServletException, IOException {
//         getting the header from the request headers
           var authHeader = request.getHeader("Authorization");
//           testing if the header authorization (token) if exists, and it has the key word Bearer
           if(authHeader == null || !authHeader.startsWith("Bearer ")){
               filterChain.doFilter(request,response);
               return;
           }

//         this take off  the key word Bearer from the tocken and replace it with empty string ,and then it test the validation of the tocken by method it has built in jwtService
           var tocken = authHeader.replace("Bearer ","");
           var jwt = jwtService.parseToken(tocken);
           if(jwt == null || jwt.isExpired()){
               filterChain.doFilter(request,response);
               return;
           }

//         check if user is inactive
//         Note: Querying the DB here ensures absolute immediate suspension blocking (which costs a DB hit but prevents zombie JWTs).
           var userOptional = userRepository.findById(jwt.getUserId());
           if (userOptional.isPresent()) {
               var user = userOptional.get();
               Boolean isActive = user.getIsActive();
               if (isActive != null && !isActive) {
                   SecurityContextHolder.clearContext();
                   response.setStatus(HttpServletResponse.SC_FORBIDDEN);
                   response.setContentType("application/json");
                   response.setCharacterEncoding("UTF-8");
                   response.getWriter().write("{\"error\": \"ACCOUNT_DISABLED\", \"message\": \"Votre compte a été désactivé.\"}");
                   return;
               }
               // HIGH-5: cache fetched user in request to avoid a 2nd DB hit in AuthService
               request.setAttribute("_currentUser", user);
           }

//         this is creating and object of the authenticated one  create it from the userEmail we toke it from the tocken that sent in
//          the request and also the credentials (that mens password or jwt also if needed in the request) and the authorities that means the rolls
           
           var authentication  = new UsernamePasswordAuthenticationToken(
                   jwt.getUserId(),
                   null,
                   List.of(new SimpleGrantedAuthority("ROLE_"+jwt.getRole()))
           );
           authentication.setDetails(
                   new WebAuthenticationDetailsSource().buildDetails(request)
           );

//          now we know the user also it authenticated ,and the request continues as that user so it the SecurityContextHolder store the user of the current request
           SecurityContextHolder.getContext().setAuthentication(authentication);

           filterChain.doFilter(request,response);
    }
}
