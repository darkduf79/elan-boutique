import { useLocalSearchParams, router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

import { formatPrice } from '@/lib/format';
import { api, type ApiInvoice } from '@/services/api';

function escapeHtml(value: string): string {
  return value.replace(
    /[&<>"']/g,
    (char) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
      })[char] ?? char,
  );
}

export default function FactureScreen() {
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const invoiceId = Array.isArray(params.id) ? params.id[0] : params.id;

  const [facture, setFacture] = useState<ApiInvoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchInvoice = useCallback(async () => {
    if (!invoiceId) {
      setError('Facture introuvable.');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await api.getInvoice(invoiceId);
      setFacture(data);
    } catch (err: any) {
      setError(err.message || 'Impossible de récupérer la facture.');
      setFacture(null);
    } finally {
      setLoading(false);
    }
  }, [invoiceId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchInvoice();
  }, [fetchInvoice]);

  const imprimerFacture = async () => {
    if (!facture) return;

    try {
      const itemsHtml = facture.items
        .map(
          (item) => `
            <tr>
              <td>${escapeHtml(item.title)}</td>
              <td style="text-align:center">${item.quantity}</td>
              <td style="text-align:right">${formatPrice(item.price)}</td>
              <td style="text-align:right">${formatPrice(item.price * item.quantity)}</td>
            </tr>`,
        )
        .join('');

      const htmlContent = `
        <html>
          <head>
            <style>
              body { font-family: 'Helvetica', sans-serif; padding: 40px; color: #333; }
              .header { text-align: center; margin-bottom: 40px; }
              .title { font-size: 28px; font-weight: bold; color: #2C5BF5; }
              .invoice-box { border: 1px solid #ddd; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
              .row { display: flex; justify-content: space-between; margin-bottom: 10px; }
              .label { color: #888; font-size: 14px; }
              .value { font-weight: bold; font-size: 16px; }
              table { width: 100%; border-collapse: collapse; margin-top: 10px; }
              th, td { padding: 8px 4px; border-bottom: 1px solid #eee; font-size: 14px; }
              th { text-align: left; color: #888; font-size: 12px; text-transform: uppercase; }
              .total { font-size: 24px; font-weight: bold; color: #1D9E5C; text-align: right; margin-top: 20px; }
            </style>
          </head>
          <body>
            <div class="header">
              <div class="title">FACTURE</div>
              <p>N° ${escapeHtml(facture.facture_id)}</p>
              <p>Date : ${new Date(facture.createdAt).toLocaleDateString('fr-FR')}</p>
            </div>
            <div class="invoice-box">
              <div class="row"><span class="label">Vendeur :</span><span class="value">${escapeHtml(facture.vendeur_nom)}</span></div>
              <div class="row"><span class="label">Client :</span><span class="value">${escapeHtml(facture.client_nom)}</span></div>
              ${
                facture.shippingAddress
                  ? `<div class="row"><span class="label">Livraison :</span><span class="value">${escapeHtml(facture.shippingAddress)}</span></div>`
                  : ''
              }
            </div>
            <div class="invoice-box">
              <table>
                <thead>
                  <tr>
                    <th>Article</th>
                    <th style="text-align:center">Qté</th>
                    <th style="text-align:right">Prix unitaire</th>
                    <th style="text-align:right">Total</th>
                  </tr>
                </thead>
                <tbody>${itemsHtml}</tbody>
              </table>
            </div>
            <div class="total">Total : ${formatPrice(facture.amount)}</div>
          </body>
        </html>
      `;

      const { uri } = await Print.printToFileAsync({ html: htmlContent });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          UTI: '.pdf',
          mimeType: 'application/pdf',
          dialogTitle: 'Imprimer ou Partager la facture',
        });
      } else {
        Alert.alert('PDF généré', `Le fichier est disponible ici :\n${uri}`);
      }
    } catch (err: any) {
      Alert.alert('Erreur', err.message || 'Impossible de générer la facture.');
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2C5BF5" />
        <Text style={styles.centerText}>Chargement de la facture...</Text>
      </View>
    );
  }

  if (error || !facture) {
    return (
      <View style={styles.center}>
        <Ionicons name="document-text-outline" size={56} color="#9CA3AF" />
        <Text style={styles.centerTitle}>Facture introuvable</Text>
        <Text style={styles.centerText}>{error || 'Cette facture n’existe pas ou plus.'}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchInvoice}>
          <Ionicons name="refresh-outline" size={18} color="#fff" style={{ marginRight: 8 }} />
          <Text style={styles.buttonText}>Réessayer</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondaryButton} onPress={() => router.replace('/(tabs)')}>
          <Text style={styles.secondaryButtonText}>Retour à la boutique</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const date = new Date(facture.createdAt).toLocaleDateString('fr-FR');

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 50 }}>
      <View style={styles.header}>
        <Ionicons name="checkmark-circle" size={60} color="#1D9E5C" />
        <Text style={styles.title}>Paiement Validé !</Text>
        <Text style={styles.invoiceNumber}>Facture N° {facture.facture_id}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Vendeur</Text>
        <Text style={styles.name}>{facture.vendeur_nom}</Text>
        {facture.vendeur_slogan ? (
          <Text style={styles.subtext}>{facture.vendeur_slogan}</Text>
        ) : null}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Client</Text>
        <Text style={styles.name}>{facture.client_nom}</Text>
        {facture.shippingAddress ? (
          <Text style={styles.subtext}>{facture.shippingAddress}</Text>
        ) : null}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Détails de la commande</Text>
        {facture.items.map((item, index) => (
          <View
            key={`${item.productId || item.title}-${index}`}
            style={[styles.itemRow, index > 0 && styles.itemRowBorder]}
          >
            <View style={{ flex: 1, marginRight: 10 }}>
              <Text style={styles.productName}>{item.title}</Text>
              <Text style={styles.itemQuantity}>
                {item.quantity} × {formatPrice(item.price)}
              </Text>
            </View>
            <Text style={styles.price}>{formatPrice(item.price * item.quantity)}</Text>
          </View>
        ))}

        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalValue}>{formatPrice(facture.amount)}</Text>
        </View>
      </View>

      <View style={styles.card}>
        <View style={styles.rowBetween}>
          <Text style={styles.cardTitle}>Date</Text>
          <Text style={styles.subtext}>{date}</Text>
        </View>
        <View style={styles.rowBetween}>
          <Text style={styles.cardTitle}>Statut</Text>
          <Text style={{ color: '#1D9E5C', fontWeight: 'bold' }}>Payée</Text>
        </View>
      </View>

      {facture.orderId ? (
        <TouchableOpacity
          style={styles.trackingButton}
          onPress={() =>
            router.push({ pathname: '/suivi', params: { orderId: facture.orderId } })
          }
        >
          <Ionicons name="cube-outline" size={20} color="#2C5BF5" style={{ marginRight: 8 }} />
          <Text style={styles.trackingButtonText}>Suivre ma commande</Text>
        </TouchableOpacity>
      ) : null}

      <TouchableOpacity style={styles.printButton} onPress={imprimerFacture}>
        <Ionicons name="print-outline" size={20} color="white" style={{ marginRight: 8 }} />
        <Text style={styles.buttonText}>Imprimer / Télécharger le PDF</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.button} onPress={() => router.push('/')}>
        <Text style={styles.buttonText}>Retour à l’accueil</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA', padding: 20 },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#F5F7FA',
  },
  centerTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginTop: 12 },
  centerText: { fontSize: 13, color: '#666', textAlign: 'center', marginTop: 8 },
  header: { alignItems: 'center', marginVertical: 20 },
  title: { fontSize: 22, fontWeight: 'bold', color: '#222', marginTop: 10 },
  invoiceNumber: { fontSize: 14, color: '#666', marginTop: 5 },
  card: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 12,
    color: '#888',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 5,
  },
  name: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  subtext: { fontSize: 14, color: '#666' },
  itemRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  itemRowBorder: { borderTopWidth: 1, borderTopColor: '#F0F0F0' },
  productName: { fontSize: 15, fontWeight: '600', color: '#333' },
  itemQuantity: { fontSize: 13, color: '#666', marginTop: 2 },
  price: { fontSize: 15, fontWeight: 'bold', color: '#333' },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    marginTop: 8,
    paddingTop: 12,
  },
  totalLabel: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  totalValue: { fontSize: 18, fontWeight: 'bold', color: '#2C5BF5' },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 5,
  },
  trackingButton: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 6,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  trackingButtonText: { color: '#2C5BF5', fontWeight: 'bold', fontSize: 16 },
  printButton: {
    backgroundColor: '#1D9E5C',
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  button: {
    backgroundColor: '#2C5BF5',
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  retryButton: {
    backgroundColor: '#2C5BF5',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 16,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  secondaryButton: { paddingHorizontal: 24, paddingVertical: 12, marginTop: 4 },
  secondaryButtonText: { color: '#2C5BF5', fontWeight: '600', fontSize: 14 },
  buttonText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
});
