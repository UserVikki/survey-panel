package com.dashboard.initializer;

import com.dashboard.v1.entity.Role;
import com.dashboard.v1.entity.User;
import com.dashboard.v1.repository.UserRepository;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.List;
import java.util.Optional;

@Configuration
public class AdminInitializer {

    @Bean
    ApplicationRunner initAdmin(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        return args -> {
            Optional<List<User>> adminUsers = userRepository.findByRole(Role.ADMIN);
            if (adminUsers.get().isEmpty()) {
                User admin = User.builder()
                        .email("admin@gmail.com")
                        .username("admin")
                        .password(passwordEncoder.encode("admin123"))
                        .role(Role.ADMIN)
                        .companyName("My Company")
                        .complete("")
                        .terminate("")
                        .quotafull("")
                        .securityTerminate("")
                        .build();
                userRepository.save(admin);
                System.out.println("✅ Admin user created: Username -> admin, Password -> admin123");
            }
        };
    }
}
