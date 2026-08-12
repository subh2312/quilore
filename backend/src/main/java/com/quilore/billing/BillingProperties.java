package com.quilore.billing;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "quilore.billing")
public class BillingProperties {

    /**
     * When false (default), only store-verified receipts can activate PREMIUM.
     * Dev/test may enable mock receipts explicitly via profile or env.
     */
    private boolean allowMockReceipts = false;

    /** Receipt token accepted only when {@link #allowMockReceipts} is true. */
    private String mockReceiptToken = "UAT_MOCK_RECEIPT";

    /** Apple App Store shared secret; required for iOS receipt verification in production. */
    private String appleSharedSecret = "";

    /** Google Play package name; required for Android receipt verification in production. */
    private String googlePlayPackageName = "";

    public boolean isAllowMockReceipts() {
        return allowMockReceipts;
    }

    public void setAllowMockReceipts(boolean allowMockReceipts) {
        this.allowMockReceipts = allowMockReceipts;
    }

    public String getMockReceiptToken() {
        return mockReceiptToken;
    }

    public void setMockReceiptToken(String mockReceiptToken) {
        this.mockReceiptToken = mockReceiptToken;
    }

    public String getAppleSharedSecret() {
        return appleSharedSecret;
    }

    public void setAppleSharedSecret(String appleSharedSecret) {
        this.appleSharedSecret = appleSharedSecret;
    }

    public String getGooglePlayPackageName() {
        return googlePlayPackageName;
    }

    public void setGooglePlayPackageName(String googlePlayPackageName) {
        this.googlePlayPackageName = googlePlayPackageName;
    }
}
