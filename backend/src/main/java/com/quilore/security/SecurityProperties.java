package com.quilore.security;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "quilore.security")
public class SecurityProperties {

    private String dataEncryptionKey = "";
    private String jwtSecret = "";
    private String jwtIssuer = "quilore";
    private String jwtAudience = "quilore-api";
    private boolean allowInsecureDefaults = false;

    public String getDataEncryptionKey() {
        return dataEncryptionKey;
    }

    public void setDataEncryptionKey(String dataEncryptionKey) {
        this.dataEncryptionKey = dataEncryptionKey;
    }

    public String getJwtSecret() {
        return jwtSecret;
    }

    public void setJwtSecret(String jwtSecret) {
        this.jwtSecret = jwtSecret;
    }

    public String getJwtIssuer() {
        return jwtIssuer;
    }

    public void setJwtIssuer(String jwtIssuer) {
        this.jwtIssuer = jwtIssuer;
    }

    public String getJwtAudience() {
        return jwtAudience;
    }

    public void setJwtAudience(String jwtAudience) {
        this.jwtAudience = jwtAudience;
    }

    public boolean isAllowInsecureDefaults() {
        return allowInsecureDefaults;
    }

    public void setAllowInsecureDefaults(boolean allowInsecureDefaults) {
        this.allowInsecureDefaults = allowInsecureDefaults;
    }
}
