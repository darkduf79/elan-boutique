const { withProjectBuildGradle } = require('@expo/config-plugins');

/**
 * Correctif de build Android pour @stripe/stripe-react-native.
 *
 * `com.stripe:stripe-android-issuing-push-provisioning` déclare une dépendance
 * vers `com.google.android.gms:play-services-tapandpay:18.8.0`, un artefact
 * distribué uniquement via un dépôt Google restreint (accès sur demande).
 * Il est absent de Google Maven (404), ce qui casse la résolution Gradle :
 *
 *   Could not find com.google.android.gms:play-services-tapandpay:18.8.0
 *   Required by: project ':stripe_stripe-react-native'
 *
 * L'application n'utilise pas Tap to Pay (paiement par carte classique via
 * PaymentSheet). On exclut donc cet artefact de toutes les configurations.
 */
const MARKER = 'play-services-tapandpay';
const SNIPPET = `
// @generated par plugins/withStripeTapAndPayFix.js — ne pas modifier à la main.
// Exclut play-services-tapandpay, indisponible sur Google Maven, qui empêche
// la résolution des dépendances du module Stripe (lintVitalAnalyzeRelease).
allprojects {
    configurations.all {
        exclude group: 'com.google.android.gms', module: 'play-services-tapandpay'
    }
}
`;

module.exports = function withStripeTapAndPayFix(config) {
  return withProjectBuildGradle(config, (config) => {
    if (config.modResults.language !== 'groovy') {
      throw new Error(
        'withStripeTapAndPayFix attend un android/build.gradle en Groovy.',
      );
    }

    if (!config.modResults.contents.includes(MARKER)) {
      config.modResults.contents += SNIPPET;
    }

    return config;
  });
};
